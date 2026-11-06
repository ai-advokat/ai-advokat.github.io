import test from "node:test";
import assert from "node:assert/strict";
import {
  PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION,
  classifyProfessionalProviderCapacity
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
  assert.equal(result.gateVersion,PROFESSIONAL_SMOKE_CAPACITY_GATE_VERSION);
});

test("does not downgrade unknown 503 failures",()=>{
  const result=classifyProfessionalProviderCapacity(503,{ok:false,error:"internal_error"});
  assert.equal(result.recognized,false);
  assert.equal(result.classification,"UNRECOGNIZED_PROFESSIONAL_SMOKE_FAILURE");
});

test("does not accept a fallback unless the primary provider is explicitly rate-limited",()=>{
  const bad=structuredClone(capacityResponse);
  bad.providerFallback.primaryHttpStatus=500;
  assert.equal(classifyProfessionalProviderCapacity(503,bad).recognized,false);
});

test("does not classify normal HTTP 200 responses as capacity blockers",()=>{
  assert.equal(classifyProfessionalProviderCapacity(200,capacityResponse).recognized,false);
});
