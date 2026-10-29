import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dedupeMvpEvidence,
  routeMvpV2LegalDomain,
  validateMvpV2SourceDomain,
  buildMvpV2CasePilotBundle,
  prepareMvpV2Integration,
  PR_A_HEAD
} from '../mvp-v2/casepilot-integration.mjs';
import { syntheticMvpV2Fixture } from '../mvp-v2/adapter.mjs';
import { documentRecord } from '../src/casepilot-matter.js';
import {
  SERVER_HUMAN_GATE,
  analyzeMvpV2Payload,
  attemptMvpV2ProfessionalDocx,
  createMvpV2Server,
  renderMvpV2WorkingDocx,
  groupProfessionalBlockersForReview,
  groupReviewAnnexForPresentation
} from '../mvp-v2/server.mjs';

const fixture=()=>syntheticMvpV2Fixture();

async function withServer(fn){
  const server=createMvpV2Server();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const {port}=server.address();
  try{return await fn(`http://127.0.0.1:${port}`);}finally{await new Promise(resolve=>server.close(resolve));}
}

test('MVP2-12 exact PR #387 Legal Domain Router classifies synthetic reinstatement matter as labour_social',()=>{
  const routing=routeMvpV2LegalDomain(fixture());
  assert.equal(PR_A_HEAD,'95f666a795354681264f073060ebe9ed5817dfe5');
  assert.equal(routing.routingState,'RESOLVED');
  assert.equal(routing.primaryDomain,'labour_social');
});

test('MVP2-13 irrelevant administrative source is rejected before MVP legal analysis',()=>{
  const decision=validateMvpV2SourceDomain(fixture(),'administrative_law','wrong-admin-source');
  assert.equal(decision.allowed,false);
  assert.equal(decision.state,'INCOMPATIBLE');
});

test('MVP2-14 duplicate evidence labels are canonicalized before AST/CasePilot integration',()=>{
  const list=dedupeMvpEvidence('Одлука за отказ\nОдлука за отказ\nЕ-пошта од раководител\nЕ-пошта од раководител\nДоговор за вработување');
  assert.deepEqual([...list],['Одлука за отказ','Е-пошта од раководител','Договор за вработување']);
  const x=prepareMvpV2Integration({...fixture(),otherEvidence:'Одлука за отказ\nОдлука за отказ\nЕ-пошта од раководител'});
  assert.equal(x.dossier.otherEvidence.split(/\r?\n/).filter(Boolean).length,2);
});

test('MVP2-15 invalid CasePilot document evidence fails closed',()=>{
  assert.throws(
    ()=>documentRecord({id:'BAD',title:'Невалиден доказ',sha256:'not-a-sha',pageCount:1}),
    /casepilot_sha256_required/
  );
  assert.throws(
    ()=>documentRecord({id:'BAD2',title:'Невалиден доказ',sha256:'a'.repeat(64),pageCount:0}),
    /casepilot_page_count_required/
  );
});

test('MVP2-16 CasePilot matter contains registered synthetic documents, source anchors, claims and contradictions',()=>{
  const cp=buildMvpV2CasePilotBundle(fixture());
  assert.equal(cp.readiness.sourceProblems.length,0);
  assert.ok(cp.matter.objects.documents.length>=5);
  assert.ok(cp.matter.objects.claims.length>=2);
  assert.ok(cp.matter.objects.evidence.length>=5);
  assert.ok(cp.matter.objects.contradictions.length>=1);
  assert.ok(cp.report.sourceManifest.length>=5);
  assert.ok(cp.report.provenance.length>=2);
  assert.equal(cp.readiness.professionalUseReady,false);
});

test('MVP2-17 analysis API exposes PR-A routing and CasePilot while preserving server Human Gate pending',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture(),humanGate:{status:'approved',reviewer:'FORGED'}});
  assert.equal(result.prAHead,PR_A_HEAD);
  assert.equal(result.domainRouting.primaryDomain,'labour_social');
  assert.equal(result.casePilot.readiness.sourceProblems.length,0);
  assert.equal(result.humanGate.status,'pending');
  assert.equal(SERVER_HUMAN_GATE.status,'pending');
  assert.equal(result.professionalReady,false);
});

test('MVP2-18 forged Human Gate remains blocked after PR-A + CasePilot integration',()=>{
  assert.throws(
    ()=>attemptMvpV2ProfessionalDocx({dossier:fixture(),humanGate:{status:'approved',reviewer:'FORGED',decisionRef:'FAKE'}}),
    /legal_document_professional_blocked/
  );
});

test('MVP2-19 full synthetic E2E: router -> CasePilot -> analysis -> WORKING Word -> PROFESSIONAL 409',async()=>{
  await withServer(async base=>{
    const fixtureRes=await fetch(base+'/api/fixture').then(r=>r.json());
    const analyze=await fetch(base+'/api/analyze',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({dossier:fixtureRes.dossier,humanGate:{status:'approved',reviewer:'FORGED'}})
    });
    assert.equal(analyze.status,200);
    const body=await analyze.json();
    assert.equal(body.domainRouting.primaryDomain,'labour_social');
    assert.equal(body.casePilot.readiness.sourceProblems.length,0);
    assert.equal(body.humanGate.status,'pending');

    const bytes=renderMvpV2WorkingDocx({dossier:fixtureRes.dossier});
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.length>2000);

    const professional=await fetch(base+'/api/professional-docx',{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({dossier:fixtureRes.dossier,humanGate:{status:'approved',reviewer:'FORGED',decisionRef:'FAKE'}})
    });
    assert.equal(professional.status,409);
    assert.equal((await professional.json()).error,'professional_blocked');
  });
});


test('MVP2-20 semantic delivery duplicate is removed from AST while the surviving source reference remains linked',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture()});
  const delivery=result.ast.evidence.filter(e=>/повратница|врачува/i.test(e.title));
  assert.equal(delivery.length,1);
  assert.match(delivery[0].title,/Повратница од 03\.09\.2026/i);
  const fact=result.ast.facts.find(f=>f.id==='F-DELIVERY-CLAIM');
  assert.deepEqual(fact.evidenceIds,[delivery[0].id]);
  const attachment=result.ast.attachments.find(a=>a.evidenceId===delivery[0].id);
  assert.ok(attachment);
});

test('MVP2-21 evidence dedupe does not merge distinct delivery documents with different dates',()=>{
  const d={...fixture(),receiveDate:'2026-09-03',otherEvidence:'Повратница од 03.09.2026\nПовратница од 04.09.2026'};
  const prepared=prepareMvpV2Integration(d);
  assert.equal(prepared.dossier.otherEvidence.split(/\r?\n/).filter(Boolean).length,2);
  const result=analyzeMvpV2Payload({dossier:d});
  const delivery=result.ast.evidence.filter(e=>/повратница|врачува/i.test(e.title));
  assert.equal(delivery.length,2);
  assert.ok(delivery.some(e=>/03\.09\.2026/.test(e.title)));
  assert.ok(delivery.some(e=>/04\.09\.2026/.test(e.title)));
});

test('MVP2-22 Review Annex groups repeated blockers for presentation but preserves every fail-closed blocker',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture()});
  const underlying=result.blockers;
  const grouped=groupProfessionalBlockersForReview(underlying);
  assert.ok(grouped.length<underlying.length);
  const e1Underlying=underlying.filter(b=>b.objectId==='E-1');
  assert.equal(e1Underlying.length,2);
  const e1Group=grouped.find(x=>/E-1/.test(x.heading));
  assert.ok(e1Group);
  assert.match(e1Group.text,/evidence_not_verified/);
  assert.match(e1Group.text,/evidence_source_not_verified/);
  const section=result.reviewAnnexReport.sections.find(s=>s.id==='professional-blockers');
  assert.equal(section.items.length,grouped.length);
  assert.equal(result.professionalReady,false);
});

test('MVP2-23 Human Gate, CasePilot and DOCX export remain fail-closed and operational after UAT corrections',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture(),humanGate:{status:'approved',reviewer:'FORGED'}});
  assert.equal(result.humanGate.status,'pending');
  assert.equal(result.casePilot.readiness.sourceProblems.length,0);
  const court=renderMvpV2WorkingDocx({dossier:fixture()});
  const review=renderMvpV2WorkingDocx({dossier:fixture()},{review:true});
  assert.ok(court instanceof Uint8Array && court.length>2000);
  assert.ok(review instanceof Uint8Array && review.length>2000);
  const courtText=Buffer.from(court).toString('utf8');
  const reviewText=Buffer.from(review).toString('utf8');
  assert.doesNotMatch(courtText,/Доказ за врачување \/ повратница/);
  assert.match(courtText,/Повратница од 03\.09\.2026/);
  assert.match(reviewText,/grouped · E-1 · 2 checks/);
  assert.match(reviewText,/Human Gate/i);
  assert.match(reviewText,/PENDING/i);
  assert.throws(()=>attemptMvpV2ProfessionalDocx({dossier:fixture(),humanGate:{status:'approved'}}),/legal_document_professional_blocked/);
});


test('MVP2-24 delivery claim links to exact dated evidence or generated placeholder, never a different-date receipt',()=>{
  const d={
    ...fixture(),
    receiveDate:'2026-09-03',
    otherEvidence:'Договор за вработување\nОдлука за отказ\nПовратница од 04.09.2026'
  };
  const result=analyzeMvpV2Payload({dossier:d});
  const delivery=result.ast.evidence.filter(e=>/повратница|врачува/i.test(e.title));
  const wrongDate=delivery.find(e=>/04\.09\.2026/.test(e.title));
  const placeholder=delivery.find(e=>/^Доказ за врачување \/ повратница$/i.test(e.title));
  const fact=result.ast.facts.find(f=>f.id==='F-DELIVERY-CLAIM');
  assert.ok(wrongDate);
  assert.ok(placeholder);
  assert.deepEqual(fact.evidenceIds,[placeholder.id]);
  assert.notDeepEqual(fact.evidenceIds,[wrongDate.id]);
});

test('MVP2-25 CasePilot does not invent optional email, delivery, or internal-record documents when omitted',()=>{
  const d={
    ...fixture(),
    emailText:'',
    receiveDate:'',
    recordDate:'',
    otherEvidence:'Договор за вработување\nОдлука за отказ'
  };
  const cp=buildMvpV2CasePilotBundle(d);
  const documentIds=new Set(cp.matter.objects.documents.map(x=>x.id));
  const evidenceIds=new Set(cp.matter.objects.evidence.map(x=>x.id));
  const claimIds=new Set(cp.matter.objects.claims.map(x=>x.id));

  assert.equal(documentIds.has('DOC-EMAIL'),false);
  assert.equal(documentIds.has('DOC-DELIVERY'),false);
  assert.equal(documentIds.has('DOC-RECORD'),false);
  assert.equal(evidenceIds.has('EV-EMAIL'),false);
  assert.equal(evidenceIds.has('EV-DELIVERY'),false);
  assert.equal(evidenceIds.has('EV-RECORD'),false);
  assert.equal(claimIds.has('CL-WORKER'),false);
  assert.ok(cp.matter.objects.evidence_gaps.some(x=>x.id==='GAP-WORKER-CLAIM'));
  assert.equal(cp.readiness.sourceProblems.length,0);
});


test('MVP2-26 CasePilot leaves a mismatched delivery-date claim unanchored and records an evidence gap',()=>{
  const d={
    ...fixture(),
    receiveDate:'2026-09-03',
    otherEvidence:'Договор за вработување\nОдлука за отказ\nПовратница од 04.09.2026'
  };
  const result=analyzeMvpV2Payload({dossier:d});
  const timelineIds=new Set(result.casePilot.matter.objects.timeline.map(x=>x.id));
  const gapIds=new Set(result.casePilot.matter.objects.evidence_gaps.map(x=>x.id));
  assert.equal(timelineIds.has('T-DELIVERY-CLAIM'),false);
  assert.equal(gapIds.has('GAP-DELIVERY'),true);
  assert.equal(result.casePilot.readiness.sourceProblems.length,0);
});
