import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const workflow=fs.readFileSync(".github/workflows/private-zoki-uat-activation.yml","utf8");
const runner=fs.readFileSync("scripts/run-private-zoki-staging-activation.mjs","utf8");
const cleanup=fs.readFileSync("scripts/cleanup-private-zoki-staging-activation.mjs","utf8");
const finalGate=fs.readFileSync("scripts/verify-private-zoki-one-button-result.mjs","utf8");

test("private Zoki UAT workflow is manual, exact-gated and staging-environment bound",()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/APPROVE_PRIVATE_ZOKI_STAGING_UAT/);
  assert.match(workflow,/environment: staging-uat/);
  assert.match(workflow,/node scripts\/run-private-zoki-staging-activation\.mjs/);
  assert.doesNotMatch(workflow,/push:/);
  assert.doesNotMatch(workflow,/schedule:/);
});

test("private Zoki UAT workflow uses exactly four isolated secret references",()=>{
  const names=[...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m=>m[1]);
  assert.deepEqual(new Set(names),new Set([
    "HG2_C_UAT_WORKER_TOKEN_B",
    "HG2_C_UAT_D1_TOKEN_W",
    "HG2_C_UAT_ACCESS_TOKEN_A",
    "UAT_OPENAI_API_KEY"
  ]));
});

test("orchestrator is bound to dedicated staging and rejects production identities",()=>{
  assert.match(runner,/0fee10e2bd9a2183d16eb0d73f13dfce/);
  assert.match(runner,/ai-advokat-staging/);
  assert.match(runner,/309f72b8-8711-47fc-bea7-fbd1d649561d/);
  assert.match(runner,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(runner,/ai-advokat-github-io/);
  assert.match(runner,/production identity detected in staging config/);
});

test("orchestrator protects the temporary public hostname with Access before enabling workers.dev",()=>{
  const accessApp=runner.indexOf("/access/apps");
  const enable=runner.indexOf("enabled:true,previews_enabled:false");
  assert.ok(accessApp>=0);
  assert.ok(enable>accessApp);
  assert.match(runner,/decision:"non_identity"/);
  assert.match(runner,/service_token/);
});

test("orchestrator executes canonical 20/20 UAT and persists non-secret recovery state",()=>{
  assert.match(runner,/scripts\/run-private-zoki-uat\.mjs/);
  assert.match(runner,/totalPassed!==20/);
  assert.match(runner,/private-zoki-one-button-uat-state\.json/);
  assert.match(runner,/writeJsonAtomic/);
  assert.match(runner,/UAT_PASS_PENDING_INDEPENDENT_CLEANUP/);
});

test("workflow preserves cleanup after execution timeout",()=>{
  assert.match(workflow,/timeout --signal=TERM --kill-after=60s 30m node scripts\/run-private-zoki-staging-activation\.mjs/);
  assert.match(workflow,/Independent staging cleanup/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/timeout --signal=TERM --kill-after=30s 10m node scripts\/cleanup-private-zoki-staging-activation\.mjs/);
  assert.match(workflow,/Final UAT and cleanup gate/);
});

test("cleanup attempts membership deletes independently and verifies absence",()=>{
  assert.match(cleanup,/membership cleanup /);
  assert.match(cleanup,/DELETE FROM membership_usage_monthly/);
  assert.match(cleanup,/DELETE FROM membership_access_keys/);
  assert.match(cleanup,/DELETE FROM membership_entitlements/);
  assert.match(cleanup,/DELETE FROM membership_accounts/);
  assert.match(cleanup,/for\(const \[name,fn\] of ops\)/);
  assert.match(cleanup,/verifiedAbsent/);
  assert.match(cleanup,/SELECT COUNT\(\*\) AS n FROM membership_accounts/);
});

test("cleanup restores every temporary staging capability independently",()=>{
  assert.match(cleanup,/enabled:false,previews_enabled:false/);
  assert.match(cleanup,/secrets\/OPENAI_API_KEY/);
  assert.match(cleanup,/restore baseline staging config/);
  assert.match(cleanup,/access\/apps\/\$\{id\}/);
  assert.match(cleanup,/access\/service_tokens\/\$\{id\}/);
  assert.match(cleanup,/cleanup\.errors\.length===0/);
});

test("final gate requires 20/20 plus verified cleanup and production untouched",()=>{
  assert.match(finalGate,/PASS_CLEANUP_VERIFIED/);
  assert.match(finalGate,/totalPassed\|\|0\)!==20/);
  assert.match(finalGate,/productionTouched!==false/);
  assert.match(finalGate,/cleanup errors remain/);
});

test("temporary Wrangler config stays at repository root so relative main/assets paths remain valid",()=>{
  assert.match(runner,/path\.resolve\("wrangler\.private-zoki-uat\.jsonc"\)/);
  assert.doesNotMatch(runner,/path\.resolve\("\.wrangler","private-zoki-uat/);
});

test("D1 helpers reject inner failed result batches before success can be recorded",()=>{
  for(const source of [runner,cleanup]){
    assert.match(source,/const batches=Array\.isArray\(payload\?\.result\)/);
    assert.match(source,/batch\?\.success!==true/);
    assert.match(source,/D1 query batch failed/);
  }
});

test("runner and cleanup do not print generated membership or Access secrets",()=>{
  for(const source of [runner,cleanup]){
    assert.doesNotMatch(source,/console\.(?:log|error)\([^\n]*(?:membershipKey|accessClientSecret|UAT_OPENAI_API_KEY)/);
    assert.doesNotMatch(source,/privateMembershipKey/);
  }
});
