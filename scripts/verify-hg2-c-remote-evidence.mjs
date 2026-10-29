import fs from "node:fs";

const EXPECTED = {
  account: "0fee10e2bd9a2183d16eb0d73f13dfce",
  databaseName: "ai-advokat-staging-db",
  databaseId: "309f72b8-8711-47fc-bea7-fbd1d649561d",
  migrationCount: 50
};

function fail(message, code = 1) {
  console.error("HG2-C REMOTE EVIDENCE FAIL:", message);
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

const forbiddenKey = /(api.?token|token.?value|secret|authorization|bearer|password|private.?key)/i;
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

if (evidence.status !== "HG2_C_REMOTE_READONLY_PREFLIGHT_PASS") fail("preflight status is not PASS");
if (evidence.staging_account_id !== EXPECTED.account) fail("staging account mismatch");
if (evidence.staging_database_name !== EXPECTED.databaseName) fail("staging database name mismatch");
if (evidence.staging_database_id !== EXPECTED.databaseId) fail("staging database UUID mismatch");
if (evidence.migration_count_expected !== EXPECTED.migrationCount) fail("expected migration count mismatch");
if (evidence.migration_count_remote_unapplied !== EXPECTED.migrationCount) fail("remote unapplied migration count is not 50");
if (evidence.migration_set_exact_match !== true) fail("remote migration set did not exactly match frozen manifest");
if (evidence.d1_backend_time_travel_capable !== true) fail("D1 Time Travel capability not verified");
if (evidence.bookmark_evidence_present !== true) fail("bookmark evidence flag is not true");
if (typeof evidence.pre_write_bookmark !== "string" || evidence.pre_write_bookmark.trim().length < 16) fail("exact pre-write bookmark missing");
if (!/^[0-9a-f]{40}$/.test(evidence.activation_git_sha || "")) fail("activation Git SHA missing or invalid");
if (typeof evidence.token_a_name !== "string" || !evidence.token_a_name.trim()) fail("non-secret Token A name missing");
if (typeof evidence.token_a_scope_summary !== "string" || !evidence.token_a_scope_summary.trim()) fail("Token A scope summary missing");
if (!evidence.token_a_scope_summary.includes(EXPECTED.account)) fail("Token A scope summary must identify the dedicated staging account");
if (!/D1/i.test(evidence.token_a_scope_summary)) fail("Token A scope summary must identify D1 authority");
if (/12ece285-74bb-4f27-a025-2dbd1be6c59a|\\bai-advokat-db\\b|all\\s+accounts|account-wide/i.test(evidence.token_a_scope_summary)) {
  fail("Token A scope summary contains production or overly broad authority/reference");
}
const verifiedAt = Date.parse(evidence.verified_at_utc || "");
if (!Number.isFinite(verifiedAt)) fail("verification timestamp missing or invalid");

console.log("HG2-C REMOTE EVIDENCE: PASS");
console.log(`Activation SHA: ${evidence.activation_git_sha}`);
console.log(`Pre-write bookmark: ${evidence.pre_write_bookmark}`);
console.log("First remote write remains a separate Human Gate decision.");
