import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";

const html=fs.readFileSync("translator.html","utf8");
const script=fs.readFileSync("assets/zoki-translator-direct-r26.js","utf8");
const bot=fs.readFileSync("assets/standalone-bot.js","utf8");
const home=fs.readFileSync("index.html","utf8");
const external=fs.readFileSync("bot/index.html","utf8");
const workerCode=fs.readFileSync("src/index.js","utf8");
const {worker}=await loadWorker();
const base="https://ai-advokat-github-io.aiadvokat16.workers.dev/api/ui-translate";
const DB={prepare(){return {bind(){return {run:async()=>({results:[{request_count:1}]})};}};}};
const headers={"content-type":"application/json","CF-Connecting-IP":"203.0.113.180","Origin":"https://ai-advokat.github.io"};
function request(targetLanguage,text){
  return new Request(base,{method:"POST",headers,body:JSON.stringify({targetLanguage,items:[{id:"owner-0",text}]})});
}

test("direct translator is a real page linked from BOTH bot shells",()=>{
  assert.match(html,/id="translatorForm"/);
  assert.match(html,/id="sourceText"/);
  assert.match(html,/id="translated" readonly/);
  assert.match(html,/id="status" role="status" aria-live="polite"/);
  assert.match(script,/\/api\/ui-translate/);
  assert.match(script,/source-0/);
  assert.match(script,/45000/);
  assert.doesNotMatch(script,/OPENAI_API_KEY|Authorization.*Bearer|paidFallback|localStorage/);
  assert.match(home,/href="\/translator\.html"/);
  assert.match(external,/href="\/translator\.html"/);
});

test("English to Macedonian must not return unchanged English",async()=>{
  const calls=[];
  const env={
    DB,RATE_LIMIT_SALT:"zoki-r26-test-salt-0123456789abcdef",
    AI:{run:async(model,options)=>{
      calls.push({model,options});
      assert.equal(model,"@cf/meta/m2m100-1.2b");
      assert.equal(options.source_lang,"en");
      assert.equal(options.target_lang,"mk");
      return {translated_text:"Добро утро"};
    }}
  };
  const result=await worker.fetch(request("mk","Good morning"),env,{});
  assert.equal(result.status,200);
  const data=await result.json();
  assert.equal(data.ok,true);
  assert.deepEqual(data.translations,[{id:"owner-0",text:"Добро утро"}]);
  assert.equal(data.provider,"m2m100");
  assert.equal(calls.length,1);
});

test("Macedonian source-to-source remains free passthrough",async()=>{
  let calls=0;
  const env={AI:{run:async()=>{calls++;return {};}}};
  const result=await worker.fetch(request("mk","Добро утро"),env,{});
  assert.equal(result.status,200);
  assert.equal((await result.json()).provider,"source_passthrough");
  assert.equal(calls,0);
});

test("external bot validates row IDs, bounds UI quota and surfaces errors",()=>{
  assert.match(bot,/BOT_UI_TRANSLATION_BATCH_ITEMS=12/);
  assert.match(bot,/BOT_UI_TRANSLATION_BATCH_CHARS=2000/);
  assert.match(bot,/BOT_UI_TRANSLATION_INITIAL_BATCHES=1/);
  assert.match(bot,/BOT_UI_TRANSLATION_EXPLICIT_BATCHES=6/);
  assert.match(bot,/const byId=new Map\(\)/);
  assert.match(bot,/cache\[item\.text\]=byId\.get\(item\.id\)/);
  assert.match(bot,/botTranslationStatus/);
  assert.match(bot,/botUiTranslationMore/);
  assert.doesNotMatch(bot,/const observer=new MutationObserver\(mutations=>/);
});

test("no paid translation fallback is turned on by the frontend",()=>{
  assert.match(workerCode,/UI_TRANSLATION_ENABLE_PAID_FALLBACK/);
  assert.match(workerCode,/ui_translation_paid_fallback_not_authorised/);
  assert.match(html,/Нема автоматско испраќање/);
  assert.match(script,/Преводот го надмина временското ограничување/);
});
