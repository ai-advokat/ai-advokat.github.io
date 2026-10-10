import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildAgentPlan} from "../src/agent-orchestrator.js";

const v1=JSON.parse(fs.readFileSync("data/uat/legal-scenarios-v1.json","utf8"));
const suite=JSON.parse(fs.readFileSync("data/uat/legal-scenarios-v2-20.json","utf8"));
const runner=fs.readFileSync("scripts/run-live-legal-uat.mjs","utf8");

test("UAT1 legacy six-scenario suite remains intact",()=>{
  assert.equal(v1.synthetic_data_only,true);
  assert.equal(v1.scenarios.length,6);
});

test("UAT2 production v2 suite is synthetic-only and contains exactly twenty broad legal scenarios",()=>{
  assert.equal(suite.synthetic_data_only,true);
  assert.equal(suite.suite_id,"AI_ADVOKAT_PRODUCTION_LEGAL_UAT_v2_20");
  assert.equal(suite.scenarios.length,20);
  const ids=new Set(suite.scenarios.map(x=>x.id));
  for(const id of [
    "divorce-complaint-draft",
    "inheritance-estate-preparation",
    "theft-current-law-analysis",
    "police-detention-rights",
    "drug-possession-options-risks",
    "traffic-criminal-offence-strategy",
    "domestic-violence-protection-options",
    "labour-dismissal-current-law",
    "unpaid-salary-lawsuit-draft",
    "administrative-silence-options",
    "property-boundary-dispute",
    "contract-debt-complaint-draft",
    "consumer-defective-product-current-law",
    "defamation-civil-risk-options",
    "misdemeanour-appeal-draft",
    "criminal-detention-appeal-draft",
    "free-access-information-current-law",
    "mediation-options",
    "zkp-334-cross-reference",
    "zpp-151-2026-temporal-applicability"
  ]) assert.ok(ids.has(id),id);
});

test("UAT3 every v2 expected mission profile matches the local governed classifier",()=>{
  const mismatches=[];
  for(const scenario of suite.scenarios){
    const plan=buildAgentPlan(scenario.prompt);
    const actual=plan.legalIntelligenceEngine.mission_profile.id;
    if(scenario.expect_mission_profile && actual!==scenario.expect_mission_profile){
      mismatches.push({id:scenario.id,expected:scenario.expect_mission_profile,actual});
    }
    if(scenario.expect_human_review===true && plan.legalIntelligenceEngine.authority_and_human_gate.human_review_required!==true){
      mismatches.push({id:scenario.id,expected:"human_review_required",actual:"not_required"});
    }
    if(scenario.expect_execution_authorization==="NO_EXTERNAL_ACTION"){
      if(plan.legalIntelligenceEngine.implementation.no_autonomous_filing!==true){
        mismatches.push({id:scenario.id,expected:"no_autonomous_filing",actual:false});
      }
      if(!plan.legalIntelligenceEngine.authority_and_human_gate.required_gate_types.includes("author_approval")){
        mismatches.push({id:scenario.id,expected:"author_approval_gate",actual:plan.legalIntelligenceEngine.authority_and_human_gate.required_gate_types});
      }
    }
  }
  assert.deepEqual(mismatches,[]);
});

test("UAT4 consequential drafting scenarios are Human-Gated and never autonomous",()=>{
  const consequential=suite.scenarios.filter(x=>x.expect_mission_profile==="L3_CONSEQUENTIAL");
  assert.ok(consequential.length>=4);
  for(const scenario of consequential){
    assert.equal(scenario.expect_human_review,true,scenario.id);
    assert.equal(scenario.expect_execution_authorization,"NO_EXTERNAL_ACTION",scenario.id);
  }
});

test("UAT5 suite covers current-law, strategy, drafting and informational depth",()=>{
  const profiles=new Set(suite.scenarios.map(x=>x.expect_mission_profile));
  for(const profile of ["L0_INFORMATIONAL","L1_VERIFIED_RESEARCH","L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL"]){
    assert.ok(profiles.has(profile),profile);
  }
});

test("UAT6 live runner is read-only, browser-origin aware and latency bounded",()=>{
  assert.match(runner,/https:\/\/ai-advokat\.github\.io/);
  assert.match(runner,/AbortSignal\.timeout\(70000\)/);
  assert.match(runner,/webSearch:false/);
  assert.match(runner,/guideDocuments:\[\]/);
  assert.match(runner,/attachments:\[\]/);
  assert.doesNotMatch(runner,/wrangler|INSERT INTO|UPDATE\s+/i);
});

test("UAT7 live runner checks model, LIOE, Human Gate, telemetry and cross-references",()=>{
  assert.match(runner,/gpt-6\.1-sol/);
  assert.match(runner,/AI_ADVOKAT_LIOE_v1/);
  assert.match(runner,/humanReviewRequired/);
  assert.match(runner,/executionAuthorization/);
  assert.match(runner,/runtimeTelemetry/);
  assert.match(runner,/legalCrossReferenceCount/);
});

test("UAT8 evidence artifact preserves full synthetic answer and routing metadata",()=>{
  assert.match(runner,/answer:String\(body\?\.answer\|\|""\)/);
  assert.match(runner,/sources_count/);
  assert.match(runner,/specialist_agents/);
  assert.match(runner,/failure_detail/);
});

test("UAT9 live runner aggregates all scenario failures before exiting",()=>{
  assert.match(runner,/pass_count:passCount/);
  assert.match(runner,/fail_count:failCount/);
  assert.match(runner,/process\.exitCode=1/);
  assert.match(runner,/UAT FAIL/);
  assert.match(runner,/for\(const scenario of suite\.scenarios\)/);
});


test("UAT10 semantic topicality uses grouped topic markers for historically false-negative scenarios",()=>{
  const theft=suite.scenarios.find(x=>x.id==="theft-current-law-analysis");
  const drugs=suite.scenarios.find(x=>x.id==="drug-possession-options-risks");
  const violence=suite.scenarios.find(x=>x.id==="domestic-violence-protection-options");
  for(const scenario of [theft,drugs,violence]){
    assert.ok(Array.isArray(scenario.answer_must_match_groups));
    assert.ok(scenario.answer_must_match_groups.length>=3);
    assert.equal("answer_must_match" in scenario,false);
  }
  assert.match(runner,/answer_must_match_groups/);
  assert.match(runner,/expected topical marker group/);
});

test("UAT11 live runner can use an ephemeral membership key without embedding credentials",()=>{
  assert.match(runner,/AI_ADVOCAT_UAT_MEMBERSHIP_KEY/);
  assert.match(runner,/authorization":"Bearer "/);
  assert.match(runner,/synthetic UAT membership not applied/);
  assert.match(runner,/minScenarioSpacingMs=13000/);
  assert.doesNotMatch(runner,/uat_[0-9a-f]{20,}/i);
});
