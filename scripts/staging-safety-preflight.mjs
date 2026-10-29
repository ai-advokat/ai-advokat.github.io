import fs from "node:fs";

const EXPECTED_DB_NAME = "ai-advokat-staging-db";
const EXPECTED_DB_ID = "309f72b8-8711-47fc-bea7-fbd1d649561d";
const EXPECTED_WORKER = "ai-advokat-staging";

function fail(message) {
  console.error("STAGING SAFETY FAIL:", message);
  process.exit(1);
}

function readJsonc(path) {
  const text = fs.readFileSync(path, "utf8");
  const stripped = text
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  try {
    return JSON.parse(stripped);
  } catch (error) {
    fail(`${path} is not parseable JSONC: ${error.message}`);
  }
}

const staging = readJsonc("wrangler.staging.jsonc");
if (staging.name !== EXPECTED_WORKER) fail("unexpected Worker name");
if (staging.workers_dev !== false) fail("workers_dev must be explicitly false");
if (staging.preview_urls !== false) fail("preview_urls must be explicitly false");
if (Object.prototype.hasOwnProperty.call(staging, "ai")) fail("Workers AI binding is not allowed in the first staging activation profile");
if (staging.vars?.ALARM_ENABLED !== "false") fail("ALARM_ENABLED must remain false");

const db = staging.d1_databases?.[0];
if (!db || staging.d1_databases.length !== 1) fail("exactly one staging D1 binding is required");
if (db.binding !== "DB") fail("runtime D1 binding must be DB");
if (db.database_name !== EXPECTED_DB_NAME) fail("runtime D1 database name mismatch");
if (db.database_id !== EXPECTED_DB_ID) fail("runtime D1 database UUID mismatch");
if (Object.prototype.hasOwnProperty.call(db, "migrations_dir")) fail("runtime activation profile must not carry migrations_dir");

const migration = readJsonc("wrangler.preview-migrations.jsonc");
const previewDb = migration.d1_databases?.[0];
if (!previewDb || migration.d1_databases.length !== 1) fail("exactly one local migration D1 binding is required");
if (previewDb.binding !== "PREVIEW_DB") fail("local migration binding must be PREVIEW_DB");
if (previewDb.database_name !== EXPECTED_DB_NAME) fail("local migration database name mismatch");
if (previewDb.database_id !== EXPECTED_DB_ID) fail("local migration database UUID mismatch");
if (previewDb.migrations_dir !== "migrations") fail("local migration profile must use migrations directory");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["db:migrate:staging"] !== "node scripts/block-remote-staging-migration.mjs") {
  fail("db:migrate:staging must fail closed");
}
const localMigration = pkg.scripts?.["db:migrate:staging:local"] || "";
if (!localMigration.includes("--local") || localMigration.includes("--remote")) {
  fail("db:migrate:staging:local must be local-only");
}

const workflow = fs.readFileSync(".github/workflows/paragraf-migration-staging.yml", "utf8");
for (const forbidden of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "--remote", "secrets."]) {
  if (workflow.includes(forbidden)) fail(`staging migration workflow contains forbidden remote capability: ${forbidden}`);
}
if (!workflow.includes("db:migrate:staging:local")) fail("staging workflow must use the local migration command");

console.log("HG2-B5 STAGING SAFETY PREFLIGHT: PASS");
