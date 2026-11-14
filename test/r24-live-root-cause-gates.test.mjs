import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadWorker} from "./load-worker.mjs";
import {chooseVersion} from "../src/corpus-versions.js";

const {worker}=await loadWorker();
const api="https://ai-advokat-github-io.aiadvokat16.workers.dev/api/ui-translate";

test("R24: translation API rejects bad or duplicated rows BEFORE any paid/free provider call",async()=>{
  let calls=0;
  const env={AI:{run:async()=>{calls++;return {translated_text:"PROVIDER_CALLED"};}}};
  const invalid=[
    [{id:"0",text:""}],
    [{id:"0",text:"A".repeat(1201)}],
    [{id:"same",text:"Правни извори"},{id:"same",text:"Судска пракса"}],
    [{id:"",text:"Правни извори"}],
    [{id:"0",text:"Правни извори"},{id:"1",text:"\u0001\u0002"}]
  ];
  for(const items of invalid){
    const request=new Request(api,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({targetLanguage:"sq",items})});
    const res=await worker.fetch(request,env,{});
    const body=await res.json();
    assert.equal(res.status,422,JSON.stringify({items,body}));
    assert.deepEqual({ok:body.ok,error:body.error},{ok:false,error:"ui_translation_invalid_item_or_duplicate_id"});
  }
  assert.equal(calls,0,"invalid rows must never reach Cloudflare or OpenAI");
});

test("R24: browser maps translated text by exact row IDs, not array positions",()=>{
  const home=readFileSync("index.html","utf8");
  const acceptance=readFileSync("scripts/translator-browser-candidate-regression.mjs","utf8");
  assert.match(home,/const byId=new Map\(\)/);
  assert.match(home,/let validRows=d\.translations\.length===items\.length/);
  assert.match(home,/cache\[item\.text\]=byId\.get\(item\.id\)/);
  assert.doesNotMatch(home,/const source=texts\[j\];\s*const translated=String\(row\?\.text/);
  assert.match(acceptance,/const translations=items\.map\(row=>.*\)\)\.reverse\(\)/);
  assert.match(acceptance,/scenario==="row-mismatch"/);
  assert.match(acceptance,/reordered row IDs corrupted/);
});

test("R24: client translation is bounded, quota-faithful and cannot falsely mark READY",()=>{
  const home=readFileSync("index.html","utf8");
  assert.match(home,/UI_TRANSLATION_MAX_ITEM_CHARS=1200/);
  assert.match(home,/UI_TRANSLATION_PASS_BUDGET_MS=90000/);
  assert.match(home,/UI_TRANSLATION_REQUEST_TIMEOUT_MS=25000/);
  assert.match(home,/signal:AbortSignal\.timeout\(Math\.min\(UI_TRANSLATION_REQUEST_TIMEOUT_MS,remainingMs\)\)/);
  assert.match(home,/if\(translationFailed\|\|missingSources\.length\)/);
  assert.match(home,/dataset\.translationState=uiTranslationInitialCommitDone\?"partial":"unavailable"/);
  assert.match(home,/oversizedPending=pending\.length-translatablePending\.length/);
});

test("R24: OpenAI truncated retry must not relaunch web search or leak legal case text into diagnostic logs",()=>{
  const code=readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(code,/chiefNeedsWeb=!capacityFallbackMode && !chiefOnlyRecoveryMode/);
  assert.match(code,/console\.warn\("openai_chief_incomplete_bounded",\{/);
  const logBlock=code.slice(code.indexOf('console.warn("openai_chief_incomplete_bounded"'),code.indexOf('console.warn("openai_chief_incomplete_bounded"')+430);
  assert.ok(logBlock.length>100);
  for(const forbidden of ["userContent","userParts","input","historyContext","prompt","attachments","sourceText"]){
    assert.doesNotMatch(logBlock,new RegExp("\\b"+forbidden+"\\b"),"diagnostic log must not disclose "+forbidden);
  }
});

test("R24: missing governed ZPP article set stays fail-closed until an official version is reviewed",()=>{
  const result=chooseVersion([],new Map(),{today:"2026-11-14"});
  assert.equal(result.ok,false);
  assert.equal(result.error,"no_articles");
  assert.deepEqual(result.versions,[]);
  const code=readFileSync("src/index.js","utf8");
  assert.match(code,/corpus\.error==="no_articles" \? 404 : 409/);
});
