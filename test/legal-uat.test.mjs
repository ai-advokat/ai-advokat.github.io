import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildAgentPlan} from "../src/agent-orchestrator.js";

const suite=JSON.parse(fs.readFileSync("data/uat/legal-scenarios-v1.json","utf8"));
const runner=fs.readFileSync("scripts/run-live-legal-uat.mjs","utf8");

test("UAT1 legal UAT suite is synthetic-only and contains six practical scenarios",()=>{
  assert.equal(suite.synthetic_data_only,true);
  assert.equal(suite.suite_id,"AI_ADVOKAT_PRODUCTION_LEGAL_UAT_v1");
  assert.equal(suite.scenarios.length,6);
  const ids=suite.scenarios.map(x=>x.id);
  for(const id of [
    "divorce-complaint-draft",
    "administrative-silence-options",
    "zkp-334-cross-reference",
    "labour-law-article-one",
    "police-detention-rights",
    "contract-debt-complaint-draft"
  ]) assert.ok(ids.includes(id),id);
});

test("UAT2 divorce and contract lawsuit drafts route to L3 consequential Human Gate",()=>{
  for(const id of ["divorce-complaint-draft","contract-debt-complaint-draft"]){
    const scenario=suite.scenarios.find(x=>x.id===id);
    const plan=buildAgentPlan(scenario.prompt);
    assert.equal(plan.legalIntelligenceEngine.mission_profile.id,"L3_CONSEQUENTIAL",id);
    assert.equal(plan.legalIntelligenceEngine.authority_and_human_gate.human_review_required,true,id);
    assert.ok(plan.legalIntelligenceEngine.authority_and_human_gate.required_gate_types.includes("author_approval"),id);
    assert.equal(plan.legalIntelligenceEngine.implementation.no_autonomous_filing,true,id);
  }
});

test("UAT3 strategy and informational scenarios preserve expected mission depth",()=>{
  const admin=suite.scenarios.find(x=>x.id==="administrative-silence-options");
  const zkp=suite.scenarios.find(x=>x.id==="zkp-334-cross-reference");
  assert.equal(buildAgentPlan(admin.prompt).legalIntelligenceEngine.mission_profile.id,"L2_STRATEGY_PROCEDURE");
  assert.equal(buildAgentPlan(zkp.prompt).legalIntelligenceEngine.mission_profile.id,"L0_INFORMATIONAL");
});

test("UAT4 live runner is read-only, browser-origin aware and latency bounded",()=>{
  assert.match(runner,/https:\/\/ai-advokat\.github\.io/);
  assert.match(runner,/AbortSignal\.timeout\(70000\)/);
  assert.match(runner,/webSearch:false/);
  assert.match(runner,/guideDocuments:\[\]/);
  assert.match(runner,/attachments:\[\]/);
  assert.doesNotMatch(runner,/wrangler|INSERT INTO|UPDATE\s+/i);
});

test("UAT5 live runner checks model, LIOE, Human Gate, telemetry and cross-references",()=>{
  assert.match(runner,/gpt-6\.1-sol/);
  assert.match(runner,/AI_ADVOKAT_LIOE_v1/);
  assert.match(runner,/humanReviewRequired/);
  assert.match(runner,/executionAuthorization/);
  assert.match(runner,/runtimeTelemetry/);
  assert.match(runner,/legalCrossReferenceCount/);
});


test("UAT6 live runner aggregates all scenario failures before exiting",()=>{
  assert.match(runner,/pass_count:passCount/);
  assert.match(runner,/fail_count:failCount/);
  assert.match(runner,/process\.exitCode=1/);
  assert.match(runner,/UAT FAIL/);
  assert.match(runner,/failure_detail/);
  assert.match(runner,/for\(const scenario of suite\.scenarios\)/);
});
