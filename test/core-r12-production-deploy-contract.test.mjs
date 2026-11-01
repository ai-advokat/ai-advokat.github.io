import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/deploy-production-once.yml","utf8");

test("R12 frontend / R13 backend production deploy is explicitly push-triggered by its bounded workflow file",()=>{
  assert.match(workflow,/branches:\s*\n\s*- main/);
  assert.match(workflow,/paths:\s*\n\s*- "\.github\/workflows\/deploy-production-once\.yml"/);
  assert.match(workflow,/trigger-exact-article-fallback-r13: 2026-11-01/);
});

test("core-r12 production deploy runs pre-deploy verification and wrangler deploy",()=>{
  assert.match(workflow,/npm run verify/);
  assert.match(workflow,/npm run test:security/);
  assert.match(workflow,/npm run test:legal-runtime-governance/);
  assert.match(workflow,/npm run test:gpt-activation/);
  assert.match(workflow,/npx wrangler deploy/);
});

test("core-r12 production deploy proves exact live byte parity and legacy self-healing",()=>{
  for(const path of [
    "bot/index.html",
    "assets/standalone-bot.js",
    "assets/chat-privacy-browser.js",
    "src/chat-privacy.js"
  ]) assert.ok(workflow.includes("sha256sum "+path),path);

  assert.match(workflow,/EXTERNAL BOT R12 LIVE BYTE PARITY: PASS/);
  assert.match(workflow,/release=core-r10/);
  assert.match(workflow,/release=core-r12/);
  assert.match(workflow,/clear-site-data: "cache"/);
  assert.match(workflow,/LEGACY CORE-R10 SELF-HEAL: PASS/);
});
