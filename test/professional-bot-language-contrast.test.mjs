import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const css=fs.readFileSync("assets/standalone-bot-r7.css","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");\nconst runtime=fs.readFileSync("assets/standalone-bot.js","utf8");

test("professional bot keeps all 33 language options and readable option contrast",()=>{
  const select=bot.match(/<select id="botLanguage"[\s\S]*?<\/select>/)?.[0]||"";
  const codes=[...select.matchAll(/<option value="([a-z]{2})"/g)].map(x=>x[1]);
  assert.equal(codes.length,33);
  assert.match(css,/\.bot-language-control select option,[\s\S]*?background:#ffffff!important;[\s\S]*?color:#071524!important/);
  assert.match(css,/\.bot-language-control select option:checked,[\s\S]*?background:#dfe8f1!important;[\s\S]*?color:#071524!important/);
});

test("professional bot localizes interface as well as AI output and voice",()=>{
  assert.match(runtime,/translateProfessionalUi/);
  assert.match(runtime,/\/api\/ui-translate/);
  assert.match(runtime,/BOT_UI_TRANSLATION_CACHE_PREFIX/);
  assert.match(runtime,/location\.reload\(\)/);
  assert.match(runtime,/интерфејс и глас/);
  assert.match(runtime,/document\.documentElement\.dir=\["ar","he","fa","ur"\]/);
  assert.match(runtime,/\.message \.text/);
  assert.match(runtime,/\.vnext-source-card/);
});
