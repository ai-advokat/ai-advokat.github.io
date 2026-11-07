import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Professional smoke retriggers when provider-capacity classifier changes",()=>{
  const y=fs.readFileSync(".github/workflows/professional-bot-live-smoke.yml","utf8");
  assert.match(y,/scripts\/professional-smoke-capacity-gate\.mjs/);
  assert.match(y,/test\/professional-smoke-capacity-gate\.test\.mjs/);
});

test("Root reliability waits for successful Pages sync instead of racing main push",()=>{
  const y=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");
  assert.match(y,/workflow_run:/);
  assert.match(y,/Sync AI Advokat frontend runtime to GitHub Pages/);
  assert.match(y,/types: \[completed\]/);
  assert.match(y,/workflow_run\.conclusion == 'success'/);
  assert.match(y,/workflow_run\.head_sha/);
  assert.doesNotMatch(y,/push:\s*\n\s*branches: \["main"\]/);
});
