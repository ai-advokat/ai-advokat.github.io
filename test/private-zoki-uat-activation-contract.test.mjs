import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const workflow=fs.readFileSync(".github/workflows/private-zoki-uat-activation.yml","utf8");
const runner=fs.readFileSync("scripts/run-private-zoki-staging-activation.mjs","utf8");

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

test("orchestrator executes canonical 20/20 UAT and always contains cleanup paths",()=>{
  assert.match(runner,/scripts\/run-private-zoki-uat\.mjs/);
  assert.match(runner,/totalPassed!==20/);
  assert.match(runner,/DELETE FROM membership_access_keys/);
  assert.match(runner,/DELETE FROM membership_entitlements/);
  assert.match(runner,/DELETE FROM membership_accounts/);
  assert.match(runner,/secrets\/OPENAI_API_KEY/);
  assert.match(runner,/enabled:false,previews_enabled:false/);
  assert.match(runner,/restore baseline staging config/);
  assert.match(runner,/access\/service_tokens\/\$\{serviceTokenId\}/);
});

test("orchestrator does not print generated membership or Access secrets",()=>{
  assert.doesNotMatch(runner,/console\.(?:log|error)\([^\n]*(?:membershipKey|accessClientSecret|UAT_OPENAI_API_KEY)/);
  assert.doesNotMatch(runner,/privateMembershipKey/);
});
