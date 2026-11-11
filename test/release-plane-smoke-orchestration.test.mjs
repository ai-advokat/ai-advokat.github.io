import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Professional smoke retriggers when provider-capacity classifier changes",()=>{
  const y=fs.readFileSync(".github/workflows/professional-bot-live-smoke.yml","utf8");
  assert.match(y,/scripts\/professional-smoke-capacity-gate\.mjs/);
  assert.match(y,/test\/professional-smoke-capacity-gate\.test\.mjs/);
});

test("Root reliability waits for successful production sync and then verifies Pages parity",()=>{
  const y=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");
  assert.match(y,/workflow_run:/);
  assert.match(y,/AI Advokat production runtime sync/);
  assert.match(y,/types: \[completed\]/);
  assert.match(y,/workflow_run\.conclusion == 'success'/);
  assert.match(y,/workflow_run\.head_sha/);
  assert.match(y,/EXPECTED_RELEASE_SHA/);
  assert.match(y,/pages-release\.txt/);
  assert.match(y,/source_main_sha=\$EXPECTED_RELEASE_SHA/);
  assert.doesNotMatch(y,/push:\s*\n\s*branches: \["main"\]/);
});



test("Worker and FREE live validation cannot race the Human-Gated production deploy",()=>{
  const worker=fs.readFileSync(".github/workflows/worker-runtime-live-smoke.yml","utf8");
  const free=fs.readFileSync(".github/workflows/free-runtime-live-uat.yml","utf8");
  for(const y of [worker,free]){
    assert.match(y,/workflow_run:/);
    assert.match(y,/AI Advokat production runtime sync/);
    assert.match(y,/types: \[completed\]/);
    assert.match(y,/workflow_run\.conclusion == 'success'/);
    assert.match(y,/workflow_run\.head_sha/);
  }
  assert.doesNotMatch(worker,/push:\s*\n\s*branches: \["main"\]/);
  assert.doesNotMatch(free,/push:\s*\n\s*branches: \["main"\]/);
});

test("Root reliability enforces Training Open and confidential Secure Case boundary",()=>{
  const y=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");
  assert.match(y,/test "\$code" = "200"/);
  assert.match(y,/\.mode == "training"/);
  assert.match(y,/\.membership\.planCode == "training"/);
  assert.match(y,/\.membership\.trainingOpen == true/);
  assert.match(y,/test "\$secure_code" = "422"/);
  assert.match(y,/confidential_case_workspace_required/);
});

test("Critical release-plane workflow changes publish the same SHA to Pages and production runtime",()=>{
  const pages=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
  const production=fs.readFileSync(".github/workflows/production-runtime-sync.yml","utf8");
  for(const path of [
    ".github/workflows/worker-runtime-live-smoke.yml",
    ".github/workflows/free-runtime-live-uat.yml",
    ".github/workflows/root-reliability-live-smoke.yml",
    ".github/workflows/production-runtime-sync.yml",
    ".github/workflows/sync-pages-runtime.yml"
  ]){
    assert.ok(pages.includes('"'+path+'"'),"Pages sync missing "+path);
    assert.ok(production.includes('"'+path+'"'),"Production sync missing "+path);
  }
});

test("Pages sync publishes exact source-main SHA marker",()=>{
  const y=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
  assert.match(y,/pages-release\.txt/);
  assert.match(y,/source_main_sha=%s/);
  assert.match(y,/test "\$pages_release" = "\$GITHUB_SHA"/);
});
