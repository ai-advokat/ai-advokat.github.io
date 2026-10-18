import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { workersAIRequestOptions, runWorkersAIText, WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT } from "../src/workers-ai-provider.js";

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

test("WAP2 provider contract has bounded timeout and canonical FREE fast path uses 8s",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(provider,/timeoutMs=30000/);
  assert.match(provider,/Promise\.race\(/);
  assert.match(provider,/workers_ai_timeout/);
  assert.match(worker,/timeoutMs:fastFreePrompt\?8000:20000/);
  assert.match(worker,/timeoutMs:12000/);
});

test("WAP3 Qwen contract does not reintroduce undocumented template kwargs",()=>{
  const provider=fs.readFileSync("src/workers-ai-provider.js","utf8");
  const qwenBlock=provider.slice(provider.indexOf("Qwen3 uses the documented"),provider.indexOf("// Legacy GLM"));
  assert.doesNotMatch(qwenBlock,/chat_template_kwargs\s*=/);
});


test("WAP4 empty Qwen final falls back exactly once to non-reasoning Llama",async()=>{
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
  assert.equal(result.primaryModel,"@cf/qwen/qwen3-30b-a3b-fp8");
  assert.equal(result.model,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT);
  assert.deepEqual(result.modelFallback,{
    from:"@cf/qwen/qwen3-30b-a3b-fp8",
    to:WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT,
    reason:"empty_final_text"
  });
  assert.deepEqual(models,["@cf/qwen/qwen3-30b-a3b-fp8",WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT]);
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
  assert.equal(result.primaryModel,"@cf/qwen/qwen3-30b-a3b-fp8");
  assert.equal(result.model,WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT);
  assert.equal(result.modelFallback.reason,"empty_final_text");
  assert.deepEqual(models,["@cf/qwen/qwen3-30b-a3b-fp8",WORKERS_AI_EMPTY_FALLBACK_MODEL_DEFAULT]);
});
