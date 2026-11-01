import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/deploy-production-once.yml","utf8");
const recovery=fs.readFileSync(".github/workflows/r13-smoke-recovery-cleanup.yml","utf8");
const zro12Smoke=fs.readFileSync("scripts/zro12-live-smoke.mjs","utf8");

test("R13 release still performs the bounded production Worker deployment",()=>{
  assert.match(workflow,/npm run verify/);
  assert.match(workflow,/npm run test:security/);
  assert.match(workflow,/npm run test:legal-runtime-governance/);
  assert.match(workflow,/npm run test:gpt-activation/);
  assert.match(workflow,/npx wrangler deploy/);
  assert.match(workflow,/trigger-zro12-source-gap-r14: 2026-11-01/);
});

test("R14 release carries an exact ZRO Article 12 live regression that accepts safe source-gap behavior",()=>{
  assert.match(zro12Smoke,/Што уредува член 12 од ЗРО и кои услови ги предвидува\?/);
  assert.match(zro12Smoke,/response\.status!==200/);
  assert.match(zro12Smoke,/professional_exact_article_source_gap/);
  assert.match(zro12Smoke,/SOURCE\\\/VERSION GAP/);
  assert.match(zro12Smoke,/не избира произволно една од повеќе верзии/);
  assert.match(zro12Smoke,/AI runtime не успеа безбедно/);
  assert.match(zro12Smoke,/LIOE-RT-/);
});

test("R13 live smoke uses bounded ephemeral membership and always cleans it up",()=>{
  assert.match(workflow,/R13 Exact Article Synthetic Smoke/);
  assert.match(workflow,/datetime\('now','\+20 minutes'\)/);
  assert.match(workflow,/Cleanup ephemeral R13 Professional smoke membership/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/DELETE FROM membership_access_keys WHERE account_id='\$R13_SMOKE_ACCOUNT'/);
  assert.match(workflow,/DELETE FROM membership_accounts WHERE id='\$R13_SMOKE_ACCOUNT'/);
  assert.match(workflow,/ACCOUNT="r13-article-smoke"/);
  assert.match(recovery,/workflow_run:/);
  assert.match(recovery,/workflows: \["One-time production runtime update"\]/);
  assert.match(recovery,/membership_access_keys[\s\S]*status='revoked'/);
  assert.match(recovery,/membership_entitlements[\s\S]*status='cancelled'/);
  assert.match(recovery,/membership_accounts[\s\S]*status='cancelled'/);
});

test("R13 release does not apply migrations or mutate secrets",()=>{
  assert.doesNotMatch(workflow,/d1 migrations apply/i);
  assert.doesNotMatch(workflow,/wrangler secret put/i);
  assert.doesNotMatch(recovery,/d1 migrations apply/i);
  assert.doesNotMatch(recovery,/wrangler secret put/i);
});
