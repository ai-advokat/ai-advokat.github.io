import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION,
  classifyProfessionalProviderCapacity,
  isOpenAIProviderCapacityStatus
} from "../scripts/professional-smoke-capacity-gate.mjs";

const capacityResponse={
  ok:false,
  error:"workers_ai_daily_capacity_exhausted",
  answer:"",
  providerCapacity:{
    state:"exhausted",
    provider:"workers_ai",
    capacity:"daily_free_allocation_exhausted",
    retryable:false
  },
  providerFallback:{
    from:"openai",
    to:"workers_ai",
    reason:"openai_response_error",
    primaryProviderCalls:2,
    primaryHttpStatus:429,
    primaryResponseStatus:"rate_limited_during_bounded_specialist",
    fallbackState:"capacity_exhausted"
  },
  runtime:{provider:"workers_ai_free"},
  model:"@cf/qwen/qwen3-30b-a3b-fp8"
};

test("recognizes only the verified fail-closed dual-provider capacity blocker",()=>{
  const result=classifyProfessionalProviderCapacity(503,capacityResponse);
  assert.equal(result.recognized,true);
  assert.equal(result.classification,"PROVIDER_CAPACITY_BLOCKED");
  assert.equal(result.systemIntegrity,"PASS_FAIL_CLOSED");
  assert.equal(result.providerAvailability,"BLOCKED");
  assert.equal(result.primaryCapacityReason,"rate_limited_during_bounded_specialist");
  assert.equal(result.gateVersion,PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION);
});

test("recognizes the observed OpenAI organization spend-limit blocker",()=>{
  const blocked=structuredClone(capacityResponse);
  blocked.providerFallback.primaryResponseStatus="organization_spend_limit_exceeded";
  const result=classifyProfessionalProviderCapacity(503,blocked);
  assert.equal(result.recognized,true);
  assert.equal(result.primaryCapacityReason,"organization_spend_limit_exceeded");
});

test("recognizes bounded OpenAI quota/spend capacity codes only",()=>{
  for(const code of [
    "rate_limit_exceeded",
    "project_spend_limit_exceeded",
    "credit_balance_exhausted",
    "insufficient_quota"
  ]){
    const blocked=structuredClone(capacityResponse);
    blocked.providerFallback.primaryResponseStatus=code;
    assert.equal(classifyProfessionalProviderCapacity(503,blocked).recognized,true,code);
  }
});

test("does not downgrade unknown 503 failures",()=>{
  const result=classifyProfessionalProviderCapacity(503,{ok:false,error:"internal_error"});
  assert.equal(result.recognized,false);
  assert.equal(result.classification,"UNRECOGNIZED_PROFESSIONAL_SMOKE_FAILURE");
});

test("does not accept a fallback unless the primary provider is explicitly a verified 429 capacity blocker",()=>{
  const badStatus=structuredClone(capacityResponse);
  badStatus.providerFallback.primaryHttpStatus=500;
  assert.equal(classifyProfessionalProviderCapacity(503,badStatus).recognized,false);

  const unknown429=structuredClone(capacityResponse);
  unknown429.providerFallback.primaryResponseStatus="mystery_429";
  assert.equal(classifyProfessionalProviderCapacity(503,unknown429).recognized,false);
});

test("does not classify normal HTTP 200 responses as capacity blockers",()=>{
  assert.equal(classifyProfessionalProviderCapacity(200,capacityResponse).recognized,false);
});


test("never classifies a response that released an answer as capacity-blocked fail-closed",()=>{
  const bad=structuredClone(capacityResponse);
  bad.answer="Ова не смее да се смета за fail-closed.";
  assert.equal(classifyProfessionalProviderCapacity(503,bad).recognized,false);
});

test("never classifies OpenAI spend-limit unless Workers AI exhaustion is independently proven",()=>{
  const bad=structuredClone(capacityResponse);
  bad.providerFallback.primaryResponseStatus="organization_spend_limit_exceeded";
  bad.providerCapacity.capacity="unknown";
  assert.equal(classifyProfessionalProviderCapacity(503,bad).recognized,false);
});


test("OpenAI capacity-code helper is bounded and rejects unrelated 429 labels",()=>{
  for(const code of [
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "credit_balance_exhausted",
    "insufficient_quota",
    "rate_limit_exceeded",
    "rate_limited_during_bounded_specialist"
  ]) assert.equal(isOpenAIProviderCapacityStatus(code),true,code);
  for(const code of ["", "authentication_error", "server_error", "mystery_429", "invalid_request_error", "rate_limited_unknown_regression"]){
    assert.equal(isOpenAIProviderCapacityStatus(code),false,code);
  }
});


test("recognizes exact OpenAI spend-limit plus Workers provider-error fail-closed state",()=>{
  const blocked={
    ok:false,
    error:"free_workers_ai_provider_error",
    answer:"",
    providerCapacity:null,
    providerFallback:{
      from:"openai",
      to:"workers_ai",
      reason:"openai_response_error",
      primaryProviderCalls:2,
      primaryHttpStatus:429,
      primaryResponseStatus:"organization_spend_limit_exceeded",
      fallbackState:"failed"
    },
    runtime:{provider:"workers_ai_free",documentConversion:"configured"}
  };
  const result=classifyProfessionalProviderCapacity(503,blocked);
  assert.equal(result.recognized,true);
  assert.equal(result.classification,"PRIMARY_PROVIDER_CAPACITY_BLOCKED_FALLBACK_PROVIDER_ERROR");
  assert.equal(result.systemIntegrity,"PASS_FAIL_CLOSED");
  assert.equal(result.providerAvailability,"BLOCKED");
  assert.equal(result.primaryCapacityReason,"organization_spend_limit_exceeded");
  assert.equal(result.fallbackFailure,"provider_error");
});

test("rejects Workers provider-error state unless primary 429 capacity provenance is exact",()=>{
  const base={
    ok:false,
    error:"free_workers_ai_provider_error",
    answer:"",
    providerFallback:{
      from:"openai",
      to:"workers_ai",
      reason:"openai_response_error",
      primaryProviderCalls:2,
      primaryHttpStatus:429,
      primaryResponseStatus:"organization_spend_limit_exceeded",
      fallbackState:"failed"
    },
    runtime:{provider:"workers_ai_free"}
  };

  const badHttp=structuredClone(base);
  badHttp.providerFallback.primaryHttpStatus=500;
  assert.equal(classifyProfessionalProviderCapacity(503,badHttp).recognized,false);

  const badStatus=structuredClone(base);
  badStatus.providerFallback.primaryResponseStatus="server_error";
  assert.equal(classifyProfessionalProviderCapacity(503,badStatus).recognized,false);

  const badFallback=structuredClone(base);
  badFallback.providerFallback.fallbackState="capacity_exhausted";
  assert.equal(classifyProfessionalProviderCapacity(503,badFallback).recognized,false);

  const released=structuredClone(base);
  released.answer="Не смее да биде класифицирано како fail-closed.";
  assert.equal(classifyProfessionalProviderCapacity(503,released).recognized,false);
});
