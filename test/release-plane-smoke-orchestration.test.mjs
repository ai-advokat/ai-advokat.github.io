import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Professional smoke executes the provider-capacity classifier and repository suite retains its regression tests",()=>{
  const y=fs.readFileSync(".github/workflows/professional-bot-live-smoke.yml","utf8");
  const classifierTest=fs.readFileSync("test/professional-smoke-capacity-gate.test.mjs","utf8");
  assert.match(y,/scripts\/professional-smoke-capacity-gate\.mjs/);
  assert.match(classifierTest,/classifyProfessionalProviderCapacity/);
  assert.match(classifierTest,/does not downgrade unknown 503 failures/);
});


test("Professional smoke is a latest-wins post-deploy production check",()=>{
  const y=fs.readFileSync(".github/workflows/professional-bot-live-smoke.yml","utf8");
  assert.match(y,/workflow_run:/);
  assert.match(y,/AI Advokat production runtime sync/);
  assert.match(y,/types: \[completed\]/);
  assert.match(y,/workflow_run\.conclusion == 'success'/);
  assert.match(y,/workflow_run\.head_sha/);
  assert.match(y,/cancel-in-progress: true/);
  assert.match(y,/environment: production/);
  assert.doesNotMatch(y,/push:\s*\n\s*branches: \["main"\]/);
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

  // Pages is deliberately stronger than an allowlist: every main commit is synced.
  assert.match(pages,/push:\n\s+branches: \["main"\]/);
  assert.doesNotMatch(pages,/branches: \["main"\]\n\s+paths:/);

  // Production deploy remains path-bounded, so every release-plane workflow that
  // can change post-deploy acceptance must still trigger the runtime sync.
  for(const path of [
    ".github/workflows/worker-runtime-live-smoke.yml",
    ".github/workflows/free-runtime-live-uat.yml",
    ".github/workflows/root-reliability-live-smoke.yml",
    ".github/workflows/professional-bot-live-smoke.yml",
    ".github/workflows/professional-l23-resilience-live-smoke.yml",
    ".github/workflows/production-runtime-sync.yml",
    ".github/workflows/sync-pages-runtime.yml",
    ".github/workflows/case-law-evidence-gates-production-activation.yml"
  ]){
    assert.ok(production.includes('"'+path+'"'),"Production sync missing "+path);
  }
});

test("Pages sync publishes exact source-main SHA marker",()=>{
  const y=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
  assert.match(y,/pages-release\.txt/);
  assert.match(y,/source_main_sha=%s/);
  assert.match(y,/test "\$pages_release" = "\$GITHUB_SHA"/);
});


test("Production sync is retriggered by the exact 0053 schema dependency",()=>{
  const production=fs.readFileSync(".github/workflows/production-runtime-sync.yml","utf8");
  assert.match(production,/migrations\/0053_case_law_evidence_gates\.sql/);
  assert.match(production,/case-law-evidence-gates-production-activation\.yml/);
});
