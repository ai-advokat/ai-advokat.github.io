import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  LEGAL_DOCUMENT_AST_VERSION,
  LEGAL_DOCUMENT_EXPORT_VERSION,
  normalizeLegalDocumentAst,
  legalDocumentExportBundle
} from '../src/legal-document-export.js';
import {
  PROFESSIONAL_DOCX_ENGINE_VERSION,
  PROFESSIONAL_DOCX_PROFILE,
  renderProfessionalLegalDocxBundle
} from '../src/professional-docx-engine.js';
import {
  MVP_V2_VERSION,
  PR_B_HEAD,
  PR_C_HEAD,
  mapMvpDossierToLegalAst,
  syntheticMvpV2Fixture,
  validateMvpDossier
} from '../mvp-v2/adapter.mjs';
import {
  SERVER_HUMAN_GATE,
  analyzeMvpV2Payload,
  attemptMvpV2ProfessionalDocx,
  createMvpV2Server,
  renderMvpV2WorkingDocx
} from '../mvp-v2/server.mjs';

const fixture=()=>syntheticMvpV2Fixture();

function rawText(bytes){return Buffer.from(bytes).toString('utf8');}

async function withServer(fn){
  const server=createMvpV2Server();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const {port}=server.address();
  try{return await fn(`http://127.0.0.1:${port}`);}finally{await new Promise(resolve=>server.close(resolve));}
}

test('MVP2-01 validates mandatory fields and maps the v1-style dossier into PR-B Legal Document AST',()=>{
  assert.equal(validateMvpDossier(fixture()).ok,true);
  const ast=normalizeLegalDocumentAst(mapMvpDossierToLegalAst(fixture()));
  assert.equal(ast.version,LEGAL_DOCUMENT_AST_VERSION);
  assert.equal(ast.exportVersion,LEGAL_DOCUMENT_EXPORT_VERSION);
  assert.equal(ast.documentType,'employment_claim');
  assert.equal(ast.parties.length,2);
  assert.ok(ast.facts.length>=5);
  assert.ok(ast.evidence.length>=5);
  assert.ok(ast.contradictions.some(x=>x.status==='unresolved'));
  assert.ok(ast.blockers.some(x=>x.kind==='deadline'&&x.status==='open'));
  assert.ok(ast.blockers.some(x=>x.kind==='jurisdiction'&&x.status==='open'));
});

test('MVP2-02 missing mandatory dossier fields fail closed before Legal Document AST creation',()=>{
  const bad={...fixture(),court:'',decisionNo:''};
  const check=validateMvpDossier(bad);
  assert.equal(check.ok,false);
  assert.deepEqual([...check.missing].sort(),['court','decisionNo']);
  assert.throws(()=>mapMvpDossierToLegalAst(bad),/mvp_v2_required_fields_missing/);
});

test('MVP2-03 client-forged Human Gate is ignored and server-side PENDING remains authoritative',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture(),humanGate:{status:'approved',reviewer:'FORGED',decidedAt:'2026-10-24T20:00:00Z',decisionRef:'FAKE'}});
  assert.equal(SERVER_HUMAN_GATE.status,'pending');
  assert.equal(result.humanGate.status,'pending');
  assert.equal(result.professionalReady,false);
  assert.ok(result.blockers.some(x=>x.code==='human_gate_not_approved'));
});

test('MVP2-04 PR-B Court Report and Internal Review Annex remain separate in the integration payload',()=>{
  const result=analyzeMvpV2Payload({dossier:fixture()});
  assert.notEqual(result.courtReport.title,result.reviewAnnexReport.title);
  assert.doesNotMatch(JSON.stringify(result.courtReport),/INTERNAL REVIEW ANNEX/i);
  assert.match(JSON.stringify(result.reviewAnnexReport),/INTERNAL REVIEW ANNEX/i);
  assert.match(JSON.stringify(result.reviewAnnexReport),/PROFESSIONAL blockers/i);
});

test('MVP2-05 PR-C generates a real WORKING Court DOCX with native numbering/profile and zero Review Annex leak',()=>{
  const bytes=renderMvpV2WorkingDocx({dossier:fixture()});
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length>2000);
  const raw=rawText(bytes);
  assert.match(raw,/\[Content_Types\]\.xml/);
  assert.match(raw,/word\/numbering\.xml/);
  assert.match(raw,/word\/styles\.xml/);
  assert.match(raw,/РАБОТЕН НАЦРТ — НЕ Е ЗА ПОДНЕСУВАЊЕ/);
  assert.match(raw,/upperRoman/);
  assert.doesNotMatch(raw,/INTERNAL REVIEW ANNEX/i);
  assert.doesNotMatch(raw,/Decision reference:|Reviewer:|Source manifest|Provenance appendix/i);
});

test('MVP2-06 separate Review Annex DOCX retains internal review and server Human Gate state',()=>{
  const bytes=renderMvpV2WorkingDocx({dossier:fixture()},{review:true});
  const raw=rawText(bytes);
  assert.match(raw,/INTERNAL REVIEW ANNEX — NOT FOR FILING/i);
  assert.match(raw,/PROFESSIONAL blockers/i);
  assert.match(raw,/Human Gate/i);
  assert.match(raw,/PENDING/i);
});

test('MVP2-07 PROFESSIONAL rendering is fail-closed while mandatory blockers and server Human Gate remain unresolved',()=>{
  assert.throws(()=>attemptMvpV2ProfessionalDocx({dossier:fixture(),humanGate:{status:'approved'}}),/legal_document_professional_blocked/);
  const ast=mapMvpDossierToLegalAst(fixture());
  const b=legalDocumentExportBundle(ast,{mode:'working',serverHumanGate:SERVER_HUMAN_GATE});
  assert.equal(b.readiness.professionalReady,false);
  assert.throws(()=>renderProfessionalLegalDocxBundle(ast,{mode:'professional',serverHumanGate:SERVER_HUMAN_GATE}),/legal_document_professional_blocked/);
});

test('MVP2-08 pinned PR-B/PR-C contracts and professional profile are explicit',()=>{
  assert.equal(MVP_V2_VERSION,'2.0.0-test');
  assert.equal(PR_B_HEAD,'f649672172e5b558f5f89084684949cc5590ca0b');
  assert.equal(PR_C_HEAD,'f106b3da14671828d0b8eaa6b2a1308ccf5b0b66');
  assert.equal(PROFESSIONAL_DOCX_ENGINE_VERSION,'1.0.0');
  assert.equal(PROFESSIONAL_DOCX_PROFILE.page,'A4');
  assert.equal(PROFESSIONAL_DOCX_PROFILE.font,'Verdana');
  assert.equal(PROFESSIONAL_DOCX_PROFILE.fontSizeHalfPoints,20);
  assert.equal(PROFESSIONAL_DOCX_PROFILE.courtProfile,'legal-court-v1');
});

test('MVP2-09 HTTP end-to-end: fixture -> analyze -> WORKING DOCX',async()=>{
  await withServer(async base=>{
    const health=await fetch(base+'/api/health').then(r=>r.json());
    assert.equal(health.ok,true); assert.equal(health.serverHumanGate,'pending');
    const dossier=await fetch(base+'/api/fixture').then(r=>r.json());
    const analyze=await fetch(base+'/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dossier:dossier.dossier,humanGate:{status:'approved',reviewer:'FORGED'}})});
    assert.equal(analyze.status,200);
    const result=await analyze.json();
    assert.equal(result.humanGate.status,'pending');
    assert.equal(result.professionalReady,false);
    const docx=await fetch(base+'/api/docx',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dossier:dossier.dossier})});
    assert.equal(docx.status,200);
    assert.match(docx.headers.get('content-type')||'',/wordprocessingml\.document/);
    assert.ok((await docx.arrayBuffer()).byteLength>2000);
  });
});

test('MVP2-10 HTTP PROFESSIONAL endpoint rejects forged client approval with 409',async()=>{
  await withServer(async base=>{
    const res=await fetch(base+'/api/professional-docx',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dossier:fixture(),humanGate:{status:'approved',reviewer:'FORGED',decisionRef:'FAKE'}})});
    assert.equal(res.status,409);
    const body=await res.json();
    assert.equal(body.error,'professional_blocked');
  });
});

test('MVP2-11 integration layer is local-only and contains no provider/production mutation path',()=>{
  const source=['mvp-v2/adapter.mjs','mvp-v2/server.mjs'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
  assert.doesNotMatch(source,/api\.openai\.com|OPENAI_API_KEY|wrangler\s+deploy|d1\s+execute|migration|cloudflare.*token|autonomous.*filing/i);
  assert.doesNotMatch(source,/https:\/\//i);
  assert.match(source,/127\.0\.0\.1/);
});
