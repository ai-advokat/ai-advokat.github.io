import fs from "node:fs";

const required = [
  "migrations/0001_initial_schema.sql",
  "migrations/0002_public_source_seed.sql",
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

const prod = wrangler.d1_databases?.[0];
const preview = wrangler.previews?.d1_databases?.[0];
const migrationTarget = previewMigrations.d1_databases?.[0];

if (!prod || prod.database_name !== "ai-advokat-db") throw new Error("Production D1 binding is invalid.");
if (!preview || preview.database_name !== "ai-advokat-db-staging") throw new Error("Preview D1 binding is invalid.");
if (prod.database_id === preview.database_id) throw new Error("Preview must not use the production D1 database.");
if (!migrationTarget || migrationTarget.database_id !== preview.database_id) {
  throw new Error("Preview migration target must match Preview D1.");
}
if (pkg.version !== "1.3.2") throw new Error("package.json version must be 1.3.2.");

for (const path of ["index.html", "privacy.html", "terms.html", "security.html", "governance.html"]) {
  const body = fs.readFileSync(path, "utf8");
  if (body.includes("zenodo.org/uploads/")) throw new Error(`Private Zenodo upload URL exposed in ${path}`);
}

console.log("AI Advokat v1.3.2 structural verification: PASS");
