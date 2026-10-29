import fs from "node:fs";

const EXPECTED_ACCOUNT = "0fee10e2bd9a2183d16eb0d73f13dfce";
const EXPECTED_WORKER = "ai-advokat-staging";
const EXPECTED_DB = "ai-advokat-staging-db";
const EXPECTED_DB_ID = "309f72b8-8711-47fc-bea7-fbd1d649561d";
const PRODUCTION_DB_ID = "12ece285-74bb-4f27-a025-2dbd1be6c59a";

function fail(message) {
  console.error("HG2-C READINESS FAIL:", message);
  process.exit(1);
}

function readJsonc(path) {
  const raw = fs.readFileSync(path, "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  return JSON.parse(raw);
}

const staging = readJsonc("wrangler.staging.jsonc");
if (staging.name !== EXPECTED_WORKER) fail("unexpected staging Worker name");
if (staging.workers_dev !== false) fail("workers_dev must remain false");
if (staging.preview_urls !== false) fail("preview_urls must remain false");
if (Object.prototype.hasOwnProperty.call(staging, "ai")) fail("Workers AI binding must remain absent from first activation");
if (staging.vars?.ALARM_ENABLED !== "false") fail("ALARM_ENABLED must remain false");

const dbs = staging.d1_databases || [];
if (dbs.length !== 1) fail("exactly one runtime D1 binding is required");
const db = dbs[0];
if (db.binding !== "DB" || db.database_name !== EXPECTED_DB || db.database_id !== EXPECTED_DB_ID) {
  fail("runtime staging D1 identity mismatch");
}
if (db.database_id === PRODUCTION_DB_ID) fail("production D1 UUID detected in staging config");
if ("migrations_dir" in db) fail("runtime profile must not include migrations_dir");

const migration = readJsonc("wrangler.preview-migrations.jsonc");
const mdb = migration.d1_databases?.[0];
if (!mdb || migration.d1_databases.length !== 1) fail("exactly one migration binding is required");
if (mdb.binding !== "PREVIEW_DB" || mdb.database_name !== EXPECTED_DB || mdb.database_id !== EXPECTED_DB_ID) {
  fail("migration staging D1 identity mismatch");
}
if (mdb.migrations_dir !== "migrations") fail("migration profile must use migrations directory");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["db:migrate:staging"] !== "node scripts/block-remote-staging-migration.mjs") {
  fail("remote staging migration command is not fail-closed");
}
if (pkg.scripts?.["db:status:staging"] !== "node scripts/block-remote-staging-access.mjs") {
  fail("remote staging status command is not fail-closed");
}
const localMigration = pkg.scripts?.["db:migrate:staging:local"] || "";
if (!localMigration.includes("--local") || localMigration.includes("--remote")) {
  fail("local staging migration command is not local-only");
}

const workflowsDir = ".github/workflows";
for (const name of fs.readdirSync(workflowsDir).filter(n => /\.ya?ml$/i.test(n))) {
  const text = fs.readFileSync(`${workflowsDir}/${name}`, "utf8");
  if (text.includes(PRODUCTION_DB_ID) && /staging/i.test(name)) fail(`${name} references production D1`);
  if (/staging/i.test(name)) {
    for (const forbidden of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","secrets.","--remote","wrangler deploy"]) {
      if (text.includes(forbidden)) fail(`${name} contains pre-HG2-C remote capability: ${forbidden}`);
    }
  }
}

const design = fs.readFileSync("docs/HG2_B6_STAGING_CICD_DESIGN.md", "utf8");
if (!design.includes(EXPECTED_ACCOUNT) || !design.includes(EXPECTED_DB_ID) || !design.includes(EXPECTED_WORKER)) {
  fail("authoritative staging identity is not preserved in design evidence");
}

console.log("HG2-C REPOSITORY READINESS: PASS");
console.log("Remote activation remains BLOCKED pending dedicated least-privilege credential path and Human Gate.");
