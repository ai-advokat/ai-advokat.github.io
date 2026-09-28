import fs from "node:fs";

const required = [
  "index.html",
  "scholar/ai-legal-practice-judiciary/index.html",
  "scholar/mobile-phone-privilege/index.html",
  "scholar/electronic-ai-evidence/index.html",
  "scholar/sindzir/index.html",
  "scholar/index.html",
  "robots.txt",
  "sitemap.xml",
  "sitemap.txt",
  ".well-known/security.txt",
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
const robots = fs.readFileSync("robots.txt", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const sitemapTxt = fs.readFileSync("sitemap.txt", "utf8");
const securityTxt = fs.readFileSync(".well-known/security.txt", "utf8");

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
if (!html.includes('rel="canonical" href="https://ai-advokat.github.io/"')) {
  throw new Error("Canonical URL is missing.");
}
if (!html.includes('http-equiv="Content-Security-Policy"')) {
  throw new Error("HTML CSP fallback is missing.");
}
if (!robots.includes("Sitemap: https://ai-advokat.github.io/sitemap.xml")) {
  throw new Error("robots.txt must advertise the canonical sitemap.");
}
if (!sitemap.includes("<loc>https://ai-advokat.github.io/</loc>")) {
  throw new Error("Sitemap must include the canonical portal URL.");
}
if (!sitemapTxt.split(/\r?\n/).includes("https://ai-advokat.github.io/")) {
  throw new Error("Text sitemap must include the canonical portal URL.");
}
const scholarUrls = [
  "https://ai-advokat.github.io/scholar/",
  "https://ai-advokat.github.io/scholar/sindzir/",
  "https://ai-advokat.github.io/scholar/electronic-ai-evidence/",
  "https://ai-advokat.github.io/scholar/mobile-phone-privilege/",
  "https://ai-advokat.github.io/scholar/ai-legal-practice-judiciary/"
];
if (!scholarUrls.every((url) => sitemap.includes(`<loc>${url}</loc>`) && sitemapTxt.split(/\r?\n/).includes(url))) {
  throw new Error("Scholar sitemap URLs are incomplete.");
}
for (const path of scholarUrls.slice(1).map((url) => url.replace("https://ai-advokat.github.io/", "") + "index.html")) {
  const scholarHtml = fs.readFileSync(path, "utf8");
  if (!scholarHtml.includes('name="citation_title"') || !scholarHtml.includes('name="citation_author"')) {
    throw new Error(`Scholar metadata missing in ${path}`);
  }
}
if (!securityTxt.includes("Canonical: https://ai-advokat.github.io/.well-known/security.txt")) {
  throw new Error("security.txt canonical URL is invalid.");
}
if (wrangler.assets?.run_worker_first !== true) {
  throw new Error("Worker must run before static assets so security headers are applied.");
}
if (!worker.includes('"Strict-Transport-Security"')) {
  throw new Error("Static asset security headers must include HSTS.");
}
if (!worker.includes('"Content-Security-Policy"')) {
  throw new Error("Static asset security headers must include CSP.");
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
