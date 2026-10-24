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
  renderMvpV2WorkingDocx
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
