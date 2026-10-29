import fs from "node:fs";
import path from "node:path";

const workflowsDir = ".github/workflows";
const LOCAL_ONLY = "paragraf-migration-staging.yml";
const OLD_STAGING_DB = "eb560e98-9fc0-408e-9c81-9b823ffde44d";
const PRODUCTION_DB = "12ece285-74bb-4f27-a025-2dbd1be6c59a";

function fail(message) {
  console.error("STAGING CI/CD SAFETY FAIL:", message);
  process.exit(1);
}

const files = fs.readdirSync(workflowsDir)
  .filter((name) => /staging/i.test(name) && /\.ya?ml$/i.test(name))
  .sort();

if (!files.includes(LOCAL_ONLY)) fail("local-only staging validation workflow is missing");

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

console.log(`HG2-B6 STAGING CI/CD SAFETY: PASS (${files.length} staging workflows checked)`);
