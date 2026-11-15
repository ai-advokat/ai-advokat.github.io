import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const home=readFileSync("index.html","utf8");
const worker=readFileSync("src/index.js","utf8");
const browser=readFileSync("scripts/translator-browser-candidate-regression.mjs","utf8");
const live=readFileSync("scripts/translator-layered-live-smoke.mjs","utf8");

test("public page load is limited to six translation batches, not all 30+",()=>{
  assert.match(home,/UI_TRANSLATION_INITIAL_MAX_BATCHES=6/);
  assert.match(home,/UI_TRANSLATION_FULL_PASS_MAX_BATCHES=48/);
  assert.match(home,/uiTranslationFullPassRequested\?units\.map\(x=>x\.source\):\[\]/);
  assert.match(home,/batches\.length>passLimit/);
  assert.match(home,/batches\.length=passLimit/);
  assert.match(home,/uiTranslationBudgetPaused=true/);
  assert.match(home,/siteLanguage==="mk"\|\|uiTranslationBudgetPaused/);
  assert.match(browser,/uiTranslationFullPage/);
  assert.match(browser,/firstPass\.requests<=6/);
  assert.match(live,/initialBatches>6/);
});

test("a visible explicit user action is required to translate the full DOM",()=>{
  assert.match(home,/button\.id="uiTranslationFullPage"/);
  assert.match(home,/button\.addEventListener\("click",/);
  assert.match(home,/uiTranslationFullPassRequested=true/);
  assert.match(home,/button\.textContent="🌍 Преведи го остатокот/);
  assert.match(home,/updateUiTranslationFullPageControl\(true\)/);
  assert.match(home,/uiTranslationFullPassRequested=false/);
});

test("zero-neuron Albanian shell uses only reviewed static navigation strings",()=>{
  assert.match(home,/UI_TRANSLATION_STATIC_SQ=Object\.freeze/);
  assert.match(home,/\[i18n\.mk\.navSources\]:"Burime juridike"/);
  assert.match(home,/\[i18n\.mk\.navGazette\]:"Gazeta Zyrtare"/);
  assert.match(home,/seedUiStaticShellCache\(cache\)/);
  assert.match(home,/document\.documentElement\.dataset\.translationState="partial"/);
});

test("secondary UI translation never traverses live chat or private case content",()=>{
  const guard=home.match(/function excludedTranslationElement\(el\)\{([\s\S]*?)\n  \}/)?.[1]||"";
  for(const marker of ["#aiChatMessages","#aiChatHistory","#aiChatAttachments","[data-private]","[data-sensitive]","[contenteditable]"]){
    assert.ok(guard.includes(marker),marker);
  }
});

test("backend stops upstream fanout and refuses paid fallback without separate consent",()=>{
  assert.match(worker,/let firstFailure=null/);
  assert.match(worker,/while\(firstFailure===null\)/);
  assert.match(worker,/if\(firstFailure!==null\) throw firstFailure/);
  assert.match(worker,/UI_TRANSLATION_ENABLE_PAID_FALLBACK/);
  assert.match(worker,/ui_translation_paid_fallback_not_authorised/);
});
