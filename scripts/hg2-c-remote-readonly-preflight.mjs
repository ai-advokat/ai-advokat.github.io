import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const EXPECTED_ACCOUNT = "0fee10e2bd9a2183d16eb0d73f13dfce";
const EXPECTED_DB = "ai-advokat-staging-db";
const EXPECTED_DB_ID = "309f72b8-8711-47fc-bea7-fbd1d649561d";
const CONFIG = "wrangler.preview-migrations.jsonc";
const MANIFEST = "evidence/hg2-c/migration-manifest.json";
const EXPECTED_TOKEN_R_SCOPE_SUMMARY = "D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority";
const D1_QUERY_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${EXPECTED_ACCOUNT}/d1/database/${EXPECTED_DB_ID}/query`;
const USER_TABLES_SQL = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
const KNOWN_D1_SYSTEM_TABLES = new Set(["_cf_KV"]);
const APPLIED_MIGRATIONS_SQL = 'SELECT name FROM "d1_migrations" ORDER BY id';

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

function assertSingleSelect(sql, label) {
  const normalized = sql.trim();
  if (!/^SELECT\b/i.test(normalized)) fail(`${label}: only SELECT statements are allowed`);
  const withoutTrailingSemicolon = normalized.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) fail(`${label}: multiple SQL statements are forbidden`);
}

async function queryD1ReadOnly(sql, label) {
  assertSingleSelect(sql, label);

  let response;
  try {
    response = await fetch(D1_QUERY_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql })
    });
  } catch (error) {
    fail(`${label}: ${error.message}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`${label}: Cloudflare API response was not valid JSON`);
  }

  if (!response.ok || payload.success !== true) {
    const errors = Array.isArray(payload.errors) ? payload.errors : [];
    const detail = errors
      .map((item) => `${item.code ?? "unknown"} ${item.message ?? "unknown error"}`)
      .join(" | ");
    fail(`${label}: ${detail || `HTTP ${response.status}`}`);
  }

  const batches = Array.isArray(payload.result)
    ? payload.result
    : (payload.result ? [payload.result] : []);

  for (const batch of batches) {
    if (batch && batch.success === false) fail(`${label}: D1 query batch reported failure`);
  }

  return batches.flatMap((batch) =>
    Array.isArray(batch?.results) ? batch.results : []
  );
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
let infoJson;
try {
  infoJson = JSON.parse(info.stdout.trim());
} catch {
  fail("d1 info JSON output could not be parsed");
}
if (infoJson.name !== EXPECTED_DB || infoJson.uuid !== EXPECTED_DB_ID) {
  fail("d1 info JSON does not identify the expected staging database");
}
const reportedVersion = findStringByKey(infoJson, "version");
if (reportedVersion && reportedVersion.toLowerCase() !== "production") {
  fail(`unexpected D1 backend version: ${reportedVersion}`);
}

// READ ONLY: inspect remote schema and migration ledger with fixed single-SELECT queries.
// Wrangler "d1 migrations list" is intentionally not used because it initializes
// the d1_migrations table on a pristine database, which is a write.
const expectedNames = manifest.files.map(x => path.basename(x.path)).sort();

const tableRows = await queryD1ReadOnly(USER_TABLES_SQL, "read remote table inventory");
const remoteTables = [...new Set(
  tableRows
    .map((row) => typeof row?.name === "string" ? row.name.trim() : "")
    .filter(Boolean)
)].sort();

const d1SystemTablesObserved = remoteTables.filter((name) => KNOWN_D1_SYSTEM_TABLES.has(name));
const applicationTables = remoteTables.filter((name) => !KNOWN_D1_SYSTEM_TABLES.has(name));

let appliedNames = [];
let migrationStateBasis;
let migrationLedgerPresent = false;

if (applicationTables.length === 0) {
  migrationStateBasis = "pristine-empty-d1";
} else if (applicationTables.includes("d1_migrations")) {
  migrationLedgerPresent = true;
  migrationStateBasis = "existing-d1-migrations-ledger";

  const migrationRows = await queryD1ReadOnly(
    APPLIED_MIGRATIONS_SQL,
    "read remote migration ledger"
  );
  appliedNames = [...new Set(
    migrationRows
      .map((row) => typeof row?.name === "string" ? row.name.trim() : "")
      .filter(Boolean)
  )].sort();

  const domainTables = applicationTables.filter((name) => name !== "d1_migrations");
  if (appliedNames.length === 0 && domainTables.length > 0) {
    fail("remote application schema exists without applied migration records");
  }
} else {
  fail("remote application schema exists without a d1_migrations ledger");
}

const unexpectedApplied = appliedNames.filter((name) => !expectedNames.includes(name));
if (unexpectedApplied.length > 0) {
  fail(`remote migration ledger contains unknown entries: ${unexpectedApplied.join(", ")}`);
}

const actualNames = expectedNames.filter((name) => !appliedNames.includes(name));
if (actualNames.length !== expectedNames.length) {
  fail(`remote unapplied migration count ${actualNames.length} != frozen count ${expectedNames.length}`);
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
  migration_count_remote_applied: appliedNames.length,
  migration_count_remote_unapplied: actualNames.length,
  migration_set_exact_match: true,
  migration_state_basis: migrationStateBasis,
  migration_ledger_present: migrationLedgerPresent,
  remote_user_table_count: applicationTables.length,
  d1_system_tables_observed: d1SystemTablesObserved,
  d1_backend_time_travel_capable: true,
  bookmark_evidence_present: true,
  pre_write_bookmark: preWriteBookmark,
  activation_git_sha: activationSha,
  token_r_name: process.env.HG2_C_TOKEN_R_NAME,
  token_r_scope_summary: process.env.HG2_C_TOKEN_R_SCOPE_SUMMARY,
  token_r_expires_at: process.env.HG2_C_TOKEN_R_EXPIRES_AT || null,
  verified_at_utc: new Date().toISOString(),
  note: "No token value is emitted. Migration state is read with fixed single-SELECT D1 REST queries; no migrations list, apply, restore, deploy, execute, create, delete, route or production action is performed."
};

console.log(JSON.stringify(evidence, null, 2));
