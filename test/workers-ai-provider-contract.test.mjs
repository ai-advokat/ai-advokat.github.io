import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { WORKERS_AI_PROVIDER_CONTRACT_VERSION, WORKERS_AI_TEXT_MODEL_DEFAULT, workersAIRequestOptions, runWorkersAIText, WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT, classifyWorkersAIProviderFailure, workersAITimeoutFallbackMs } from "../src/workers-ai-provider.js";

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

test("WAP2 provider contract keeps the FREE primary fast path bounded and invokes the 12s editor only after deterministic language failure",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(provider,/timeoutMs=30000/);
  assert.match(provider,/Promise\.race\(/);
  assert.match(provider,/workers_ai_timeout/);
  assert.match(worker,/timeoutMs:fastFreePrompt\?12000:20000/);
  assert.match(worker,/allowProviderRepair:languageRequired/);
  assert.match(worker,/forceEditorialPass:false/);
  assert.match(worker,/const editorRequired=forceEditorialPass \|\| releaseVerdict\.verdict!=="RELEASE"/);
  assert.match(worker,/mandatory_language_editor_failed/);
  assert.match(worker,/allowEmptyFallback:false/);
  assert.match(worker,/model:editorModel/);
  assert.match(worker,/timeoutMs:12000/);
  assert.match(worker,/hardBlock:true/);
});

test("WAP3 Qwen contract does not reintroduce undocumented template kwargs",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const qwenBlock=provider.slice(provider.indexOf("Qwen3 uses the documented"),provider.indexOf("// Legacy GLM"));
  assert.doesNotMatch(qwenBlock,/chat_template_kwargs\s*=/);
});


test("WAP4 empty primary final falls back exactly once to bounded secondary model",async()=>{
  const models=[];
  const env={AI:{run:async(model)=>{
    models.push(model);
    return models.length===1 ? {response:""} : {response:"Готов одговор."};
  }}};
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"Тест"}],
    maxOutputTokens:400,
    timeoutMs:3000
  });
  assert.equal(result.ok,true);
  assert.equal(result.text,"Готов одговор.");
  assert.equal(result.providerCalls,2);
  assert.equal(result.primaryModel,WORKERS_AI_TEXT_MODEL_DEFAULT);
  assert.equal(result.model,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT);
  assert.deepEqual(result.modelFallback,{
    from:WORKERS_AI_TEXT_MODEL_DEFAULT,
    to:WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT,
    reason:"empty_final_text"
  });
  assert.deepEqual(models,[WORKERS_AI_TEXT_MODEL_DEFAULT,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT]);
});

test("WAP4a bounded fallback defaults to GLM with thinking disabled",()=>{
  assert.equal(WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT,"@cf/zai-org/glm-4.7-flash");
  const options=workersAIRequestOptions({
    model:WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT,
    messages:[{role:"user",content:"Тест"}],
    maxOutputTokens:400,
    temperature:0
  });
  assert.deepEqual(options.chat_template_kwargs,{enable_thinking:false});
  assert.equal(options.max_completion_tokens,400);
  assert.equal("max_tokens" in options,false);
});

test("WAP5 empty primary and empty non-reasoning fallback fail closed after two calls",async()=>{
  const models=[];
  const env={AI:{run:async(model)=>{models.push(model); return {response:""};}}};
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"Тест"}],
    maxOutputTokens:400,
    timeoutMs:3000
  });
  assert.equal(result.ok,false);
  assert.equal(result.error,"workers_ai_empty_response");
  assert.equal(result.providerCalls,2);
  assert.equal(result.primaryModel,WORKERS_AI_TEXT_MODEL_DEFAULT);
  assert.equal(result.model,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT);
  assert.equal(result.modelFallback.reason,"empty_final_text");
  assert.deepEqual(models,[WORKERS_AI_TEXT_MODEL_DEFAULT,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT]);
});


test("WAP6 provider contract version is explicit and capability-bound",()=>{
  assert.equal(WORKERS_AI_PROVIDER_CONTRACT_VERSION,"WORKERS_AI_SYNC_CHAT_V3_GPT_OSS_120B_PRIMARY");
  const worker=fs.readFileSync("src/index.js","utf8");
  const workflow=fs.readFileSync(".github/workflows/free-runtime-live-uat.yml","utf8");
  assert.match(worker,/freeProviderContract:WORKERS_AI_PROVIDER_CONTRACT_VERSION/);
  assert.match(workflow,/caps\.freeProviderContract===EXPECTED_FREE_PROVIDER_CONTRACT/);
});


test("WAP7 language editor can explicitly disable the empty-response provider fallback",async()=>{
  const models=[];
  const env={AI:{run:async(model)=>{models.push(model); return {response:""};}}};
  const result=await runWorkersAIText(env,{
    model:"@cf/zai-org/glm-4.7-flash",
    messages:[{role:"user",content:"Редактирај."}],
    maxOutputTokens:400,
    timeoutMs:3000,
    allowEmptyFallback:false
  });
  assert.equal(result.ok,false);
  assert.equal(result.error,"workers_ai_empty_response");
  assert.equal(result.providerCalls,1);
  assert.deepEqual(models,["@cf/zai-org/glm-4.7-flash"]);
  assert.equal(result.modelFallback,null);
});


test("WAP8 Cloudflare daily neuron exhaustion is a distinct non-retryable capacity state",()=>{
  const out=classifyWorkersAIProviderFailure(new Error("4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage."));
  assert.equal(out.error,"workers_ai_daily_capacity_exhausted");
  assert.equal(out.retryable,false);
  assert.equal(out.capacity,"daily_free_allocation_exhausted");
});

test("WAP9 primary timeout retries exactly once on bounded non-reasoning Workers AI fallback",async()=>{
  const models=[];
  const env={AI:{run:async(model)=>{
    models.push(model);
    if(models.length===1) throw new Error("workers_ai_timeout_8000");
    return {response:"Резервниот Workers AI одговор е подготвен."};
  }}};
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"Одговори кратко на македонски."}],
    maxOutputTokens:400,
    timeoutMs:8000
  });
  assert.equal(result.ok,true);
  assert.equal(result.providerCalls,2);
  assert.equal(result.primaryModel,WORKERS_AI_TEXT_MODEL_DEFAULT);
  assert.equal(result.model,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT);
  assert.equal(result.modelFallback?.reason,"primary_timeout");
  assert.deepEqual(models,[WORKERS_AI_TEXT_MODEL_DEFAULT,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT]);
});

test("WAP10 non-retryable daily capacity exhaustion never triggers the timeout fallback",async()=>{
  const models=[];
  const env={AI:{run:async(model)=>{
    models.push(model);
    throw new Error("4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.");
  }}};
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"Тест"}],
    maxOutputTokens:400,
    timeoutMs:8000
  });
  assert.equal(result.ok,false);
  assert.equal(result.error,"workers_ai_daily_capacity_exhausted");
  assert.equal(result.providerCalls,1);
  assert.equal(result.modelFallback,null);
  assert.deepEqual(models,[WORKERS_AI_TEXT_MODEL_DEFAULT]);
});

test("WAP11 R3 evidence widens only the single timeout fallback window",()=>{
  assert.equal(workersAITimeoutFallbackMs(12000),18000);
  assert.equal(workersAITimeoutFallbackMs(20000),22000);
  assert.equal(workersAITimeoutFallbackMs(30000),22000);
  assert.equal(workersAITimeoutFallbackMs(45000),22000);
  const evidence=JSON.parse(fs.readFileSync(".github/diagnostics/r3-worker-runtime-artifact-13864206636.json","utf8"));
  assert.equal(evidence.observed_failure.failure_detail,"workers_ai_timeout_12000");
  assert.equal(evidence.observed_failure.model_fallback.reason,"primary_timeout");
});

