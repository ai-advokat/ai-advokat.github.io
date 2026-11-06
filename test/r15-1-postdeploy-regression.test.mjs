import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("R15.1 same-origin microphone is allowed while other sensitive capabilities remain denied",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/Permissions-Policy", "camera=\(\), microphone=\(self\), geolocation=\(\), payment=\(\), usb=\(\), interest-cohort=\(\)"/);
  assert.doesNotMatch(worker,/microphone=\(\)/);
});

test("R15.1 external bot release redirect agrees with the deployed core R15 surface",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  const bot=fs.readFileSync("bot/index.html","utf8");
  assert.match(worker,/const EXTERNAL_BOT_RELEASE="core-r15"/);
  assert.match(bot,/standalone-bot\.js\?v=20261106-core-r15-voice/);
  assert.match(bot,/standalone-bot\.css\?v=20261106-access-r15-voice/);
});

test("R15.1 Professional smoke verifies the current core and shared voice runtime",()=>{
  const workflow=fs.readFileSync(".github/workflows/professional-bot-live-smoke.yml","utf8");
  assert.match(workflow,/standalone-bot\.js\?v=20261106-core-r15-voice/);
  assert.match(workflow,/standalone-bot\.css\?v=20261106-access-r15-voice/);
  assert.match(workflow,/node --check assets\/ai-advokat-voice\.mjs/);
  assert.doesNotMatch(workflow,/standalone-bot\.js\?v=20261101-core-r13/);
});
