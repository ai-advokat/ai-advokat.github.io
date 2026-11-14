import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {shouldRetryIncompleteOpenAI,isTerminalOpenAIBillingFailure} from "../src/provider-recovery-policy.js";
import {classifyVoiceTranscriptionFailure,runVoiceTranscriptionAI} from "../src/voice-transcription-provider.js";

test("R21 retries only a provider-certified max_output_tokens truncation",()=>{
  assert.equal(shouldRetryIncompleteOpenAI({error:"openai_incomplete_response",failureDetail:"max_output_tokens"}),true);
  for(const reason of ["content_filter","max_messages","steered","unknown",null,undefined]){
    assert.equal(shouldRetryIncompleteOpenAI({error:"openai_incomplete_response",failureDetail:reason}),false);
  }
  assert.equal(shouldRetryIncompleteOpenAI({error:"openai_response_error",failureDetail:"max_output_tokens"}),false);
  assert.equal(isTerminalOpenAIBillingFailure({responseStatus:"project_spend_limit_exceeded"}),true);
  assert.equal(isTerminalOpenAIBillingFailure({responseStatus:"insufficient_quota"}),true);
  assert.equal(isTerminalOpenAIBillingFailure({responseStatus:"rate_limit_exceeded"}),false);
});

test("R21 high-cost recovery skips repeat specialist fanout, preserves bounded answer and Human Gate",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const orch=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(worker,/truncatedAtTokenBudget=shouldRetryIncompleteOpenAI\(result\)/);
  assert.match(worker,/result\.error!=="openai_incomplete_response" \|\| truncatedAtTokenBudget/);
  assert.match(worker,/reasoningEffort:truncatedAtTokenBudget \? "low"/);
  assert.match(worker,/chiefOnlyRecoveryMode:truncatedAtTokenBudget/);
  assert.match(worker,/capacityFallbackMode:retryableResponseStatus/);
  assert.match(worker,/Math\.min\(6000,Math\.max\(maxOutputTokens,incompleteRecoveryBudget/);
  assert.match(orch,/let specialistStage=\(capacityFallbackMode\|\|chiefOnlyRecoveryMode\)/);
  assert.match(orch,/capacityFallbackMode\n\s*\? Math\.min\(2200/);
  assert.match(orch,/max_output_tokens:capacityFallbackMode/);
  assert.match(orch,/if\(payload\?\.status!=="completed"\)/);
});

test("R21 Whisper model errors are categorised without leaking raw error strings",async()=>{
  assert.equal(classifyVoiceTranscriptionFailure(new Error("4006 daily free allocation 10000 neurons reached")),"voice_transcription_capacity_exhausted");
  assert.equal(classifyVoiceTranscriptionFailure(new Error("HTTP 429 Too Many Requests")),"voice_transcription_provider_rate_limited");
  assert.equal(classifyVoiceTranscriptionFailure(new Error("deadline timeout 22000ms")),"voice_transcription_upstream_timeout");
  assert.equal(classifyVoiceTranscriptionFailure(new Error("arbitrary private diagnostic")),"voice_transcription_failed");
  const input={audioBase64:"ZmFrZQ==",language:"en"};
  const failed=await runVoiceTranscriptionAI({AI:{run:async()=>{throw new Error("4006 daily free allocation 10000 neurons reached")}}},input);
  assert.deepEqual(failed,{ok:false,error:"voice_transcription_capacity_exhausted"});
  const ok=await runVoiceTranscriptionAI({AI:{run:async(model,payload)=>{
    assert.equal(model,"@cf/openai/whisper-large-v3-turbo");
    assert.equal(payload.audio,"ZmFrZQ==");
    assert.equal(payload.language,"en");
    return {text:"Hello world"};
  }}},input);
  assert.equal(ok.ok,true);
  assert.equal(ok.text,"Hello world");
});

test("R21 translation failover identifies Workers AI allocation without broadening quotas",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const voice=fs.readFileSync("assets/ai-advokat-voice.mjs","utf8");
  assert.match(worker,/function uiTranslationWorkerErrorCode/);
  assert.match(worker,/result\?\.error==="workers_ai_daily_capacity_exhausted"/);
  assert.match(worker,/throw new Error\(uiTranslationWorkerErrorCode\(result\)\)/);
  assert.match(worker,/failoverReason,/);
  assert.match(worker,/if\(String\(primaryError\?\.message\|\|primaryError\)==="ui_translation_workers_ai_capacity_exhausted"\) throw primaryError/);
  assert.match(worker,/UI_TRANSLATE_PER_LANGUAGE_HOURLY_LIMIT=48/);
  assert.match(worker,/UI_TRANSLATE_GLOBAL_DAILY_LIMIT=800/);
  assert.match(voice,/browserRecognitionUnavailable && recorderFallbackSupported/);
  assert.match(voice,/voice_transcription_capacity_exhausted/);
});
