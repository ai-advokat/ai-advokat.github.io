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

test("private Zoki UAT workflow uses exactly three isolated external secret references",()=>{
  const names=[...workflow.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(m=>m[1]);
  assert.deepEqual(new Set(names),new Set([
    "HG2_C_UAT_WORKER_TOKEN_B",
    "HG2_C_UAT_D1_TOKEN_W",
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

test("orchestrator protects the temporary public hostname with an ephemeral Worker ingress secret before enabling workers.dev",()=>{
  const ingress=runner.indexOf('name:"UAT_INGRESS_TOKEN"');
  const enable=runner.indexOf("enabled:true,previews_enabled:false");
  assert.ok(ingress>=0);
  assert.ok(enable>ingress);
  assert.match(runner,/randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(runner,/X-AI-Advokat-UAT-Token/);
  assert.doesNotMatch(runner,/\/access\/apps/);
  assert.doesNotMatch(runner,/\/access\/service_tokens/);
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
  assert.match(workflow,/timeout --signal=TERM --kill-after=30s 15m node scripts\/cleanup-private-zoki-staging-activation\.mjs/);
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
  assert.match(cleanup,/secrets\/UAT_INGRESS_TOKEN/);
  assert.match(cleanup,/restore baseline staging config/);
  assert.doesNotMatch(cleanup,/access\/apps/);
  assert.doesNotMatch(cleanup,/access\/service_tokens/);
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

test("runner and cleanup do not print generated membership or ingress/provider secrets",()=>{
  for(const source of [runner,cleanup]){
    assert.doesNotMatch(source,/console\.(?:log|error)\([^\n]*(?:membershipKey|uatIngressToken|UAT_INGRESS_TOKEN|UAT_OPENAI_API_KEY)/);
    assert.doesNotMatch(source,/privateMembershipKey/);
  }
});

test("cleanup operation budgets fit inside the independent cleanup window",()=>{
  assert.match(workflow,/timeout-minutes: 50/);
  assert.match(workflow,/kill-after=30s 15m node scripts\/cleanup-private-zoki-staging-activation\.mjs/);
  assert.match(cleanup,/timeoutMs=15000/);
  assert.match(cleanup,/attempts=2/);
  assert.match(cleanup,/timeout:90000/);
  assert.match(cleanup,/QUIESCENCE_MS=180000/);
  assert.match(cleanup,/delete UAT telemetry batch/);
});


test("UAT workflow dispatches only from main and checks out the immutable dispatch SHA",()=>{
  assert.match(workflow,/if: \$\{\{ github\.repository == 'ai-advokat\/ai-advokat\.github\.io' && github\.ref == 'refs\/heads\/main' \}\}/);
  assert.match(workflow,/with:\s*\n\s*ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow,/test "\$GITHUB_REF" = "refs\/heads\/main"/);
});

test("UAT tooling install is lockfile-based and has no job-wide staging secrets",()=>{
  assert.match(workflow,/npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow,/npm ls wrangler@4\.156\.0 --depth=0/);
  assert.ok(fs.existsSync("package-lock.json"));
  const lock=JSON.parse(fs.readFileSync("package-lock.json","utf8"));
  assert.equal(lock.lockfileVersion,3);
  assert.equal(lock.packages?.["node_modules/wrangler"]?.version,"4.156.0");
  assert.match(String(lock.packages?.["node_modules/wrangler"]?.integrity||""),/^sha512-/);

  const jobEnvBlock=workflow.match(/\n    env:\n([\s\S]*?)\n\n    steps:/)?.[1]||"";
  for(const name of [
    "HG2_C_UAT_WORKER_TOKEN_B",
    "HG2_C_UAT_D1_TOKEN_W",
    "UAT_OPENAI_API_KEY"
  ]){
    assert.doesNotMatch(jobEnvBlock,new RegExp(name));
  }
  assert.match(workflow,/Run bounded remote staging UAT[\s\S]*HG2_C_UAT_WORKER_TOKEN_B:[\s\S]*UAT_OPENAI_API_KEY:/);
  assert.match(workflow,/Independent staging cleanup[\s\S]*HG2_C_UAT_WORKER_TOKEN_B:[\s\S]*HG2_C_UAT_D1_TOKEN_W:/);
  assert.doesNotMatch(workflow,/HG2_C_UAT_ACCESS_TOKEN_A/);
});


test("private UAT paces authenticated scenarios and honors Retry-After",()=>{
  const uatRunner=fs.readFileSync("scripts/run-private-zoki-uat.mjs","utf8");
  assert.match(uatRunner,/membershipMinGapMs/);
  assert.match(uatRunner,/13000/);
  assert.match(uatRunner,/paceMembershipRequest/);
  assert.match(uatRunner,/response\.status!==429/);
  assert.match(uatRunner,/retry-after/);
  assert.match(uatRunner,/RATE_LIMIT/);
});

test("cleanup revokes external access before membership cleanup and verifies usage absence",()=>{
  const disableAt=cleanup.indexOf("disable workers.dev");
  const ingressAt=cleanup.indexOf("remove staging UAT ingress secret");
  const membershipAt=cleanup.indexOf('membership cleanup "+name');
  assert.ok(disableAt>=0);
  assert.ok(ingressAt>disableAt);
  assert.ok(membershipAt>ingressAt);
  assert.match(cleanup,/QUIESCENCE_MS=180000/);
  assert.match(cleanup,/membership_usage_monthly WHERE subject_key=\?/);
  assert.match(cleanup,/final usage sweep/);
  assert.match(cleanup,/SELECT COUNT\(\*\) AS n FROM membership_usage_monthly/);
  assert.match(cleanup,/requestPathRevokedBeforeMembershipCleanup===true/);
});


test("UAT checkout is pinned to the immutable dispatch SHA",()=>{
  assert.match(workflow,/ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow,/test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.doesNotMatch(workflow,/ref: main/);
});


test("cleanup removes and verifies temporary UAT rate-limit state",()=>{
  assert.match(cleanup,/DELETE FROM security_rate_limit_windows WHERE subject_key=\?/);
  assert.match(cleanup,/SELECT COUNT\(\*\) AS n FROM security_rate_limit_windows WHERE subject_key=\?/);
  assert.match(cleanup,/rateLimits:false/);
  assert.match(cleanup,/rateLimits:true/);
});


test("private UAT keeps required LIOE telemetry enabled and makes it ephemeral",()=>{
  const uatRunner=fs.readFileSync("scripts/run-private-zoki-uat.mjs","utf8");
  assert.match(runner,/LIOE_RUNTIME_TELEMETRY_ENABLED:"true"/);
  assert.doesNotMatch(runner,/LIOE_RUNTIME_TELEMETRY_ENABLED:"false"/);
  assert.match(uatRunner,/private-zoki-uat-progress\.json/);
  assert.match(uatRunner,/governanceRunIds/);
  assert.match(uatRunner,/payload\?\.governanceRunId/);
  assert.match(runner,/telemetryWindowStartedAt/);
  assert.match(runner,/telemetryWindowEndedAt/);
  assert.match(cleanup,/DELETE FROM lioe_runtime_runs WHERE run_id IN/);
  assert.match(cleanup,/SELECT COUNT\(\*\) AS n FROM lioe_runtime_runs WHERE run_id IN/);
  assert.match(cleanup,/SELECT run_id FROM lioe_runtime_runs WHERE started_at >= \? AND started_at <= \?/);
  assert.match(cleanup,/windowVerifiedEmpty/);
});


test("final cleanup gate requires ephemeral telemetry removal as well as membership removal",()=>{
  assert.match(cleanup,/cleanup\.telemetry\.verifiedAbsent===true/);
  assert.match(cleanup,/cleanup\.telemetry\.windowVerifiedEmpty===true/);
  assert.match(cleanup,/capturedRunIds/);
  assert.match(cleanup,/windowRunIds/);
  assert.match(cleanup,/deletedRunIds/);
});


test("runtime fails closed on private staging UAT without the ephemeral ingress token",()=>{
  const source=fs.readFileSync("src/index.js","utf8");
  assert.match(source,/OPENAI_PROVIDER_ACTIVATION_STATE !== "staging_private_uat_only"/);
  assert.match(source,/UAT_INGRESS_TOKEN/);
  assert.match(source,/X-AI-Advokat-UAT-Token/);
  assert.match(source,/uat_ingress_denied/);
});
