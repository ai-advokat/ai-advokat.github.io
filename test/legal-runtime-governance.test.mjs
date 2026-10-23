import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGAL_RUNTIME_GOVERNANCE_VERSION,
  LEGAL_RUNTIME_TELEMETRY_SCHEMA,
  legalPostflightRequired,
  assessLegalRuntimeRelease,
  buildSanitisedRuntimeRecord
} from "../src/legal-runtime-governance.js";

const plan=(profile,{current=false,engaged=true,gates=[]}={})=>({
  mode:"proactive_research",
  agents:["macedonian_law","verification_citation"],
  legalIntelligenceEngine:{
    engaged,
    problem_class:"verified_legal_research",
    mission_profile:{id:profile},
    knowledge:{current_law_verification_required:current},
    authority_and_human_gate:{human_review_required:["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile),required_gate_types:gates},
    implementation:{requested:["L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile)}
  }
});
const verifiedBundle=()=>({
  state:"matched",
  version:{isCurrent:true,humanReviewStatus:"approved"},
  context:[{}],
  legalSources:[{status:"current_consolidated",humanReviewStatus:"approved",versionHumanReviewStatus:"approved"}]
});

test("runtime governance version is canonical",()=>{
  assert.equal(LEGAL_RUNTIME_GOVERNANCE_VERSION,"ai-advokat-lioe-runtime-1.0.0");
});

test("current-law postflight is mandatory",()=>{
  assert.equal(legalPostflightRequired(plan("L1_VERIFIED_RESEARCH",{current:true})),true);
  assert.equal(legalPostflightRequired(plan("L0_INFORMATIONAL")),false);
});

test("Human-Gate approved current corpus can release verified current research after postflight",()=>{
  const p=plan("L1_VERIFIED_RESEARCH",{current:true});
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:verifiedBundle(),
    result:{ok:true,sources:[],webSearchUsed:false},
    postflight:{verdict:"PASS",temporal_integrity:"VERIFIED",stress_test:"NOT_REQUIRED",adversarial_review:"NOT_REQUIRED"}
  });
  assert.equal(a.releaseState,"VERIFIED_CURRENT_RESEARCH");
  assert.equal(a.temporalVerificationState,"VERIFIED");
  assert.equal(a.verificationState,"PASSED");
});

test("external current-law research remains provisional even with official web links",()=>{
  const p=plan("L1_VERIFIED_RESEARCH",{current:true});
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:{state:"instrument_not_resolved",legalSources:[],context:[]},
    result:{ok:true,webSearchUsed:true,sources:[{url:"https://slvesnik.com.mk/example"}]},
    postflight:{verdict:"PASS",temporal_integrity:"PARTIAL",stress_test:"NOT_REQUIRED",adversarial_review:"NOT_REQUIRED"}
  });
  assert.equal(a.releaseState,"PROVISIONAL_CURRENT_LAW_EXTERNAL_RESEARCH");
  assert.equal(a.temporalVerificationState,"PARTIAL");
  assert.equal(a.humanReviewRequired,true);
});

test("L3 consequential output is advisory only even when verifier passes",()=>{
  const p=plan("L3_CONSEQUENTIAL",{gates:["author_approval"]});
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:verifiedBundle(),
    result:{ok:true,sources:[],webSearchUsed:false},
    postflight:{verdict:"PASS",temporal_integrity:"NOT_REQUIRED",stress_test:"PASS",adversarial_review:"PASS"}
  });
  assert.equal(a.releaseState,"ADVISORY_DRAFT_HUMAN_GATE_REQUIRED");
  assert.equal(a.executionAuthorization,"NO_EXTERNAL_ACTION");
  assert.deepEqual(a.requiredGateTypes,["author_approval"]);
});

test("one-pass verifier revision remains provisional and Human-Gate controlled",()=>{
  const p=plan("L3_CONSEQUENTIAL",{gates:["author_approval"]});
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:{state:"instrument_not_resolved",legalSources:[],context:[]},
    result:{ok:true,sources:[],webSearchUsed:false},
    postflight:{verdict:"REVISE",stress_test:"PASS",adversarial_review:"PASS",temporal_integrity:"NOT_REQUIRED"}
  });
  assert.equal(a.releaseState,"ADVISORY_DRAFT_HUMAN_GATE_REQUIRED");
  assert.equal(a.executionAuthorization,"NO_EXTERNAL_ACTION");
  assert.equal(a.verificationState,"PROVISIONAL");
  assert.equal(a.humanReviewRequired,true);
});

test("L4 never authorizes legal-truth mutation",()=>{
  const p=plan("L4_LEGAL_TRUTH_GOVERNANCE",{gates:["production_corpus_write"]});
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:verifiedBundle(),
    result:{ok:true,sources:[],webSearchUsed:false},
    postflight:{verdict:"PASS",temporal_integrity:"NOT_REQUIRED",stress_test:"PASS",adversarial_review:"PASS"}
  });
  assert.equal(a.executionAuthorization,"NO_LEGAL_TRUTH_MUTATION");
  assert.equal(a.releaseState,"GOVERNANCE_DRAFT_HUMAN_GATE_REQUIRED");
});

test("sanitised telemetry contains no question answer history or source text",()=>{
  const p=plan("L2_STRATEGY_PROCEDURE");
  const a=assessLegalRuntimeRelease({
    plan:p,
    articleBundle:{state:"matched",version:{isCurrent:false,humanReviewStatus:"reviewed"},context:[{}],legalSources:[{}]},
    result:{ok:true,model:"gpt-test",usage:{inputTokens:100,outputTokens:40,totalTokens:140},sources:[],webSearchUsed:false},
    postflight:{verdict:"PASS",stress_test:"PASS",adversarial_review:"PASS",temporal_integrity:"NOT_REQUIRED"}
  });
  const rec=buildSanitisedRuntimeRecord({
    runId:"LIOE-RT-TEST",startedAt:"2026-10-06T08:00:00Z",finishedAt:"2026-10-06T08:00:01Z",
    elapsedMs:1000,plan:p,assessment:a,result:{ok:true,model:"gpt-test",usage:{inputTokens:100,outputTokens:40,totalTokens:140},sources:[],webSearchUsed:false},
    articleBundle:{context:[{}]},guideContextCount:1,attachmentCount:2,sourceMode:"test",
    postflightMeta:{attempts:1,firstPass:true,verdict:"PASS",primaryProviderCalls:1,providerCalls:1,usage:{inputTokens:50,outputTokens:20,totalTokens:70}}
  });
  assert.equal(rec.total_tokens,210);
  assert.equal(rec.provider_calls,2);
  assert.equal(rec.estimated_credit_units,5);
  assert.equal(rec.telemetry_schema_version,"1.1");
  const keys=Object.keys(rec);
  for(const forbidden of ["question","answer","history","source_text","user_id","membership_key","attachment_text"]){
    assert.equal(keys.includes(forbidden),false);
  }
});


test("failure telemetry keeps bounded provider diagnostics but no legal content",()=>{
  const p=plan("L0_INFORMATIONAL");
  const a=assessLegalRuntimeRelease({plan:p,articleBundle:{state:"instrument_not_resolved",context:[],legalSources:[]},result:{ok:false},postflight:{verdict:"FAIL"}});
  const rec=buildSanitisedRuntimeRecord({
    runId:"LIOE-RT-P0",startedAt:"2026-10-23T21:01:00Z",finishedAt:"2026-10-23T21:01:02Z",elapsedMs:2000,
    plan:p,assessment:a,articleBundle:{context:[]},sourceMode:"provider_failure",
    result:{
      ok:false,error:"openai_incomplete_response",status:503,responseStatus:"incomplete",failureDetail:"max_output_tokens",
      requestId:"req_safe",responseId:"resp_safe",timeoutMs:45000,providerCalls:2,
      usage:{inputTokens:120,outputTokens:80,totalTokens:200},
      providerAttempts:[
        {attempt:1,error:"openai_incomplete_response",httpStatus:null,responseStatus:"incomplete",incompleteReason:"max_output_tokens",requestId:"req_1",responseId:"resp_1",providerCalls:1,inputTokens:60,outputTokens:40,totalTokens:100},
        {attempt:2,error:"openai_response_error",httpStatus:503,responseStatus:null,incompleteReason:null,requestId:"req_2",responseId:null,providerCalls:1,inputTokens:60,outputTokens:40,totalTokens:100}
      ]
    },
    postflightMeta:{attempts:0,providerCalls:0,primaryProviderCalls:2}
  });
  assert.equal(LEGAL_RUNTIME_TELEMETRY_SCHEMA,"1.1");
  assert.equal(rec.error_code,"openai_incomplete_response");
  assert.equal(rec.http_status,503);
  assert.equal(rec.response_status,"incomplete");
  assert.equal(rec.incomplete_reason,"max_output_tokens");
  assert.equal(rec.provider_request_id,"req_safe");
  assert.equal(rec.provider_response_id,"resp_safe");
  assert.equal(rec.provider_timeout_ms,45000);
  assert.equal(JSON.parse(rec.provider_attempts_json).length,2);
  const serialised=JSON.stringify(rec);
  for(const forbidden of ["Работникот","ревизија во граѓанска","Bearer ","sk-"]){
    assert.equal(serialised.includes(forbidden),false);
  }
});
