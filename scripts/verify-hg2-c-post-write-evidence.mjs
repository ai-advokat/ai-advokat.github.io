import fs from "node:fs";

const EXPECTED = {
  account: "0fee10e2bd9a2183d16eb0d73f13dfce",
  databaseName: "ai-advokat-staging-db",
  databaseId: "309f72b8-8711-47fc-bea7-fbd1d649561d",
  migrationCount: 50,
  firstMigration: "0001_initial_schema.sql",
  lastMigration: "0050_lioe_provider_diagnostics.sql",
  tokenWName: "hg2-c-staging-d1-write"
};

function fail(message, code = 1) {
  console.error("HG2-C POST-WRITE EVIDENCE FAIL:", message);
  process.exit(code);
}

const evidencePath = process.argv[2];
if (!evidencePath) fail("evidence JSON path is required", 2);
if (!fs.existsSync(evidencePath)) fail(`evidence file not found: ${evidencePath}`, 2);

let evidence;
try {
  evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
} catch (error) {
  fail(`invalid evidence JSON: ${error.message}`);
}

const forbiddenKey = /^(api.?token|token.?value|secret|authorization|bearer|password|private.?key)$/i;
function scanKeys(value, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((child, i) => scanKeys(child, `${path}[${i}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKey.test(key)) fail(`secret-bearing key is forbidden in evidence: ${path}.${key}`);
    scanKeys(child, `${path}.${key}`);
  }
}
scanKeys(evidence);

const allowedStatuses = new Set([
  "PASS_POST_WRITE_VERIFIED_TOKEN_W_REVOCATION_PENDING",
  "PASS_D1_STAGING_PHASE_CLOSED"
]);
if (!allowedStatuses.has(evidence.status)) fail("unsupported post-write evidence status");
if (evidence.schema !== "ai-advokat-hg2-c-post-write-evidence/v1") fail("unexpected evidence schema");
if (evidence.staging_account_id !== EXPECTED.account) fail("staging account mismatch");
if (evidence.staging_database_name !== EXPECTED.databaseName) fail("staging database name mismatch");
if (evidence.staging_database_id !== EXPECTED.databaseId) fail("staging database UUID mismatch");
if (!/^[0-9a-f]{40}$/.test(evidence.execution_git_sha || "")) fail("execution Git SHA missing or invalid");
if (!/^[0-9a-f]{40}$/.test(evidence.verified_readonly_activation_sha || "")) fail("read-only activation SHA missing or invalid");
if (evidence.frozen_migration_count !== EXPECTED.migrationCount) fail("frozen migration count is not 50");
if (evidence.first_migration !== EXPECTED.firstMigration) fail("first migration mismatch");
if (evidence.last_migration !== EXPECTED.lastMigration) fail("last migration mismatch");

const apply = evidence.wrangler_apply_observation || {};
if (apply.target_database_exact_match !== true) fail("Wrangler target database was not verified");
if (apply.migrations_reported_success !== EXPECTED.migrationCount) fail("Wrangler did not report 50 successful migrations");
for (const key of ["migration_0033_status", "migration_0034_status", "migration_0035_status", "migration_0050_status"]) {
  if (apply[key] !== "PASS") fail(`${key} is not PASS`);
}

const ledger = evidence.post_write_ledger_check || {};
if (ledger.api_success !== true) fail("post-write ledger API check did not succeed");
if (ledger.applied_count !== EXPECTED.migrationCount) fail("post-write ledger count is not 50");
if (ledger.first_migration !== EXPECTED.firstMigration) fail("post-write first migration mismatch");
if (ledger.last_migration !== EXPECTED.lastMigration) fail("post-write last migration mismatch");

const schema = evidence.post_write_schema_check || {};
if (schema.api_success !== true) fail("post-write schema API check did not succeed");
if (schema.table !== "lioe_runtime_runs") fail("post-write schema table mismatch");
if (schema.expected_diagnostics_columns !== 8 || schema.observed_diagnostics_columns !== 8) {
  fail("0050 diagnostics schema is not exactly 8/8");
}

const tt = evidence.time_travel || {};
if (typeof tt.pre_write_bookmark !== "string" || tt.pre_write_bookmark.length < 16) fail("pre-write bookmark missing");
if (typeof tt.post_write_bookmark !== "string" || tt.post_write_bookmark.length < 16) fail("post-write bookmark missing");
if (tt.pre_write_bookmark === tt.post_write_bookmark) fail("pre-write and post-write bookmarks must differ");

const gate = evidence.human_gate || {};
if (gate.decision !== "APPROVE_FIRST_STAGING_D1_WRITE") fail("Human Gate decision mismatch");
if (!gate.approver) fail("Human Gate approver missing");
if (!Number.isFinite(Date.parse(gate.decision_timestamp_utc || ""))) fail("Human Gate timestamp missing or invalid");
for (const key of ["migration_0033_reviewed", "migration_0034_reviewed", "migration_0035_reviewed", "rollback_acknowledged"]) {
  if (gate[key] !== true) fail(`Human Gate acknowledgement missing: ${key}`);
}

const tokenW = evidence.token_w || {};
if (tokenW.name !== EXPECTED.tokenWName) fail("Token W name mismatch");
if (typeof tokenW.scope_summary !== "string" || !tokenW.scope_summary.includes(EXPECTED.account)) {
  fail("Token W scope summary must identify the dedicated staging account");
}
if (!/D1\s+Write/i.test(tokenW.scope_summary)) fail("Token W scope summary must identify D1 Write authority");
if (/all\s+accounts|12ece285-74bb-4f27-a025-2dbd1be6c59a|\bai-advokat-db\b/i.test(tokenW.scope_summary)) {
  fail("Token W scope summary contains broad or production authority/reference");
}
if (tokenW.credential_value_stored !== false) fail("Token W credential value must not be stored");

if (evidence.status === "PASS_POST_WRITE_VERIFIED_TOKEN_W_REVOCATION_PENDING") {
  if (tokenW.revocation_status !== "PENDING_OPERATOR_REVOCATION_AFTER_EVIDENCE_MERGE") {
    fail("pending evidence must record Token W revocation as pending");
  }
} else if (tokenW.revocation_status !== "REVOKED") {
  fail("closed D1 phase requires Token W revocation");
}

if (evidence.worker_phase !== "NO_GO_NOT_STARTED") fail("Worker phase must remain NO-GO");
if (evidence.production_phase !== "NO_GO_NOT_TOUCHED_BY_THIS_OPERATION") fail("production phase boundary mismatch");
if (!Number.isFinite(Date.parse(evidence.recorded_at_utc || ""))) fail("recorded timestamp missing or invalid");

if (evidence.status === "PASS_D1_STAGING_PHASE_CLOSED") {
  console.log("HG2-C POST-WRITE EVIDENCE: PASS (D1 STAGING PHASE CLOSED)");
} else {
  console.log("HG2-C POST-WRITE EVIDENCE: PASS (TOKEN W REVOCATION PENDING)");
}
console.log(`Applied migrations: ${ledger.applied_count}`);
console.log(`0050 diagnostics columns: ${schema.observed_diagnostics_columns}/8`);
console.log(`Post-write bookmark: ${tt.post_write_bookmark}`);
