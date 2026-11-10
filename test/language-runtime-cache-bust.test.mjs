import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const bot=fs.readFileSync("bot/index.html","utf8");

test("Professional language runtime cache keys are bumped after the 33-language repair",()=>{
  assert.match(bot,/standalone-bot-r7\.css\?v=20261110-language-r3/);
  assert.match(bot,/standalone-bot\.js\?v=20261110-language-r3&r18=voice-r4-fallback/);
  assert.match(bot,/ai-advokat-ui-release" content="professional-r7-language-r3"/);
  assert.doesNotMatch(bot,/standalone-bot-r7\.css\?v=20261108-professional-r7/);
});
