import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareDisplayWithHeldDiscovery} from '../src/experimental/rc4/a319-r3-integrity-bridge.mjs';

const valid = {ok:true,answer:'Одговор со независно проверен извор', provider:'openai',legalSources:[{id:'verified-1'}],legalSourceVerification:{status:'APPROVED'}};
function corpus(){
 const ids=[...Array.from({length:50},(_,i)=>String(i+1)),'34-а','34-б','34-в'];
 return {schema:'paragraf.a318.corpus.v1',production:'NO_GO',subsequent_amendments:'NOT_EXHAUSTIVELY_VERIFIED',articles:ids.map(id=>{
  const text=`Член ${id}\nСинтетички, непубликуван тестен запис`;
  return {article_id:id,text,text_sha256:createHash('sha256').update(text).digest('hex'),legal_status:'LEGAL_HOLD',authorized_for_ai_citation:false,human_review:'PENDING'};
 })};
}

test('approved independent citation unaffected and A319 remains held',async()=>{
 const r=await prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:structuredClone(valid),question:'член 34-в'});
 assert.equal(r.ok,true);
 assert.deepEqual(r.response.legalSources,valid.legalSources);
 assert.deepEqual(r.response.legalSourceVerification,valid.legalSourceVerification);
 assert.equal(r.response.a319DiscoveryOnly.sources.length,1);
 assert.equal(r.response.a319DiscoveryOnly.sources[0].articleId,'34-в');
 assert.equal(r.legalCitationGranted,false);
 assert.equal('text' in r.response.a319DiscoveryOnly.sources[0],false);
});
test('invalid 101 never resolves to article 10',async()=>{
 const r=await prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:valid,question:'член 101'});
 assert.equal(r.ok,true);assert.equal(r.response.a319DiscoveryOnly.sources.length,0);
});
test('invalid 34-г never resolves to 34',async()=>{
 const r=await prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:valid,question:'член 34-г'});
 assert.equal(r.ok,true);assert.equal(r.response.a319DiscoveryOnly.sources.length,0);
});
test('invalid mixed article references fail closed to zero discovery',async()=>{
 const r=await prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:valid,question:'член 10 и член 101'});
 assert.equal(r.ok,true);assert.equal(r.response.a319DiscoveryOnly.sources.length,0);
});
for(const denied of [
 {ok:true,answer:'draft',status:'LEGAL_HOLD'},
 {ok:true,answer:'draft',provider:'LOCAL_MOCK'},
 {ok:true,answer:'draft',legalGovernance:{authorized:false}},
 {ok:true,answer:'draft',error:'quota_exhausted'},
 {ok:false,answer:'draft'}
]) test('held layer cannot rescue disallowed provider envelope',async()=>{
 await assert.rejects(()=>prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:denied,question:'член 10'}), e=>e.code==='RESPONSE_INTEGRITY_GATE');
});
test('tampered corpus is blocked even when independent response valid',async()=>{
 const c=corpus();c.articles[0].text+='tampered';
 const r=await prepareDisplayWithHeldDiscovery({corpus:c,chatResponse:valid,question:'член 1'});
 assert.equal(r.ok,false);assert.equal(r.displayAllowed,false);assert.equal(r.code,'CORPUS_VALIDATION_FAILED');
});
test('unapproved corpus statuses fail closed',async()=>{
 const c=corpus();c.articles[0].authorized_for_ai_citation=true;
 const r=await prepareDisplayWithHeldDiscovery({corpus:c,chatResponse:valid,question:'член 1'});
 assert.equal(r.ok,false);assert.equal(r.displayAllowed,false);
});
test('caller original response object not mutated',async()=>{
 const input=structuredClone(valid);await prepareDisplayWithHeldDiscovery({corpus:corpus(),chatResponse:input,question:'член 2'});
 assert.deepEqual(input,valid);
});
