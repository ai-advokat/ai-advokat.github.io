import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGAL_RUNTIME_GOVERNANCE_VERSION,
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
    postflightMeta:{attempts:1,firstPass:true,providerCalls:1,usage:{inputTokens:50,outputTokens:20,totalTokens:70}}
  });
  assert.equal(rec.total_tokens,210);
  assert.equal(rec.provider_calls,2);
  const keys=Object.keys(rec);
  for(const forbidden of ["question","answer","history","source_text","user_id","membership_key","attachment_text"]){
    assert.equal(keys.includes(forbidden),false);
  }
});
