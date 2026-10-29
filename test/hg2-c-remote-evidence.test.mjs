import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";

function runEvidence(evidence) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hg2-c-evidence-"));
  const file = path.join(dir, "evidence.json");
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  const result = spawnSync(process.execPath, ["scripts/verify-hg2-c-remote-evidence.mjs", file], {
    encoding: "utf8"
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

function validEvidence() {
  return {
    status: "HG2_C_REMOTE_READONLY_PREFLIGHT_PASS",
    staging_account_id: "0fee10e2bd9a2183d16eb0d73f13dfce",
    staging_database_name: "ai-advokat-staging-db",
    staging_database_id: "309f72b8-8711-47fc-bea7-fbd1d649561d",
    migration_count_expected: 50,
    migration_count_remote_unapplied: 50,
    migration_set_exact_match: true,
    d1_backend_time_travel_capable: true,
    bookmark_evidence_present: true,
    pre_write_bookmark: "00000085-0000024c-00004c6d-8e61117bf38d7adb71b934ebbf891683",
    activation_git_sha: "1234567890abcdef1234567890abcdef12345678",
    token_a_name: "hg2-c-staging-d1-migration",
    token_a_scope_summary: "D1 staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority",
    token_a_expires_at: "2026-10-30T00:00:00Z",
    verified_at_utc: "2026-10-29T12:45:00Z"
  };
}

test("valid non-secret HG2-C remote evidence passes", () => {
  const result = runEvidence(validEvidence());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /HG2-C REMOTE EVIDENCE: PASS/);
});

test("secret-bearing evidence keys are rejected", () => {
  const evidence = validEvidence();
  evidence.api_token = "must-never-be-here";
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /secret-bearing key is forbidden/);
});

test("wrong or broad credential scope is rejected", () => {
  const evidence = validEvidence();
  evidence.token_a_scope_summary = "D1 account-wide authority for all accounts";
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
});

test("missing exact rollback bookmark is rejected", () => {
  const evidence = validEvidence();
  evidence.pre_write_bookmark = "";
  const result = runEvidence(evidence);
  assert.notEqual(result.status, 0);
});
