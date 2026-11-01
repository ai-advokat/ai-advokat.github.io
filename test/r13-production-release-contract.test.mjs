import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/deploy-production-once.yml","utf8");

test("R13 release still performs the bounded production Worker deployment",()=>{
  assert.match(workflow,/npm run verify/);
  assert.match(workflow,/npm run test:security/);
  assert.match(workflow,/npm run test:legal-runtime-governance/);
  assert.match(workflow,/npm run test:gpt-activation/);
  assert.match(workflow,/npx wrangler deploy/);
  assert.match(workflow,/trigger-exact-article-fallback-r13: 2026-11-01/);
});

test("R13 release live-smokes the exact ZRO Article 12 Professional request",()=>{
  assert.match(workflow,/Што уредува член 12 од ЗРО и кои услови ги предвидува\?/);
  assert.match(workflow,/test "\$code" = "200"/);
  assert.match(workflow,/legalSources\.length<1/);
  assert.match(workflow,/canonical_corpus_no_model/);
  assert.match(workflow,/SOURCE_BACKED_PROVIDER_FALLBACK/);
  assert.match(workflow,/Current-law Human Gate not required/);
  assert.match(workflow,/LIVE PROFESSIONAL ZRO ARTICLE 12: PASS/);
});

test("R13 live smoke uses bounded ephemeral membership and always cleans it up",()=>{
  assert.match(workflow,/R13 Exact Article Synthetic Smoke/);
  assert.match(workflow,/datetime\('now','\+20 minutes'\)/);
  assert.match(workflow,/Cleanup ephemeral R13 Professional smoke membership/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/DELETE FROM membership_access_keys WHERE account_id='\$R13_SMOKE_ACCOUNT'/);
  assert.match(workflow,/DELETE FROM membership_accounts WHERE id='\$R13_SMOKE_ACCOUNT'/);
});

test("R13 release does not apply migrations or mutate secrets",()=>{
  assert.doesNotMatch(workflow,/d1 migrations apply/i);
  assert.doesNotMatch(workflow,/wrangler secret put/i);
});
