import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const workflow=fs.readFileSync(".github/workflows/production-runtime-sync.yml","utf8");

test("production runtime sync is push-triggered for runtime surfaces and Human-Gated",()=>{
  for(const path of [
    '"*"',
    '".well-known/**"',
    '"academy/**"',
    '"assets/**"',
    '"authors/**"',
    '"books/**"',
    '"bot/**"',
    '"casepilot/**"',
    '"consolidator/**"',
    '"data/**"',
    '"guides/**"',
    '"kolumni/**"',
    '"membership/**"',
    '"mvp-v2/**"',
    '"partners/**"',
    '"professional-library/**"',
    '"release/**"',
    '"scholar/**"',
    '"sluzben-vesnik/**"',
    '"src/**"',
    '"staging/**"',
    '"summit/**"',
    '"uat/**"',
    '".github/workflows/production-runtime-sync.yml"'
  ]) assert.ok(workflow.includes(path),"missing trigger "+path);
  assert.match(workflow,/environment: production/);
  assert.match(workflow,/concurrency:\n  group: ai-advokat-production-runtime-sync/);
});

test("production runtime sync targets the exact Worker and deploys through wrangler only after verification",()=>{
  assert.match(workflow,/if\(c\.name!=="ai-advokat-github-io"\)/);
  assert.match(workflow,/database_id!=="12ece285-74bb-4f27-a025-2dbd1be6c59a"/);
  assert.match(workflow,/OPENAI_PROVIDER_ACTIVATION_STATE!=="governed_openai_primary_workers_ai_fallback"/);
  assert.match(workflow,/npm run verify/);
  assert.match(workflow,/npm run test:security/);
  assert.match(workflow,/npx wrangler deploy --config wrangler\.jsonc/);
});

test("production runtime sync cannot mutate D1 or secrets",()=>{
  assert.doesNotMatch(workflow,/wrangler\s+d1\s+(execute|migrations|export)/i);
  assert.doesNotMatch(workflow,/secret\s+put/i);
  assert.doesNotMatch(workflow,/membership_accounts/i);
  assert.doesNotMatch(workflow,/DELETE\s+FROM/i);
  assert.doesNotMatch(workflow,/INSERT\s+INTO/i);
  assert.doesNotMatch(workflow,/UPDATE\s+/i);
});

test("production runtime sync verifies exact R14 standalone release bytes",()=>{
  for(const asset of [
    "bot/index.html",
    "assets/standalone-bot.js",
    "assets/standalone-bot-vnext.js",
    "assets/standalone-bot-vnext.css",
    "assets/standalone-bot-toolkit.js",
    "assets/standalone-bot-toolkit.css"
  ]) assert.ok(workflow.includes("sha256sum "+asset),"missing byte parity for "+asset);
  assert.match(workflow,/for attempt in \$\(seq 1 80\); do/);
  assert.match(workflow,/\[ "\$live_vnext_css" = "\$expected_vnext_css" \]/);
  assert.match(workflow,/PRODUCTION WORKER R14 BYTE PARITY: PASS/);
  assert.match(workflow,/AI_ADVOCAT_STANDALONE_TOOLKIT_PARITY_R14/);
});

test("production runtime sync verifies health orchestration, bounded TRAINING and Secure Case boundary",()=>{
  assert.match(workflow,/\/api\/health\?runtime_sync=/);
  assert.match(workflow,/\/api\/orchestrator\?runtime_sync=/);
  assert.match(workflow,/lioeRuntimeGovernance/);
  assert.match(workflow,/lioePostflight/);
  assert.match(workflow,/lioeSpecialistExecution/);
  assert.match(workflow,/\$BASE\/api\/bot/);
  assert.match(workflow,/test "\$code" = "200"/);
  assert.match(workflow,/\.mode == "training"/);
  assert.match(workflow,/\.membership\.planCode == "training"/);
  assert.match(workflow,/\.membership\.trainingOpen == true/);
  assert.match(workflow,/\.privacy\.providerCalled == false/);
  assert.match(workflow,/\.privacy\.quotaConsumed == false/);
  assert.match(workflow,/test "\$secure_code" = "422"/);
  assert.match(workflow,/confidential_case_workspace_required/);
});
