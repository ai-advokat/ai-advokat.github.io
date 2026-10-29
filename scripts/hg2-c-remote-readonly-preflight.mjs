import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_ACCOUNT = "0fee10e2bd9a2183d16eb0d73f13dfce";
const EXPECTED_DB = "ai-advokat-staging-db";
const EXPECTED_DB_ID = "309f72b8-8711-47fc-bea7-fbd1d649561d";
const CONFIG = "wrangler.preview-migrations.jsonc";
const MANIFEST = "evidence/hg2-c/migration-manifest.json";

function fail(message) {
  console.error("HG2-C REMOTE READ-ONLY PREFLIGHT FAIL:", message);
  process.exit(1);
}

if (process.env.HG2_C_REMOTE_READONLY_APPROVED !== "YES") {
  fail("explicit read-only Human Gate marker HG2_C_REMOTE_READONLY_APPROVED=YES is required");
}
if (process.env.CLOUDFLARE_ACCOUNT_ID !== EXPECTED_ACCOUNT) {
  fail("CLOUDFLARE_ACCOUNT_ID must equal the dedicated staging account");
}
if (!process.env.CLOUDFLARE_API_TOKEN) {
  fail("CLOUDFLARE_API_TOKEN is required but must never be stored in the repository");
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (manifest.staging_account_id !== EXPECTED_ACCOUNT ||
    manifest.staging_database_name !== EXPECTED_DB ||
    manifest.staging_database_id !== EXPECTED_DB_ID) {
  fail("frozen manifest target identity mismatch");
}

function runWrangler(args, label) {
  const result = spawnSync("npx", ["--no-install", "wrangler", ...args], {
    encoding: "utf8",
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: EXPECTED_ACCOUNT },
    shell: false
  });
  if (result.error) fail(`${label}: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim().slice(-1200);
    fail(`${label} exited ${result.status}: ${stderr}`);
  }
  return { stdout: result.stdout || "", stderr: result.stderr || "" };
}

// READ ONLY: remote D1 identity/state information.
const info = runWrangler(
  ["d1", "info", EXPECTED_DB, "--json", "--config", CONFIG],
  "d1 info"
);
const infoText = info.stdout + info.stderr;
if (!infoText.includes(EXPECTED_DB) && !infoText.includes(EXPECTED_DB_ID)) {
  fail("d1 info output does not identify the expected staging database");
}
if (!/production/i.test(infoText)) {
  fail("D1 backend version was not verified as production/Time-Travel capable");
}

// READ ONLY: list unapplied migrations. No apply command exists in this script.
const migrationList = runWrangler(
  ["d1", "migrations", "list", EXPECTED_DB, "--remote", "--config", CONFIG],
  "d1 migrations list"
);
const actualNames = [...new Set(
  (migrationList.stdout.match(/\b\d{4}_[A-Za-z0-9_.-]+\.sql\b/g) || [])
)].sort();
const expectedNames = manifest.files.map(x => path.basename(x.path)).sort();

if (actualNames.length !== expectedNames.length) {
  fail(`remote unapplied migration count ${actualNames.length} != frozen count ${expectedNames.length}`);
}
for (let i = 0; i < expectedNames.length; i++) {
  if (actualNames[i] !== expectedNames[i]) {
    fail(`remote migration list differs at index ${i}: ${actualNames[i]} != ${expectedNames[i]}`);
  }
}

// READ ONLY: capture current rollback bookmark. Restore is intentionally absent.
const timeTravel = runWrangler(
  ["d1", "time-travel", "info", EXPECTED_DB, "--json", "--config", CONFIG],
  "d1 time-travel info"
);
const bookmarkText = timeTravel.stdout.trim();
if (!bookmarkText || !/bookmark/i.test(bookmarkText)) {
  fail("Time Travel bookmark evidence was not returned");
}

const evidence = {
  status: "HG2_C_REMOTE_READONLY_PREFLIGHT_PASS",
  staging_account_id: EXPECTED_ACCOUNT,
  staging_database_name: EXPECTED_DB,
  staging_database_id: EXPECTED_DB_ID,
  migration_count_expected: expectedNames.length,
  migration_count_remote_unapplied: actualNames.length,
  migration_set_exact_match: true,
  d1_backend_time_travel_capable: true,
  bookmark_evidence_present: true,
  note: "No token value is emitted. No migration apply, restore, deploy, execute, create, delete, route or production action is performed."
};

console.log(JSON.stringify(evidence, null, 2));
