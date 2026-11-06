import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const worker=fs.readFileSync("src/index.js","utf8");
const rootSmoke=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");
const workerSmoke=fs.readFileSync(".github/workflows/worker-runtime-live-smoke.yml","utf8");

test("FREE capacity handoff failure exposes bounded provider recovery provenance",()=>{
  assert.match(worker,/providerRecovery,/);
  assert.match(worker,/providerCapacity:freeCapacityHandoff \? \{/);
  assert.match(worker,/handoffAttempted:true/);
  assert.match(worker,/handoffRecovered:providerRecovery\?\.recovered===true/);
  assert.match(worker,/fallbackProviderFailure:freeCapacityHandoff \? \{/);
  assert.match(worker,/provider:"openai"/);
  assert.match(worker,/responseStatus:typeof result\.responseStatus==="string"/);
  assert.match(worker,/retryAfterSeconds:Number\.isFinite\(Number\(result\.retryAfterSeconds\)\)/);
  assert.match(worker,/requestId:typeof result\.requestId==="string"/);
  assert.match(worker,/providerStage:typeof result\.providerStage==="string"/);
});

test("root smoke preserves non-200 chat JSON instead of curl-f discarding evidence",()=>{
  assert.match(rootSmoke,/chat_code="\$\(curl -sS --max-time 90/);
  assert.match(rootSmoke,/MAIN CHAT NON-200/);
  assert.match(rootSmoke,/providerRecovery:d\?\.providerRecovery/);
  assert.match(rootSmoke,/fallbackProviderFailure:d\?\.fallbackProviderFailure/);
  assert.match(rootSmoke,/main_chat_provider_capacity_blocked/);
  assert.match(rootSmoke,/for i in \$\(seq 1 60\); do/);
});

test("Worker smoke verifies R14 standalone bytes with deployment propagation budget",()=>{
  assert.match(workerSmoke,/Verify Worker serves exact R14 standalone frontend bytes/);
  assert.match(workerSmoke,/for attempt in \$\(seq 1 80\); do/);
  assert.match(workerSmoke,/expected_vnext=.*standalone-bot-vnext\.js/);
  assert.match(workerSmoke,/expected_vnext_css=.*standalone-bot-vnext\.css/);
  assert.match(workerSmoke,/expected_toolkit=.*standalone-bot-toolkit\.js/);
  assert.match(workerSmoke,/expected_toolkit_css=.*standalone-bot-toolkit\.css/);
  assert.match(workerSmoke,/AI_ADVOCAT_STANDALONE_TOOLKIT_PARITY_R14/);
  assert.match(workerSmoke,/WORKER R14 BYTE PARITY: PASS/);
});

test("Worker smoke preserves provider-capacity and recovery evidence on chat failure",()=>{
  assert.match(workerSmoke,/chat_code="\$\(curl -sS --max-time 120/);
  assert.match(workerSmoke,/MAIN CHAT NON-200/);
  assert.match(workerSmoke,/providerCapacity:d\?\.providerCapacity/);
  assert.match(workerSmoke,/providerRecovery:d\?\.providerRecovery/);
  assert.match(workerSmoke,/fallbackProviderFailure:d\?\.fallbackProviderFailure/);
  assert.match(workerSmoke,/chat provider capacity blocked/);
});
