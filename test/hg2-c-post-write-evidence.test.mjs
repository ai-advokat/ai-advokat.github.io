import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

function runEvidence(evidence) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hg2-c-post-write-"));
  const file = path.join(dir, "evidence.json");
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  const result = spawnSync(process.execPath, ["scripts/verify-hg2-c-post-write-evidence.mjs", file], {
    encoding: "utf8"
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

function validEvidence() {
  return {
    schema: "ai-advokat-hg2-c-post-write-evidence/v1",
    status: "PASS_POST_WRITE_VERIFIED_TOKEN_W_REVOCATION_PENDING",
    recorded_at_utc: "2026-10-29T20:02:38Z",
    staging_account_id: "0fee10e2bd9a2183d16eb0d73f13dfce",
    staging_database_name: "ai-advokat-staging-db",
    staging_database_id: "309f72b8-8711-47fc-bea7-fbd1d649561d",
    execution_git_sha: "1234567890abcdef1234567890abcdef12345678",
    verified_readonly_activation_sha: "abcdef1234567890abcdef1234567890abcdef12",
    frozen_migration_count: 50,
    first_migration: "0001_initial_schema.sql",
    last_migration: "0050_lioe_provider_diagnostics.sql",
    wrangler_apply_observation: {
      target_database_exact_match: true,
      migrations_reported_success: 50,
      migration_0033_status: "PASS",
      migration_0034_status: "PASS",
      migration_0035_status: "PASS",
      migration_0050_status: "PASS"
    },
    post_write_ledger_check: {
      api_success: true,
      applied_count: 50,
      first_migration: "0001_initial_schema.sql",
      last_migration: "0050_lioe_provider_diagnostics.sql"
    },
    post_write_schema_check: {
      api_success: true,
      table: "lioe_runtime_runs",
      expected_diagnostics_columns: 8,
      observed_diagnostics_columns: 8
    },
    time_travel: {
      pre_write_bookmark: "00000004-00000000-00005113-c038f1e321a99a39f266a9d8a71299f3",
      post_write_bookmark: "00000009-00000000-00005113-5a092eb2bdbe2a2d958b76d85243016c"
    },
    human_gate: {
      decision: "APPROVE_FIRST_STAGING_D1_WRITE",
      approver: "Sande Smiljanov",
      decision_timestamp_utc: "2026-10-29T19:10:30Z",
      migration_0033_reviewed: true,
      migration_0034_reviewed: true,
      migration_0035_reviewed: true,
      rollback_acknowledged: true
    },
    token_w: {
      name: "hg2-c-staging-d1-write",
      scope_summary: "D1 Write staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no Worker, route, Workers AI, DNS/zone or production permissions",
      credential_value_stored: false,
      revocation_status: "PENDING_OPERATOR_REVOCATION_AFTER_EVIDENCE_MERGE"
    },
    worker_phase: "NO_GO_NOT_STARTED",
    production_phase: "NO_GO_NOT_TOUCHED_BY_THIS_OPERATION"
  };
}

test("valid post-write evidence with revocation pending passes", () => {
  const result = runEvidence(validEvidence());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /TOKEN W REVOCATION PENDING/);
});

test("wrong migration count is rejected", () => {
  const evidence = validEvidence();
  evidence.post_write_ledger_check.applied_count = 49;
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ledger count is not 50/);
});

test("missing 0050 schema columns are rejected", () => {
  const evidence = validEvidence();
  evidence.post_write_schema_check.observed_diagnostics_columns = 7;
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not exactly 8\/8/);
});

test("identical pre and post bookmarks are rejected", () => {
  const evidence = validEvidence();
  evidence.time_travel.post_write_bookmark = evidence.time_travel.pre_write_bookmark;
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must differ/);
});

test("production or broad Token W scope is rejected", () => {
  const evidence = validEvidence();
  evidence.token_w.scope_summary = "D1 Write for all accounts including ai-advokat-db";
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
});

test("credential value storage is rejected", () => {
  const evidence = validEvidence();
  evidence.token_w.credential_value_stored = true;
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not be stored/);
});

test("closed D1 phase requires Token W revocation", () => {
  const evidence = validEvidence();
  evidence.status = "PASS_D1_STAGING_PHASE_CLOSED";
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires Token W revocation/);

  evidence.token_w.revocation_status = "REVOKED";
  const closed = runEvidence(evidence);
  assert.equal(closed.status, 0, closed.stderr);
  assert.match(closed.stdout, /D1 STAGING PHASE CLOSED/);
});
