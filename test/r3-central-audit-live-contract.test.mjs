import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/r3-central-audit-live-uat.yml","utf8");
const runner=fs.readFileSync("scripts/run-r3-central-audit-live.mjs","utf8");
const acceptance=JSON.parse(fs.readFileSync("data/uat/r3-central-audit-acceptance-v1.json","utf8"));
const fixture=JSON.parse(fs.readFileSync("test/fixtures/r3-central-audit-11-29.json","utf8"));

test("R3LIVE1 workflow runs only manually or after successful production runtime sync",()=>{
  assert.match(workflow,/AI Advokat production runtime sync/);
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/workflow_run\.conclusion == 'success'/);
  assert.doesNotMatch(workflow,/pull_request:/);
});

test("R3LIVE2 live runner preserves fresh-session and 19-of-19 release semantics",()=>{
  assert.equal(fixture.tests.length,19);
  assert.equal(acceptance.policy.required_safety_pass,19);
  assert.equal(acceptance.policy.required_functional_pass,19);
  assert.match(runner,/BASE\+"\/api\/bot"/);
  assert.match(runner,/Origin":"https:\/\/ai-advokat\.github\.io"/);
  assert.match(runner,/history:\[\]/);
  assert.match(runner,/sessionId:"R3-LIVE-"/);
  assert.match(runner,/response\.status!==429/);
  assert.match(runner,/retry-after/);
  assert.match(runner,/attempt<=3/);
  assert.match(runner,/R3_19_OF_19_PASS/);
  assert.match(runner,/R3_NO_GO/);
});

test("R3LIVE3 controlled 503 is safe only with bounded trace and never counts functional PASS",()=>{
  assert.equal(acceptance.policy.controlled_provider_failure_is_safe_but_not_functional,true);
  assert.match(runner,/validFailureTrace/);
  assert.match(runner,/CONTROLLED_FAILURE/);
  assert.match(runner,/functional_pass:false/);
  assert.match(runner,/missing_or_invalid_failure_trace/);
});

test("R3LIVE4 known R3 wrong lanes are forbidden",()=>{
  assert.ok(acceptance.policy.forbidden_source_modes.includes("deterministic_temporal_validity_gate_no_model"));
  assert.ok(acceptance.policy.forbidden_source_modes.includes("professional_degraded_structure_only_workers_ai_fallback"));
  assert.ok(acceptance.policy.forbidden_display_modes.includes("canonical_historical_case_law_temporal_gate"));
  assert.ok(acceptance.policy.forbidden_answer_fragments.some(x=>x.includes("РАБОТЕН ПРИМЕР")));
});

test("R3LIVE5 prompt injection test 29 is zero-provider deterministic safety",()=>{
  assert.equal(acceptance.special["29"].required_provider,"canonical_corpus_no_model");
  assert.equal(acceptance.special["29"].required_source_mode,"deterministic_prompt_injection_safety_no_model");
  assert.equal(acceptance.special["29"].max_provider_calls,0);
});
