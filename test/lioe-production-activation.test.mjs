import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/lioe-runtime-production-activation.yml","utf8");
const activation=JSON.parse(fs.readFileSync(".github/activation/lioe-runtime-production-request.json","utf8"));
const migration=fs.readFileSync("migrations/0028_lioe_runtime_telemetry.sql","utf8");
const wrangler=JSON.parse(fs.readFileSync("wrangler.jsonc","utf8"));

test("LIOE production activation request is explicit and provider-isolated",()=>{
  assert.equal(activation.activation_authorized,true);
  assert.equal(activation.decision_id,"AI_ADVOKAT_LIOE_FULL_RUNTIME_2026-10-06");
  assert.equal(activation.runtime_version,"ai-advokat-lioe-runtime-1.0.0");
  assert.equal(activation.migration,"0028_lioe_runtime_telemetry.sql");
  assert.equal(activation.provider_activation_authorized,false);
  for(const gate of ["github_merge","production_schema_migration","production_runtime_deploy","public_release"]){
    assert.ok(activation.authorized_gates.includes(gate));
  }
});

test("production workflow is exact-target, migration-first and fail-closed",()=>{
  assert.match(workflow,/environment: production/);
  assert.match(workflow,/ACTIVATE_LIOE_RUNTIME_1/);
  assert.match(workflow,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(workflow,/Unexpected pending migrations/);
  const apply=workflow.indexOf("Apply LIOE telemetry migration when pending");
  const deploy=workflow.indexOf("Deploy LIOE-enabled production Worker");
  assert.ok(apply>0 && deploy>apply,"migration must precede Worker deploy");
  assert.match(workflow,/lioeRuntimeTelemetry.*ready/);
  assert.match(workflow,/SKIPPED_PROVIDER_LOCKED/);
  assert.match(workflow,/LIVE LIOE LEGAL CHAT \+ POSTFLIGHT \+ TELEMETRY: PASS/);
});

test("migration 0028 is metadata-only and excludes sensitive content columns",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS lioe_runtime_runs/);
  assert.match(migration,/VALUES \('28'/);
  for(const allowed of ["mission_profile","verification_state","release_state","provider_calls","total_tokens","elapsed_ms"]){
    assert.match(migration,new RegExp("\\b"+allowed+"\\b"));
  }
  for(const forbidden of ["question TEXT","answer TEXT","history TEXT","user_id TEXT","membership_key TEXT","attachment_text","source_text"]){
    assert.doesNotMatch(migration,new RegExp(forbidden,"i"));
  }
});

test("LIOE runtime flags are armed while provider activation stays separate",()=>{
  assert.equal(wrangler.vars.LIOE_RUNTIME_GOVERNANCE_ENABLED,"true");
  assert.equal(wrangler.vars.LIOE_POSTFLIGHT_ENABLED,"true");
  assert.equal(wrangler.vars.LIOE_RUNTIME_TELEMETRY_ENABLED,"true");
  assert.equal(wrangler.vars.LIOE_SPECIALIST_EXECUTION_ENABLED,"true");
  assert.equal(wrangler.vars.OPENAI_PROVIDER_ACTIVATION_STATE,"armed_secret_and_billing_required");
  assert.ok(!("OPENAI_API_KEY" in wrangler.vars));
});


test("production activation verifies bounded specialist execution readiness",()=>{
  assert.match(workflow,/LIOE_SPECIALIST_EXECUTION_ENABLED/);
  assert.match(workflow,/lioeSpecialistExecution.*enabled/);
  assert.match(workflow,/specialistExecution.*executed/);
});
