import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const bot=fs.readFileSync("bot/index.html","utf8");
const sync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");

test("external bot canonicalizes GitHub Pages to the Worker-hosted production surface",()=>{
  assert.match(bot,/location\.hostname === 'ai-advokat\.github\.io'/);
  assert.match(bot,/https:\/\/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
  assert.match(bot,/standalone-bot\.js\?v=20261109-core-r15-voice-r3/);
  assert.match(bot,/standalone-bot-vnext\.js\?v=20261107-hybrid-r2-lawyer-view/);
  assert.match(bot,/standalone-bot-toolkit\.js\?v=20261106-toolkit-r14/);
  assert.match(bot,/standalone-bot-toolkit\.css\?v=20261106-toolkit-r14/);
  assert.match(bot,/frontend-runtime-guard\.js\?v=20261101-root-r1/);
});

test("GitHub Pages runtime sync is curated and cannot mutate legal production state",()=>{
  for(const path of [
    "index.html",
    "bot/index.html",
    "assets/ai-advokat-chat.js",
    "assets/ai-advokat-chat.css",
    "assets/ai-advokat-voice.mjs",
    "assets/frontend-runtime-guard.js",
    "assets/standalone-bot.js",
    "assets/standalone-bot.css",
    "assets/standalone-bot-vnext.js",
    "assets/standalone-bot-vnext.css",
    "assets/standalone-bot-toolkit.js",
    "assets/standalone-bot-toolkit.css",
    "assets/standalone-bot-reliability.js"
  ]) assert.ok(sync.includes(path),path);

  assert.match(sync,/permissions:\n  contents: write/);
  assert.match(sync,/git push origin HEAD:gh-pages/);
  assert.match(sync,/MAIN\/GH-PAGES RUNTIME PARITY: PASS/);
  assert.match(sync,/AI_ADVOCAT_VOICE_R3/);
  assert.match(sync,/node --check assets\/ai-advokat-voice\.mjs/);

  assert.doesNotMatch(sync,/wrangler\s+deploy/i);
  assert.doesNotMatch(sync,/wrangler\s+d1/i);
  assert.doesNotMatch(sync,/secret\s+put/i);
  assert.doesNotMatch(sync,/OPENAI_API_KEY/);
  assert.doesNotMatch(sync,/membership_accounts/);
});
