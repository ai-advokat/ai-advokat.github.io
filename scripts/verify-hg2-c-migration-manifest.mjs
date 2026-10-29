import fs from "node:fs";
import crypto from "node:crypto";

const manifestPath = "evidence/hg2-c/migration-manifest.json";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const EXPECTED = {
  account: "0fee10e2bd9a2183d16eb0d73f13dfce",
  databaseName: "ai-advokat-staging-db",
  databaseId: "309f72b8-8711-47fc-bea7-fbd1d649561d",
  count: 50,
  first: "migrations/0001_initial_schema.sql",
  last: "migrations/0050_lioe_provider_diagnostics.sql"
};

function fail(message) {
  console.error("HG2-C MIGRATION MANIFEST FAIL:", message);
  process.exit(1);
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return crypto.createHash("sha1").update(header).update(buffer).digest("hex");
}

if (manifest.status !== "FROZEN_REPOSITORY_ONLY_REMOTE_NO_GO") fail("manifest status is not fail-closed");
if (manifest.staging_account_id !== EXPECTED.account) fail("staging account mismatch");
if (manifest.staging_database_name !== EXPECTED.databaseName) fail("staging database name mismatch");
if (manifest.staging_database_id !== EXPECTED.databaseId) fail("staging database UUID mismatch");
if (manifest.migration_count !== EXPECTED.count || manifest.files?.length !== EXPECTED.count) fail("expected exactly 50 frozen migrations");
if (manifest.first_migration !== EXPECTED.first) fail("unexpected first migration");
if (manifest.last_migration !== EXPECTED.last) fail("unexpected last migration");

const actual = fs.readdirSync("migrations")
  .filter(name => /^\d{4}_.*\.sql$/.test(name))
  .sort()
  .map(name => `migrations/${name}`);

if (actual.length !== manifest.files.length) fail("migration directory count differs from frozen manifest");

for (let i = 0; i < manifest.files.length; i++) {
  const item = manifest.files[i];
  const expectedPrefix = String(i + 1).padStart(4, "0") + "_";
  if (item.ordinal !== i + 1) fail(`ordinal mismatch at index ${i}`);
  if (!item.path.split("/").pop().startsWith(expectedPrefix)) fail(`non-contiguous migration sequence at ${item.path}`);
  if (actual[i] !== item.path) fail(`migration path mismatch: manifest=${item.path} actual=${actual[i]}`);

  const bytes = fs.readFileSync(item.path);
  if (bytes.length !== item.size_bytes) fail(`size mismatch: ${item.path}`);
  const sha = gitBlobSha(bytes);
  if (sha !== item.git_blob_sha) fail(`Git blob SHA mismatch: ${item.path}`);
}

const critical = new Map(manifest.files.map(x => [x.path, x.git_blob_sha]));
const expectedCritical = {
  "migrations/0033_casepilot_audit_event_schema.sql": "7f51449833d141e45af499e68af575eb627a3859",
  "migrations/0034_casepilot_authority_classification_unique_issue.sql": "15531f732737d808a34d9e0a4080f5662e612cbb",
  "migrations/0035_case_document_download_audit.sql": "d2fe5199d71a0bd47fd0bac1b6bae8bbdbf6e3bd"
};
for (const [path, sha] of Object.entries(expectedCritical)) {
  if (critical.get(path) !== sha) fail(`critical Human Review migration changed: ${path}`);
}

const staging = JSON.parse(fs.readFileSync("wrangler.staging.jsonc", "utf8")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, ""));
const db = staging.d1_databases?.[0];
if (!db || db.database_name !== EXPECTED.databaseName || db.database_id !== EXPECTED.databaseId) {
  fail("runtime staging D1 identity differs from manifest target");
}

console.log("HG2-C MIGRATION MANIFEST: PASS");
console.log(`Frozen migrations: ${manifest.files.length} (${manifest.first_migration} -> ${manifest.last_migration})`);
console.log("Remote migration remains NO-GO until credential provisioning, pre-write bookmark capture and Human Gate.");
