import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { shouldEnforceMacedonianOutput } from "../src/macedonian-language-guard.js";

const html=fs.readFileSync("bot/index.html","utf8");
const core=fs.readFileSync("assets/standalone-bot.js","utf8");
const css=fs.readFileSync("assets/standalone-bot.css","utf8");
const r7=fs.readFileSync("assets/standalone-bot-r7.css","utf8");
const prompt=fs.readFileSync("src/ai-advokat-central-prompt.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");

const expected=["sq","ar","bn","bs","bg","zh","hr","en","eo","fr","de","el","ha","he","hi","hu","id","it","ja","ko","la","mk","fa","pt","pa","ru","sr","sl","es","sw","tr","ur","vi"];

test("external AI Advokat exposes the exact MediCareMK 33-language catalogue",()=>{
  const select=html.match(/<select id="botLanguage"[\s\S]*?<\/select>/)?.[0]||"";
  const codes=[...select.matchAll(/<option value="([a-z]{2})"/g)].map(m=>m[1]);
  assert.deepEqual(codes,expected);
  assert.equal(codes.length,33);
  assert.match(select,/Македонски — Macedonian \(MK\)/);
  assert.match(select,/English \(EN\)/);
  assert.match(select,/Shqip — Albanian \(SQ\)/);
  assert.match(select,/العربية — Arabic \(AR\)/);
});

test("language preference is local, bounded and drives response language",()=>{
  assert.match(core,/const AI_ADVOCAT_LANGUAGES=Object\.freeze\(\[/);
  assert.match(core,/const LANGUAGE_KEY="aiadvokat-language"/);
  assert.match(core,/localStorage\.setItem\(LANGUAGE_KEY,lang\.code\)/);
  assert.match(core,/document\.documentElement\.lang=lang\.code/);
  assert.match(core,/outputLanguage:selectedLanguageMeta\(\)\.code/);
  assert.match(core,/q:withOutputLanguageDirective\(outboundQ\)/);
  assert.match(worker,/function externalBotLanguageDirective\(code\)/);
  assert.match(worker,/Please answer in "\+language/);
  assert.match(worker,/Preserve official legal source quotations, citations, case numbers and statutory identifiers verbatim/);
});

test("selected language also drives dictation and answer speech when browser support exists",()=>{
  assert.match(core,/language:\(\)=>selectedSpeechLocale\(\)/);
  assert.match(core,/langOverride:selectedSpeechLocale\(\)/);
  assert.match(core,/for\(const item of AI_ADVOCAT_LANGUAGES\)/);
  assert.match(core,/option\.value=item\.locale/);
});

test("multilingual preference never weakens source or Human Gate boundaries",()=>{
  assert.match(prompt,/MULTILINGUAL USER PREFERENCE/);
  assert.match(prompt,/never changes jurisdiction, legal authority, source status, article identity, case number, citation, quoted source text or Human Gate responsibility/);
  assert.equal(shouldEnforceMacedonianOutput("Please answer in French.\n\nШто предвидува членот?"),false);
  assert.equal(shouldEnforceMacedonianOutput("Please answer in Arabic.\n\nОбјасни го правниот ризик."),false);
  assert.equal(shouldEnforceMacedonianOutput("Што предвидува членот?"),true);
});

test("language selector remains usable and readable in responsive R7 UI",()=>{
  assert.match(css,/\.bot-language-control/);
  assert.match(css,/max-width:190px/);
  assert.match(r7,/html\.professional-r7 \.bot-language-control select/);
  assert.match(r7,/background:#ffffff!important/);
  assert.match(r7,/color:#071524!important/);
});
