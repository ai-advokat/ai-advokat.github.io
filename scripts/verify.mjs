import fs from "node:fs";

const required = [
  "index.html",
  "assets/analytics.js",
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
  "ingest/publications.csv",
  "src/legal-intelligence-engine.js",
  "data/legal-intelligence-engine-v1.json",
  "data/legal-intelligence-excellence-v1.json",
  "data/legal-intelligence-evaluation-suite.json",
  "data/legal-intelligence-metrics-baseline.json",
  "data/legal-runs/legal-run-record.schema.json",
  "data/legal-runs/index.json",
  "scripts/evaluate-legal-intelligence-engine.mjs",
  "scripts/validate-legal-run-records.mjs",
  "architecture/AI_ADVOKAT_LEGAL_INTELLIGENCE_ENGINE.md",
  "src/case-export.js",
  "assets/casepilot-export.js",
  "docs/standards/AI_ADVOKAT_LEGAL_RUN_RECORD_PROTOCOL_v1.md",
  "src/legal-runtime-governance.js",
  "test/legal-runtime-governance.test.mjs",
  "migrations/0028_lioe_runtime_telemetry.sql",
  "migrations/0030_case_law_source_graph_v2.sql",
  "data/guides-current-law-review-2026-10-10.json",
  "data/case-law-source-registry-2026.json",
  "scripts/case-law-ndjson-to-sql.mjs",
  "ingest/case_law.ndjson.example"
];

for (const path of required) {
  if (!fs.existsSync(path)) throw new Error(`Missing required file: ${path}`);
}

const wrangler = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
const stagingWrangler = JSON.parse(fs.readFileSync("wrangler.staging.jsonc", "utf8"));
const siteKeyPattern = /^[0-9A-Za-z_-]{8,128}$/;
const prodSiteKey = wrangler.vars?.TURNSTILE_SITE_KEY;
const stagingSiteKey = stagingWrangler.vars?.TURNSTILE_SITE_KEY;
if (!siteKeyPattern.test(prodSiteKey || "")) throw new Error("Production TURNSTILE_SITE_KEY missing or malformed in wrangler.jsonc vars.");
if (stagingSiteKey !== prodSiteKey) throw new Error("Staging and production TURNSTILE_SITE_KEY must match.");
for (const cfg of [wrangler, stagingWrangler]) {
  for (const name of ["TURNSTILE_SECRET", "RATE_LIMIT_SALT"]) {
    if (cfg.vars && name in cfg.vars) throw new Error(`${name} must be a secret, never a plain var.`);
  }
}
if (wrangler.vars && "TURNSTILE_ALLOWED_HOSTNAMES" in wrangler.vars) {
  throw new Error("Production must not widen Turnstile hostnames; use CORS origins.");
}
const previewMigrations = JSON.parse(fs.readFileSync("wrangler.preview-migrations.jsonc", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const worker = fs.readFileSync("src/index.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const robots = fs.readFileSync("robots.txt", "utf8");
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
const sitemapTxt = fs.readFileSync("sitemap.txt", "utf8");
const securityTxt = fs.readFileSync(".well-known/security.txt", "utf8");
const analytics = fs.readFileSync("assets/analytics.js", "utf8");

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
for (const [name,expected] of Object.entries({
  LIOE_RUNTIME_GOVERNANCE_ENABLED:"true",
  LIOE_POSTFLIGHT_ENABLED:"true",
  LIOE_RUNTIME_TELEMETRY_ENABLED:"true",
  LIOE_SPECIALIST_EXECUTION_ENABLED:"true"
})) {
  if (wrangler.vars?.[name] !== expected) throw new Error(`${name} must be armed as ${expected}.`);
}

if (html.includes("zenodo.org/uploads/")) {
  throw new Error("Private Zenodo upload URL exposed in public index.html.");
}
if (!html.includes('rel="canonical" href="https://ai-advokat.github.io/"')) {
  throw new Error("Canonical URL is missing.");
}
if (!html.includes('http-equiv="Content-Security-Policy"')) {
  throw new Error("HTML CSP fallback is missing.");
}
if (!analytics.includes("G-4F0STVL2EF")) {
  throw new Error("Google Analytics measurement ID is missing.");
}
if (!analytics.includes('analytics_storage: initialConsent === "granted" ? "granted" : "denied"')) {
  throw new Error("Analytics consent default is missing.");
}
for (const path of [
  "index.html",
  "scholar/index.html",
  "scholar/sindzir/index.html",
  "scholar/electronic-ai-evidence/index.html",
  "scholar/mobile-phone-privilege/index.html",
  "scholar/ai-legal-practice-judiciary/index.html"
]) {
  const page = fs.readFileSync(path, "utf8");
  if (!page.includes('/assets/analytics.js')) {
    throw new Error(`Analytics loader missing in ${path}`);
  }
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
const aiLegalScholar = fs.readFileSync("scholar/ai-legal-practice-judiciary/index.html", "utf8");
if (!aiLegalScholar.includes("10.5281/zenodo.23023442") || !aiLegalScholar.includes("https://zenodo.org/records/23023442")) {
  throw new Error("Published AI legal-practice Scholar record is not fully linked.");
}
const mobileScholar = fs.readFileSync("scholar/mobile-phone-privilege/index.html", "utf8");
if (!mobileScholar.includes("10.5281/zenodo.23021388") || !mobileScholar.includes("https://zenodo.org/records/23021388")) {
  throw new Error("Published mobile-phone Scholar record is not fully linked.");
}
if (!mobileScholar.includes('name="citation_pdf_url"')) {
  throw new Error("Published mobile-phone Scholar record must expose citation_pdf_url.");
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
if (!worker.includes("https://www.googletagmanager.com") || !worker.includes("https://www.google-analytics.com")) {
  throw new Error("Worker CSP must allow consented Google Analytics traffic.");
}

if (!worker.includes('publicMode: "read_only"')) {
  throw new Error("Worker must declare read-only public mode.");
}
if (!worker.includes('documentUpload: caseWorkspaceStorageReady(env) && caseSchemaReady')) {
  throw new Error("Document upload capability must remain dynamically locked behind case-scoped private storage.");
}
if (!worker.includes('caseWorkspace: caseRuntime')) {
  throw new Error("Case workspace capability must be runtime-gated.");
}
if (!worker.includes('case_workspace_membership_required') || !worker.includes("a.account_id=? AND a.status='active'")) {
  throw new Error("Case workspace must require authenticated membership and per-case account authorization.");
}
if (!worker.includes("Global confidential upload is disabled.")) {
  throw new Error("Global confidential document upload must remain disabled.");
}
if (wrangler.r2_buckets) {
  throw new Error("Private CASE_FILES object storage must remain unbound until the separate storage activation gate.");
}
if (wrangler.ai) {
  throw new Error("Production wrangler.jsonc must not bind Workers AI before governed production activation.");
}
if (!worker.includes('workersAI: env.AI ? "bound" : "not_bound"')) {
  throw new Error("Worker must report Workers AI binding state dynamically.");
}
if (!worker.includes('vectorize: "not_bound"')) {
  throw new Error("Vectorize must remain disabled in this release.");
}

console.log("AI Advokat structural verification: PASS");


if (!worker.includes('caseExports: caseSchemaReady ? "md_docx_live_pdf_browser_rendered_human_gate_bound" : "locked"')) {
  throw new Error("Case export capability must remain Human-Gate bound and schema-gated.");
}
if (!worker.includes('case_export_professional_human_gate_evidence_missing')) {
  throw new Error("Professional CasePilot export must fail closed without recorded Human Gate evidence.");
}
if (!worker.includes('browser_local_pdf_rendering_no_external_service')) {
  throw new Error("CasePilot PDF must remain local-browser rendered without an external PDF service.");
}


const guideReview = JSON.parse(fs.readFileSync("data/guides-current-law-review-2026-10-10.json","utf8"));
if (guideReview.counts.active_verified !== 5 || guideReview.counts.active_with_warning !== 3 || guideReview.counts.review_required !== 29) {
  throw new Error("Guide current-law activation counts changed without a reviewed manifest update.");
}
const caseLawSources = JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const paragrafLane = caseLawSources.sources.find((x) => x.id === "paragraf-mk");
if (!paragrafLane || paragrafLane.ingest !== "link_only_without_license") {
  throw new Error("Paragraf licensed-secondary boundary is missing.");
}
for (const forbidden of ["credential_bypass","session_hijack","paywall_bypass","automated_copy_of_restricted_database"]) {
  if (!paragrafLane.forbidden?.includes(forbidden)) throw new Error("Missing Paragraf safety boundary: "+forbidden);
}


if (!worker.includes("SOURCE_ROLE: OFFICIAL_REVIEWED_CASE_LAW")
    || !worker.includes("s.source_status='official'")
    || !worker.includes("cla.human_review_status IN ('approved','reviewed')")
    || !worker.includes("cl.human_review_status IN ('approved','reviewed')")) {
  throw new Error("Governed case-law context must require official reviewed sources and authority.");
}
if (!worker.includes("CASE_LAW_IS_NOT_STATUTORY_TEXT: true")) {
  throw new Error("Case-law context must remain explicitly distinct from statutory text.");
}


const caseLawImporter = fs.readFileSync("scripts/case-law-ndjson-to-sql.mjs","utf8");
if (!caseLawImporter.includes("Credential/session field is forbidden")
    || !caseLawImporter.includes("licensed_secondary_export")
    || !caseLawImporter.includes("authorized_export=true")
    || !caseLawImporter.includes("human_review_status")
    || !caseLawImporter.includes("'pending'")) {
  throw new Error("Case-law importer credential boundary is missing or import is not fail-closed.");
}
if (caseLawImporter.includes("document.cookie") || caseLawImporter.includes("Authorization: Bearer")) {
  throw new Error("Case-law importer must never contain credential/session acquisition logic.");
}
