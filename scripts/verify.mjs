import fs from "node:fs";

const required = [
  "index.html",
  "src/index.js",
  "migrations/0001_initial_schema.sql",
  "migrations/0002_public_source_seed.sql",
  "wrangler.jsonc",
  "wrangler.preview-migrations.jsonc",
  "ingest/README.md",
  "ingest/sources.csv",
  "ingest/legal_instruments.csv",
  "ingest/case_law.csv",
  "ingest/publications.csv"
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
}

const wrangler = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
const previewMigrations = JSON.parse(fs.readFileSync("wrangler.preview-migrations.jsonc", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const worker = fs.readFileSync("src/index.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const prod = wrangler.d1_databases?.[0];
const preview = wrangler.previews?.d1_databases?.[0];
const migrationTarget = previewMigrations.d1_databases?.[0];

if (!prod || prod.database_name !== "ai-advokat-db") throw new Error("Production D1 binding is invalid.");
if (!preview || preview.database_name !== "ai-advokat-db-staging") throw new Error("Preview D1 binding is invalid.");
if (prod.database_id === preview.database_id) throw new Error("Preview must not use production D1.");
if (!migrationTarget || migrationTarget.database_id !== preview.database_id) {
  throw new Error("Preview migration target must match Preview D1.");
}
if (pkg.version !== "1.3.3") throw new Error("package.json version must be 1.3.3.");

if (html.includes("zenodo.org/uploads/")) {
  throw new Error("Private Zenodo upload URL exposed in public index.html.");
}

if (!worker.includes('publicMode: "read_only"')) {
  throw new Error("Worker must declare read-only public mode.");
}
if (!worker.includes('documentUpload: "locked"')) {
  throw new Error("Document upload must remain locked.");
}
if (!worker.includes('caseWorkspace: "locked"')) {
  throw new Error("Case workspace must remain locked.");
}
if (!worker.includes('workersAI: "not_bound"')) {
  throw new Error("Workers AI must remain disabled in this release.");
}
if (!worker.includes('vectorize: "not_bound"')) {
  throw new Error("Vectorize must remain disabled in this release.");
}

console.log("AI Advokat v1.3.3 structural verification: PASS");
