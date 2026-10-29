import fs from "node:fs";
import path from "node:path";

const workflowsDir = ".github/workflows";
const LOCAL_ONLY = "paragraf-migration-staging.yml";
const OLD_STAGING_DB = "eb560e98-9fc0-408e-9c81-9b823ffde44d";
const OLD_STAGING_NAME = "ai-advokat-db-staging";
const PRODUCTION_DB = "12ece285-74bb-4f27-a025-2dbd1be6c59a";
const LEGACY_LOCKED = [
  "case-files-r2-provision.yml",
  "case-files-storage-activation.yml",
  "five-publications-d1.yml",
  "law-corpus-batch2-staging-import.yml",
  "law-intake-batch1-staging.yml",
  "open-legal-sources-runtime-activation.yml",
  "paragraf-staging-compat-v9.yml",
  "staging-d1-activation.yml",
  "staging-d1-diagnostics.yml",
  "staging-legacy-version-binding.yml",
  "zi-258-source-parity-audit.yml",
  "zi-staging-import.yml",
  "zkp-metadata-correction-staging.yml",
  "zkp-staging-import.yml",
  "zro-human-gate-review-packets.yml",
  "zro-production-preflight.yml",
  "zro-production-schema-convergence.yml"
];

function fail(message) {
  console.error("STAGING CI/CD SAFETY FAIL:", message);
  process.exit(1);
}

const allFiles = fs.readdirSync(workflowsDir)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();

const files = allFiles.filter((name) => /staging/i.test(name));

if (!files.includes(LOCAL_ONLY)) fail("local-only staging validation workflow is missing");

for (const name of allFiles) {
  const text = fs.readFileSync(path.join(workflowsDir, name), "utf8");
  if (text.includes(OLD_STAGING_DB)) fail(`${name} contains obsolete staging D1 UUID`);
  if (text.includes(OLD_STAGING_NAME)) fail(`${name} contains obsolete staging D1 name`);
}

for (const name of LEGACY_LOCKED) {
  if (!allFiles.includes(name)) fail(`locked legacy workflow missing: ${name}`);
  const text = fs.readFileSync(path.join(workflowsDir, name), "utf8");
  if (!text.includes("[HG2-C LOCKED]")) fail(`${name} must remain visibly HG2-C locked`);
  if (!text.includes("exit 2")) fail(`${name} must fail closed when manually dispatched`);
  for (const forbidden of ["CLOUDFLARE_API_TOKEN","CLOUDFLARE_ACCOUNT_ID","secrets.","--remote","wrangler deploy"]) {
    if (text.includes(forbidden)) fail(`${name} contains forbidden remote capability: ${forbidden}`);
  }
  if (/^\s*push\s*:/m.test(text)) fail(`${name} must not have an automatic push trigger before HG2-C`);
}

for (const name of files) {
  const text = fs.readFileSync(path.join(workflowsDir, name), "utf8");
  const forbidden = [
    ["obsolete staging D1 UUID", OLD_STAGING_DB],
    ["production D1 UUID", PRODUCTION_DB],
    ["Cloudflare API token reference", "CLOUDFLARE_API_TOKEN"],
    ["Cloudflare account-id reference", "CLOUDFLARE_ACCOUNT_ID"],
    ["GitHub secret reference", "secrets."],
    ["remote Wrangler flag", "--remote"],
    ["Worker deploy command", "wrangler deploy"]
  ];
  for (const [label, needle] of forbidden) {
    if (text.includes(needle)) fail(`${name} contains ${label}`);
  }
  if (/^\s*push\s*:/m.test(text)) fail(`${name} must not have an automatic push trigger before HG2-C`);

  if (name === LOCAL_ONLY) {
    if (!text.includes("db:migrate:staging:local")) fail("local-only staging workflow must execute the local migration dry-run");
    continue;
  }

  if (!text.includes("[HG2-C LOCKED]")) fail(`${name} must be visibly HG2-C locked`);
  if (!text.includes("exit 2")) fail(`${name} must fail closed when manually dispatched`);
}

console.log(`HG2-B6 STAGING CI/CD SAFETY: PASS (${allFiles.length} workflows scanned; ${files.length} staging-named workflows checked; ${LEGACY_LOCKED.length} legacy paths locked)`);
