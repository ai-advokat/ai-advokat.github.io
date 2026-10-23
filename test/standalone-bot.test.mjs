import fs from 'node:fs';
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


test('first-time users can trigger access from the send action',()=>{
  const source=fs.readFileSync('assets/standalone-bot.js','utf8');
  assert.ok(source.includes("$('send').disabled = value;"));
  assert.ok(!source.includes("$('send').disabled = value || !key;"));
  assert.ok(source.includes("Најпрво внесете го вашиот приватен код за влез."));
});


test('professional bot keeps high-depth paid drafting and one transient recovery',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  assert.match(source,/missionProfile==="L3_CONSEQUENTIAL" \? 4800/);
  assert.match(source,/\["L4_LEGAL_TRUTH_GOVERNANCE","L3_CONSEQUENTIAL"\]\.includes\(missionProfile\)[\s\S]*\? "high"/);
  assert.match(source,/let providerRecovery=null;/);
  assert.match(source,/transientPrimaryErrors/);
  assert.match(source,/retryUsesWeb=explicitWebRequested \? webRequested : false/);
  assert.match(source,/finaliseFormalLegalDraft\(finalAnswer/);
});


test('P0 professional recovery keeps two bounded attempts and no uncontrolled Workers AI fallback',()=>{
  const source=fs.readFileSync('src/index.js','utf8');
  const orchestrator=fs.readFileSync('src/agent-orchestrator.js','utf8');
  const governance=fs.readFileSync('src/legal-runtime-governance.js','utf8');
  const migration=fs.readFileSync('migrations/0050_lioe_provider_diagnostics.sql','utf8');
  assert.match(source,/providerAttempts=\[/);
  assert.match(source,/sanitiseProviderAttempt\(first,1\)/);
  assert.match(source,/sanitiseProviderAttempt\(retry,2\)/);
  assert.match(source,/OPENAI_RETRY_BACKOFF_MS\|\|250/);
  assert.match(source,/!membership\s*&&\s*governedOpenAIWorkersFallbackConfigured/);
  assert.match(orchestrator,/OPENAI_PROVIDER_TIMEOUT_MS\|\|45000/);
  assert.match(orchestrator,/signal:AbortSignal\.timeout\(providerTimeoutMs\)/);
  assert.match(governance,/provider_attempts_json/);
  assert.match(migration,/ADD COLUMN error_code TEXT/);
  assert.match(migration,/ADD COLUMN provider_attempts_json TEXT/);
});
