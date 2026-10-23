import test from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker } from './load-worker.mjs';

const {worker} = await loadWorker();
const base = 'https://ai-advokat-github-io.aiadvokat16.workers.dev';
const post = (key='') => new Request(base+'/api/bot',{method:'POST',headers:{'content-type':'application/json',...(key?{authorization:'Bearer '+key}:{})},body:JSON.stringify({q:'Здраво'})});
const db = row => ({prepare(){return {bind(){return {first:async()=>row}}}}});

test('standalone bot rejects anonymous requests even when FREE AI is configured', async()=>{
  let calls=0;
  const response=await worker.fetch(post(),{FREE_CHAT_PROVIDER:'workers_ai',AI:{run(){calls++;throw Error('Must not run')}}},{});
  assert.equal(response.status,401);
  assert.equal((await response.json()).error,'bot_membership_required');
  assert.equal(calls,0);
});
test('revoked membership cannot silently become a FREE conversation',async()=>{
  const response=await worker.fetch(post('revoked-fixture-key'),{DB:db(null)},{});
  assert.equal(response.status,401);
});
test('active membership without OpenAI fails closed',async()=>{
  const response=await worker.fetch(post('active-fixture-key'),{DB:db({account_id:'test',plan_code:'pro',monthly_quota:10})},{});
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'gpt_provider_locked');
});
test('standalone bot retains confidential-case rejection before provider execution',async()=>{
  const request=new Request(base+'/api/bot',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer active-fixture-key'},body:JSON.stringify({q:'ЕМБГ: 0101000450001'})});
  const response=await worker.fetch(request,{DB:db({account_id:'test',plan_code:'pro',monthly_quota:10}),OPENAI_API_KEY:'x'.repeat(40),OPENAI_MODEL:'gpt-6.1-sol',OPENAI_ORCHESTRATOR_ENABLED:'true'},{});
  assert.equal(response.status,422);
  const result=await response.json();
  assert.equal(result.error,'confidential_case_workspace_required');
  assert.equal(result.privacy.providerCalled,false);
});
