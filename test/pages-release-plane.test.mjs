import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const bot=fs.readFileSync("bot/index.html","utf8");
const sync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");

test("external bot canonicalizes GitHub Pages to the Worker-hosted production surface",()=>{
  assert.match(bot,/location\.hostname === 'ai-advokat\.github\.io'/);
  assert.match(bot,/https:\/\/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
  assert.match(bot,/standalone-bot\.js\?v=20261101-core-r10/);\n  assert.match(bot,/standalone-bot-vnext\.js\?v=20261101-vnext-r10/);
  assert.match(bot,/frontend-runtime-guard\.js\?v=20261101-root-r1/);
});

test("GitHub Pages runtime sync is curated and cannot mutate legal production state",()=>{
  for(const path of [
    "index.html",
    "bot/index.html",
    "assets/ai-advokat-chat.js",
    "assets/frontend-runtime-guard.js",
    "assets/standalone-bot.js",
    "assets/standalone-bot-vnext.js",
    "assets/standalone-bot-reliability.js"
  ]) assert.ok(sync.includes(path),path);

  assert.match(sync,/permissions:\n  contents: write/);
  assert.match(sync,/git push origin HEAD:gh-pages/);
  assert.match(sync,/MAIN\/GH-PAGES RUNTIME PARITY: PASS/);

  assert.doesNotMatch(sync,/wrangler\s+deploy/i);
  assert.doesNotMatch(sync,/wrangler\s+d1/i);
  assert.doesNotMatch(sync,/secret\s+put/i);
  assert.doesNotMatch(sync,/OPENAI_API_KEY/);
  assert.doesNotMatch(sync,/membership_accounts/);
});
