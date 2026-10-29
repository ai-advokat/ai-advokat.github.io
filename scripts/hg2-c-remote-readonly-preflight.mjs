import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_ACCOUNT = "0fee10e2bd9a2183d16eb0d73f13dfce";
const EXPECTED_DB = "ai-advokat-staging-db";
const EXPECTED_DB_ID = "309f72b8-8711-47fc-bea7-fbd1d649561d";
const CONFIG = "wrangler.preview-migrations.jsonc";
const MANIFEST = "evidence/hg2-c/migration-manifest.json";
const EXPECTED_TOKEN_R_SCOPE_SUMMARY = "D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority";

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
if (!process.env.HG2_C_TOKEN_R_NAME) {
  fail("HG2_C_TOKEN_R_NAME is required for non-secret credential provenance");
}
if (!process.env.HG2_C_TOKEN_R_SCOPE_SUMMARY) {
  fail("HG2_C_TOKEN_R_SCOPE_SUMMARY is required for non-secret credential provenance");
}
const tokenRScope = process.env.HG2_C_TOKEN_R_SCOPE_SUMMARY;
if (tokenRScope !== EXPECTED_TOKEN_R_SCOPE_SUMMARY) {
  fail("Token R scope summary must exactly match the approved staging-only D1 Read scope");
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
if (manifest.staging_account_id !== EXPECTED_ACCOUNT ||
    manifest.staging_database_name !== EXPECTED_DB ||
    manifest.staging_database_id !== EXPECTED_DB_ID) {
  fail("frozen manifest target identity mismatch");
}

function findStringByKey(value, wantedKey) {
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === wantedKey && typeof child === "string" && child.trim()) return child.trim();
      const nested = findStringByKey(child, wantedKey);
      if (nested) return nested;
    }
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const nested = findStringByKey(child, wantedKey);
      if (nested) return nested;
    }
  }
  return null;
}

function currentGitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", shell: false });
  if (result.status !== 0) fail("cannot determine activation Git SHA");
  const sha = (result.stdout || "").trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) fail("invalid activation Git SHA");
  return sha;
}

function runWrangler(args, label) {
  const wranglerCli = path.resolve("node_modules", "wrangler", "bin", "wrangler.js");
  if (!fs.existsSync(wranglerCli)) fail("local Wrangler CLI not found");
  const result = spawnSync(process.execPath, [wranglerCli, ...args], {
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
let bookmarkJson;
try {
  bookmarkJson = JSON.parse(bookmarkText);
} catch {
  fail("Time Travel JSON output could not be parsed");
}
const preWriteBookmark = findStringByKey(bookmarkJson, "bookmark");
if (!preWriteBookmark || preWriteBookmark.length < 16) {
  fail("exact pre-write Time Travel bookmark could not be extracted");
}

const activationSha = currentGitSha();

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
  pre_write_bookmark: preWriteBookmark,
  activation_git_sha: activationSha,
  token_r_name: process.env.HG2_C_TOKEN_R_NAME,
  token_r_scope_summary: process.env.HG2_C_TOKEN_R_SCOPE_SUMMARY,
  token_r_expires_at: process.env.HG2_C_TOKEN_R_EXPIRES_AT || null,
  verified_at_utc: new Date().toISOString(),
  note: "No token value is emitted. No migration apply, restore, deploy, execute, create, delete, route or production action is performed."
};

console.log(JSON.stringify(evidence, null, 2));
