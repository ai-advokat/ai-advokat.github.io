import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { WORKERS_AI_PROVIDER_CONTRACT_VERSION, workersAIRequestOptions } from "../src/workers-ai-provider.js";

test("WAP1 Qwen uses only documented synchronous chat parameters",()=>{
  const options=workersAIRequestOptions({
    model:"@cf/qwen/qwen3-30b-a3b-fp8",
    messages:[{role:"user",content:"Тест"}],
    maxOutputTokens:800,
    temperature:0.05
  });
  assert.ok(Array.isArray(options.messages));
  assert.equal(options.max_tokens,800);
  assert.equal(options.temperature,0.05);
  assert.equal("chat_template_kwargs" in options,false);
  assert.equal("reasoning_effort" in options,false);
});

test("WAP2 provider contract has bounded timeout and FREE fast path passes 12s",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(provider,/timeoutMs=30000/);
  assert.match(provider,/Promise\.race\(/);
  assert.match(provider,/workers_ai_timeout/);
  assert.match(worker,/timeoutMs:fastFreePrompt\?12000:25000/);
  assert.match(worker,/timeoutMs:12000/);
});

test("WAP3 Qwen contract does not reintroduce undocumented template kwargs",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const qwenBlock=provider.slice(provider.indexOf("Qwen3 uses the documented"),provider.indexOf("// Legacy GLM"));
  assert.doesNotMatch(qwenBlock,/chat_template_kwargs\s*=/);
});


test("WAP4 provider contract version is explicit and capability-bound",()=>{
  assert.equal(WORKERS_AI_PROVIDER_CONTRACT_VERSION,"WORKERS_AI_SYNC_CHAT_V2_DOCUMENTED_PARAMS_BOUNDED_TIMEOUT");
  const worker=fs.readFileSync("src/index.js","utf8");
  const workflow=fs.readFileSync(".github/workflows/free-runtime-live-uat.yml","utf8");
  assert.match(worker,/freeProviderContract:WORKERS_AI_PROVIDER_CONTRACT_VERSION/);
  assert.match(workflow,/caps\.freeProviderContract===EXPECTED_FREE_PROVIDER_CONTRACT/);
});
