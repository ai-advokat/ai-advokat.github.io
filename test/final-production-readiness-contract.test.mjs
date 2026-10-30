import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const path=".github/workflows/final-production-readiness.yml";
const source=fs.readFileSync(path,"utf8");

test("final production readiness workflow is manual-only and read-only by contract",()=>{
  assert.match(source,/workflow_dispatch:/);
  assert.doesNotMatch(source,/push:/);
  assert.match(source,/CHECK_AI_ADVOKAT_PRODUCTION_READINESS/);
  assert.doesNotMatch(source,/wrangler\s+deploy/i);
  assert.doesNotMatch(source,/wrangler\s+secret\s+put/i);
  assert.doesNotMatch(source,/wrangler\s+d1\s+migrations\s+apply/i);
  assert.doesNotMatch(source,/\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(source,/\bDELETE\s+FROM\b/i);
});

test("final production readiness pins the exact governed production target",()=>{
  assert.match(source,/ai-advokat-github-io/);
  assert.match(source,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(source,/gpt-6\.1-sol/);
  assert.match(source,/OPENAI_ORCHESTRATOR_ENABLED/);
  assert.match(source,/LIOE_RUNTIME_GOVERNANCE_ENABLED/);
  assert.match(source,/LIOE_POSTFLIGHT_ENABLED/);
});

test("final production readiness requires core D1 membership and telemetry schema",()=>{
  for(const name of [
    "membership_accounts",
    "membership_entitlements",
    "membership_access_keys",
    "membership_usage_monthly",
    "security_rate_limit_windows",
    "lioe_runtime_runs"
  ]) assert.match(source,new RegExp(name));
  for(const col of ["run_id","mission_profile","verification_state","release_state","provider_calls","total_tokens","elapsed_ms"]){
    assert.match(source,new RegExp(col));
  }
});

test("final production readiness verifies live provider and fail-closed bot state",()=>{
  assert.match(source,/\/api\/health/);
  assert.match(source,/\/api\/orchestrator/);
  assert.match(source,/\/api\/capabilities/);
  assert.match(source,/\/api\/bot/);
  assert.match(source,/bot_membership_required/);
  assert.match(source,/configured_for_api_chat_execution/);
  assert.match(source,/openai_paid_governed_workers_ai_free/);
  assert.match(source,/paidChatProvider/);
  assert.match(source,/paidChatModel/);
  assert.match(source,/freeChatProvider/);
});

test("final production readiness uses a minimal store-false OpenAI preflight",()=>{
  assert.match(source,/FINAL_READINESS_OK/);
  assert.match(source,/"store":false/);
  assert.match(source,/"reasoning":\{"effort":"low"\}/);
  assert.match(source,/"max_output_tokens":20/);
});
