import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/worker-runtime-live-smoke.yml","utf8");

test("Worker live smoke is triggered by every external-bot runtime surface",()=>{
  for(const path of [
    "bot/index.html",
    "assets/standalone-bot.js",
    "assets/chat-privacy-browser.js",
    "src/chat-privacy.js",
    ".assetsignore",
    "_headers",
    ".github/workflows/sync-pages-runtime.yml"
  ]) assert.ok(workflow.includes(path),path);
});

test("Worker live smoke waits for exact deployed byte parity",()=>{
  assert.match(workflow,/for attempt in \$\(seq 1 40\)/);
  assert.match(workflow,/sha256sum bot\/index\.html/);
  assert.match(workflow,/sha256sum assets\/standalone-bot\.js/);
  assert.match(workflow,/sha256sum assets\/chat-privacy-browser\.js/);
  assert.match(workflow,/sha256sum src\/chat-privacy\.js/);
  assert.match(workflow,/WORKER R12 BYTE PARITY: PASS/);
  assert.match(workflow,/test "\$deployed" = "1"/);
});

test("Worker live smoke proves legacy core-r10 self-heals to core-r12",()=>{
  assert.match(workflow,/release=core-r10/);
  assert.match(workflow,/release=core-r12/);
  assert.match(workflow,/clear-site-data: "cache"/);
  assert.match(workflow,/x-ai-advokat-release: core-r12/);
  assert.match(workflow,/LEGACY CORE-R10 SELF-HEAL REDIRECT: PASS/);
});
