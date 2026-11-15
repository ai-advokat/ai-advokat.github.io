import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  VOICE_TRANSCRIPTION_MODEL,
  classifyVoiceTranscriptionFailure,
  runVoiceTranscriptionAI
} from "../src/voice-transcription-provider.js";
import {
  classifyWorkersAIProviderFailure,
  WORKERS_AI_TEXT_MODEL_DEFAULT
} from "../src/workers-ai-provider.js";

test("Cloudflare 3036 means daily Neuron quota, 3040 means temporary model capacity",()=>{
  const quota=new Error("3036: You have used up your daily free allocation of 10,000 neurons");
  const busy=new Error("3040: Capacity temporarily exceeded, please try again.");
  assert.equal(classifyVoiceTranscriptionFailure(quota),"voice_transcription_capacity_exhausted");
  assert.equal(classifyVoiceTranscriptionFailure(busy),"voice_transcription_model_busy");
  assert.equal(classifyVoiceTranscriptionFailure(new Error("429 Too Many Requests")),"voice_transcription_provider_rate_limited");
  assert.equal(classifyVoiceTranscriptionFailure(new Error("upstream timeout")),"voice_transcription_upstream_timeout");
  const textQuota=classifyWorkersAIProviderFailure(quota);
  const textBusy=classifyWorkersAIProviderFailure(busy);
  assert.equal(textQuota.capacity,"daily_free_allocation_exhausted");
  assert.equal(textQuota.retryable,false);
  assert.equal(textBusy.capacity,"model_temporarily_unavailable");
  assert.equal(textBusy.retryable,true);
  assert.equal(textBusy.error,"workers_ai_provider_error");
  assert.doesNotMatch(textBusy.detail,/Bearer|api[_ -]?key/i);
});

test("Whisper caller performs only one attempt on temporary capacity and no paid retry",async()=>{
  let calls=0;
  const env={
    OPENAI_API_KEY:"must-not-be-used",
    OPENAI_MODEL:"gpt-6.1-sol",
    AI:{async run(model,inputs){
      calls++;
      assert.equal(model,VOICE_TRANSCRIPTION_MODEL);
      assert.equal(inputs.task,"transcribe");
      throw new Error("3040 Capacity temporarily exceeded");
    }}
  };
  const res=await runVoiceTranscriptionAI(env,{audioBase64:"UklGRg==",language:"mk"});
  assert.deepEqual(res,{ok:false,error:"voice_transcription_model_busy"});
  assert.equal(calls,1);
});

test("voice user sees model busy differently from exhausted daily quota",()=>{
  const ui=readFileSync("assets/ai-advokat-voice.mjs","utf8");
  const worker=readFileSync("src/index.js","utf8");
  assert.match(ui,/voice_transcription_model_busy/);
  assert.match(ui,/Квотата не мора да е исцрпена/);
  assert.match(ui,/voice_transcription_capacity_exhausted/);
  assert.match(worker,/result.error\|\|"voice_transcription_failed"/);
  assert.equal(WORKERS_AI_TEXT_MODEL_DEFAULT,"@cf/openai/gpt-oss-120b");
});
