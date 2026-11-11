import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/worker-runtime-live-smoke.yml","utf8");

test("Worker live smoke runs only after successful production runtime sync",()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/AI Advokat production runtime sync/);
  assert.match(workflow,/types: \[completed\]/);
  assert.match(workflow,/workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/workflow_run\.head_sha/);
  assert.match(workflow,/EXPECTED_RELEASE_SHA/);
  assert.doesNotMatch(workflow,/push:\s*\n\s*branches: \["main"\]/);
});

test("Worker live smoke waits for exact deployed byte parity",()=>{
  assert.match(workflow,/for attempt in \$\(seq 1 80\)/);
  assert.match(workflow,/sha256sum bot\/index\.html/);
  assert.match(workflow,/sha256sum echr-crosswalk\.html/);
  assert.match(workflow,/\/api\/hybrid\/echr-crosswalk\?q=B20/);
  assert.match(workflow,/sha256sum assets\/standalone-bot\.js/);
  assert.match(workflow,/sha256sum assets\/standalone-bot-vnext\.js/);
  assert.match(workflow,/sha256sum assets\/standalone-bot-vnext\.css/);
  assert.match(workflow,/sha256sum assets\/standalone-bot-toolkit\.js/);
  assert.match(workflow,/sha256sum assets\/standalone-bot-toolkit\.css/);
  assert.match(workflow,/sha256sum assets\/chat-privacy-browser\.js/);
  assert.match(workflow,/sha256sum src\/chat-privacy\.js/);
  assert.match(workflow,/WORKER R14 BYTE PARITY: PASS/);
  assert.match(workflow,/test "\$deployed" = "1"/);
});

test("Worker live smoke proves legacy core-r10 self-heals to core-r15",()=>{
  assert.match(workflow,/release=core-r10/);
  assert.match(workflow,/release=core-r15/);
  assert.match(workflow,/clear-site-data: "cache"/);
  assert.match(workflow,/x-ai-advokat-release: core-r15/);
  assert.match(workflow,/LEGACY CORE-R10 SELF-HEAL REDIRECT: PASS/);
});


test("Worker live smoke proves legacy core-r12 also self-heals to core-r15",()=>{
  assert.match(workflow,/\$BASE\/bot\/\?release=core-r12/);
  assert.match(workflow,/LEGACY CORE-R12 SELF-HEAL REDIRECT: PASS/);
  assert.match(workflow,/worker-legacy-r12-release-headers\.txt/);
});
