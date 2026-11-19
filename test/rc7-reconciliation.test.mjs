import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as canonical from '../src/a319-held-corpus-discovery.js';
import * as legacy from '../src/experimental/rc4/a319-held-corpus-discovery.mjs';
import {prepareDisplayWithHeldDiscovery} from '../src/experimental/rc4/a319-r3-integrity-bridge.mjs';

const ids = [...Array.from({length:50},(_,i)=>String(i+1)),'34-а','34-б','34-в'];
function heldCorpus(){return {schema:'paragraf.a318.corpus.v1',production:'NO_GO',subsequent_amendments:'NOT_EXHAUSTIVELY_VERIFIED',articles:ids.map(id=>{
 const text=`Член ${id}\nСИНТЕТИЧКИ ПОДАТОЦИ ЗА ТЕСТ`;
 return {article_id:id,text,text_sha256:createHash('sha256').update(text).digest('hex'),legal_status:'LEGAL_HOLD',authorized_for_ai_citation:false,human_review:'PENDING'};
})};}
const response={ok:true,provider:'canonical_corpus_no_model',answer:'Одговор само од независен извор',modelInvoked:false,legalSources:[{id:'independent-v1',verifiedLegalCitation:true,verificationState:'APPROVED'}],legalSourceVerification:{status:'APPROVED',authoritativeCitationAllowed:true}};
test('RC7 has one canonical A319 implementation; legacy path is exact function alias',()=>{
 for(const n of ['validateA319Corpus','retrieveA319','a319AttachCorpusToChat']) assert.strictEqual(legacy[n],canonical[n],n);
 assert.equal(legacy.A319_DISCOVERY_GATE_VERSION,canonical.A319_DISCOVERY_GATE_VERSION);
 const source=readFileSync(new URL('../src/experimental/rc4/a319-held-corpus-discovery.mjs',import.meta.url),'utf8');
 assert.match(source,/export\s*\{/); assert.doesNotMatch(source,/function\s+(?:validateA319Corpus|retrieveA319|requestedA319Ids)/);
});
test('RC7 preserves verified independent provenance, never promotes 53 held entries',async()=>{
 const original=structuredClone(response);
 const result=await prepareDisplayWithHeldDiscovery({corpus:heldCorpus(),question:'член 34-в',chatResponse:response});
 assert.equal(result.ok,true);assert.equal(result.legalCitationGranted,false);assert.equal(result.humanGateRequired,true);
 assert.deepEqual(result.response.legalSources,original.legalSources);
 assert.deepEqual(result.response.legalSourceVerification,original.legalSourceVerification);
 assert.deepEqual(response,original);
 assert.deepEqual(result.response.a319DiscoveryOnly.sources.map(s=>s.articleId),['34-в']);
 assert.equal(result.response.a319DiscoveryOnly.sources[0].authorizedForAiCitation,false);
 assert.equal('text' in result.response.a319DiscoveryOnly.sources[0],false);
});
test('RC7 mixed invalid articles fail closed for both old and new import paths',()=>{
 for(const q of ['член 101','член 34-г','член 34-аб','член 10 и член 101']){
  assert.deepEqual(canonical.retrieveA319(heldCorpus(),q),[],q);
  assert.deepEqual(legacy.retrieveA319(heldCorpus(),q),[],q);
 }
});
test('RC7 rejects tampered statutory bytes and fabricated approval',async()=>{
 const c=heldCorpus();c.articles[0].text='Заменет текст';
 const r=await prepareDisplayWithHeldDiscovery({corpus:c,question:'член 1',chatResponse:response});
 assert.equal(r.ok,false);assert.equal(r.displayAllowed,false);
 const c2=heldCorpus();c2.articles[0].human_review='APPROVED';
 assert.equal((await canonical.validateA319Corpus(c2)).ok,false);
});
test('RC7 rejects synthetic or quota-blocked legal response before attaching metadata',async()=>{
 for(const bad of [{ok:true,answer:'draft',provider:'LOCAL_MOCK'},{ok:true,answer:'draft',error:'quota'},{ok:true,answer:'draft',legalGovernance:{status:'LEGAL_HOLD'}}]){
  await assert.rejects(()=>prepareDisplayWithHeldDiscovery({corpus:heldCorpus(),question:'член 1',chatResponse:bad}),{code:'RESPONSE_INTEGRITY_GATE'});
 }
});
