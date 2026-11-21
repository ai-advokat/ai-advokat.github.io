import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadWorker} from "./load-worker.mjs";
const {worker}=await loadWorker();
const repoIndex=readFileSync("index.html","utf8");
const botIndex=readFileSync("bot/index.html","utf8");
const direct=readFileSync("translator.html","utf8");
const script=readFileSync("assets/zoki-translator-direct-r26.js","utf8");
const src=readFileSync("src/index.js","utf8");
const base="https://ai-advokat-github-io.aiadvokat16.workers.dev";
const DB={prepare(){return {bind(){return {run:async()=>({results:[{request_count:1}]})};}};}};
const headers={"content-type":"application/json","CF-Connecting-IP":"203.0.113.180","Origin":"https://ai-advokat.github.io"};
test("standalone short-text translator is linked and sends only manual bounded requests",()=>{
 assert.match(repoIndex,/href="\/translator\.html"/);
 assert.match(botIndex,/href="\/translator\.html"/);
 assert.match(direct,/id="translatorForm"/);
 assert.match(script,/addEventListener\("submit"/);
 assert.match(script,/signal:thisController\.signal/);
 assert.match(script,/source-0/);
 assert.doesNotMatch(script,/localStorage|OPENAI_API_KEY|Authorization.*Bearer/);
});
test("EN to MK reaches real Worker M2M100 rather than source passthrough",async()=>{
 const calls=[];
 const env={DB,RATE_LIMIT_SALT:"r26-hotfix-translator-salt-0123456789abcdef",AI:{run:async(model,options)=>{
  calls.push({model,options});
  assert.equal(model,"@cf/meta/m2m100-1.2b");
  assert.equal(options.source_lang,"en");
  assert.equal(options.target_lang,"mk");
  return {translated_text:"Добро утро"};
 }}};
 const req=new Request(base+"/api/ui-translate",{method:"POST",headers,
  body:JSON.stringify({targetLanguage:"mk",items:[{id:"source-0",text:"Good morning"}]})});
 const res=await worker.fetch(req,env,{});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.provider,"m2m100");
 assert.deepEqual(data.translations,[{id:"source-0",text:"Добро утро"}]);
 assert.equal(calls.length,1);
});
test("existing MK-to-MK passthrough remains zero-model-cost",async()=>{
 let calls=0;
 const env={AI:{run:async()=>{calls++;return {}}}};
 const res=await worker.fetch(new Request(base+"/api/ui-translate",{method:"POST",headers,
   body:JSON.stringify({targetLanguage:"mk",items:[{id:"one",text:"Добро утро"}]})}),env,{});
 assert.equal(res.status,200);
 assert.equal((await res.json()).provider,"source_passthrough");
 assert.equal(calls,0);
});
test("OpenAI UI fallback requires explicit environment-level spending consent",()=>{
 assert.match(src,/UI_TRANSLATION_ENABLE_PAID_FALLBACK/);
 assert.match(src,/ui_translation_paid_fallback_not_authorised/);
 assert.match(src,/@cf\/zai-org\/glm-4\.7-flash/);
});

test("backend rejects missing, oversized and duplicate translation IDs rather than shifting legal text",async()=>{
  const inputs=[
    [{id:"1",text:"Ставка"},{"id":"1","text":"Друга ставка"}],
    [{id:"1",text:""}],
    [{id:"1",text:"А".repeat(1201)}]
  ];
  for(const items of inputs){
    let modelCalls=0;
    const env={AI:{run:async()=>{modelCalls++;return {translated_text:"INVALID"};}}};
    const response=await worker.fetch(new Request(base+"/api/ui-translate",{
      method:"POST",headers,body:JSON.stringify({targetLanguage:"en",items})
    }),env,{});
    const data=await response.json();
    assert.equal(response.status,422);
    assert.equal(data.error,"ui_translation_invalid_item_or_duplicate_id");
    assert.equal(modelCalls,0);
  }
});
test("external UI translation is capped and validates row IDs with visible errors",()=>{
  const external=readFileSync("assets/standalone-bot.js","utf8");
  assert.match(external,/BOT_UI_TRANSLATION_INITIAL_BATCHES=1/);
  assert.match(external,/BOT_UI_TRANSLATION_EXPLICIT_BATCHES=6/);
  assert.match(external,/BOT_UI_TRANSLATION_BATCH_ITEMS=12/);
  assert.match(external,/const byId=new Map\(\)/);
  assert.match(external,/botTranslationStatus/);
  assert.doesNotMatch(external,/new MutationObserver/);
});
