import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isDailyLegalBriefingRequest,
  buildDailyLegalBriefing,
  LEGAL_DAILY_BRIEFING_VERSION
} from "../src/legal-daily-briefing.js";
import {loadWorker} from "./load-worker.mjs";

const exactPrompt="Да те замолам да ми направиш дневен брифинг од правни веси во Македонија и регионот. Однапред многу ти благодарам, Александар";
const snapshotDate="2026-11-17T10:00:00.000Z";
const officialFixture={
  items:[
    {
      id:"court:synthetic-fixture",sourceId:"constitutional-court",
      title:"Објавена одлука на Уставниот суд — тестен запис",
      url:"https://ustavensud.mk/mk/odluki-i-reshenija/synthetic-test-fixture",
      publishedDate:"2026-11-17",
      authorityClass:"official_constitutional_court",
      institution:"constitutional_court",legalEffectVerified:false
    },
    {
      id:"si:synthetic-fixture",sourceId:"slovenia-justice",
      title:"Novica slovenske pravosodne institucije — SYNTHETIC TEST",
      url:"https://www.gov.si/novice/synthetic-test-fixture/",
      publishedDate:"2026-11-17",
      authorityClass:"official_foreign_ministry",
      institution:"slovenia_justice",legalEffectVerified:false
    },
    {
      id:"unsafe:missing-source",sourceId:"untrusted-social",
      title:"НЕПОТВРДЕНА ПРЕСУДА",
      url:"https://evil.example/claims",
      publishedDate:"2026-11-17",legalEffectVerified:true
    },
    {
      id:"unsafe:future",sourceId:"constitutional-court",
      title:"НЕПОТВРДЕНА ИДНА ОБЈАВА",
      url:"https://ustavensud.mk/mk/synthetic-future",
      publishedDate:"2026-11-19",legalEffectVerified:false
    },
    {
      id:"unsafe:foreign",sourceId:"constitutional-court",
      title:"НЕПОТВРДЕНА ДРУГА ДОМЕНА",
      url:"https://example.com/synthetic",
      publishedDate:"2026-11-17",legalEffectVerified:false
    }
  ],
  generatedAt:snapshotDate,
  sourceHealth:[]
};

test("R30 recognizes exact user's daily legal briefing but not unrelated legal question",()=>{
  assert.equal(isDailyLegalBriefingRequest(exactPrompt),true);
  assert.equal(isDailyLegalBriefingRequest("Дај ми утрински преглед на правните новости"),true);
  assert.equal(isDailyLegalBriefingRequest("Подготви тужба за развод"),false);
  assert.equal(isDailyLegalBriefingRequest("Што е обврска?"),false);
});

test("R30 formats bounded official-source briefing in Macedonian, preserving link and legal-effect status",()=>{
  const result=buildDailyLegalBriefing(officialFixture,{userText:exactPrompt,now:new Date(snapshotDate)});
  assert.notEqual(result.state,"language_gate_blocked");
  assert.match(result.answer,/ДНЕВЕН ПРАВЕН БРИФИНГ/);
  assert.match(result.answer,/МАКЕДОНИЈА/);
  assert.match(result.answer,/РЕГИОН/);
  assert.match(result.answer,/https:\/\/ustavensud\.mk\//);
  assert.match(result.answer,/https:\/\/www\.gov\.si\//);
  assert.doesNotMatch(result.answer,/evil\.example|synthetic-future|НЕПОТВРДЕНА ПРЕСУДА/);
  assert.match(result.answer,/Правно дејство: не е потврдено/);
  assert.equal(result.sourceCount,2);
  assert.equal(result.legalSources.length,2);
  assert.ok(result.legalSources.every(s=>s.legalEffectVerified===false));
  assert.ok(result.legalSources.some(s=>s.jurisdiction==="REGIONAL_NOT_APPLICABLE_IN_MK"));
});

test("R30 does not invent news when all source entries are missing",()=>{
  const result=buildDailyLegalBriefing({items:[]},{userText:exactPrompt,now:new Date(snapshotDate)});
  assert.equal(result.state,"no_verified_items");
  assert.equal(result.sourceCount,0);
  assert.match(result.answer,/Нема сигурно издвоени актуелни ставки/);
  assert.match(result.answer,/Ова не значи дека нема правни новости/);
  assert.doesNotMatch(result.answer,/не е имало правни вести/);
});

test("R30 publicly accessible route keeps privacy and assistant-burst gate before official-source fetch",()=>{
  const src=fs.readFileSync("src/index.js","utf8");
  const position=needle=>src.indexOf(needle,src.indexOf("async function handleGPTChat("));
  assert.ok(position("const confidentiality=detectConfidentialCasePrompt(userQ)")>0);
  assert.ok(position("const historyCheck=validateChatHistory(payload.history)")>0);
  assert.ok(position("const burst=await checkAssistantBurst(env,subject)")>0);
  assert.ok(position("if(isDailyLegalBriefingRequest(userQ)")>position("const burst=await checkAssistantBurst(env,subject)"));
  assert.ok(position("if(isDailyLegalBriefingRequest(userQ)")>position("const historyCheck=validateChatHistory(payload.history)"));
  assert.ok(position("if(isDailyLegalBriefingRequest(userQ)")>position("const confidentiality=detectConfidentialCasePrompt(userQ)"));
  assert.ok(position("if(isDailyLegalBriefingRequest(userQ)")<position("const reservation=await reserveMonthlyQuota"));
  assert.match(src,/official_headline_discovery_no_model/);
  assert.match(src,/providerCalls:0,languageRepairProviderCalls:0/);
});

test("R30 user-facing error after gated failure is displayed once without literal backslash-n",()=>{
  const src=fs.readFileSync("assets/standalone-bot.js","utf8");
  assert.match(src,/legal_daily_briefing_language_gate_blocked/);
  assert.match(src,/Јазичната проверка ја задржа содржината/);
  assert.match(src,/Прашањето е зачувано за повторен обид/);
  assert.doesNotMatch(src,/\\+['"]\\\\\\\\n\\\\\\\\nОва е сервисна грешка/);
});

test("R30 exact external Worker request returns official-source response without any AI provider calls",async()=>{
  const {worker}=await loadWorker();
  const previousCaches=globalThis.caches;
  const now=new Date();
  const today=now.toISOString().slice(0,10);
  const snapshot={
    ...officialFixture,generatedAt:now.toISOString(),
    items:officialFixture.items.slice(0,2).map(item=>({...item,publishedDate:today}))
  };
  let providerCalls=0,cacheReads=0;
  globalThis.caches={default:{
    async match(){
      cacheReads++;
      return new Response(JSON.stringify({payload:snapshot,generatedAt:now.toISOString(),sourceOk:2,sourceUnavailable:0}),{
        headers:{"content-type":"application/json"}
      });
    },
    async put(){throw Error("read-only briefing should not write to cache");}
  }};
  try{
    const req=new Request("https://ai-advokat-github-io.aiadvokat16.workers.dev/api/bot",{
      method:"POST",headers:{"content-type":"application/json","CF-Connecting-IP":"203.0.113.25"},
      body:JSON.stringify({q:exactPrompt,outputLanguage:"mk",history:[],mode:"auto"})
    });
    const res=await worker.fetch(req,{
      EXTERNAL_BOT_TRAINING_OPEN:"true",
      EXTERNAL_BOT_TRAINING_MONTHLY_QUOTA:"100",
      FREE_CHAT_PROVIDER:"workers_ai",
      RATE_LIMIT_SALT:"r30-fixture-only-32-plus-digits-and-letter-2026",
      DB:{prepare(){return {bind(){return {run:async()=>({results:[{request_count:1}]})}}}}},
      AI:{run(){providerCalls++;throw Error("model must NOT be invoked")}}
    },{});
    const data=await res.json();
    assert.equal(res.status,200,JSON.stringify(data).slice(0,300));
    assert.equal(data.ok,true);
    assert.equal(data.sourceMode,"official_headline_discovery_no_model");
    assert.equal(data.legalNewsVersion,LEGAL_DAILY_BRIEFING_VERSION);
    assert.equal(data.performance.providerCalls,0);
    assert.equal(data.verifiedLinkCount,2);
    assert.equal(providerCalls,0);
    assert.ok(cacheReads>=1);
    assert.match(data.answer,/ДНЕВЕН ПРАВЕН БРИФИНГ/);
    assert.doesNotMatch(data.answer,/Одговорот не е прикажан/);
    assert.equal(data.legalGovernance.humanReviewRequired,true);
  }finally{
    if(previousCaches===undefined)delete globalThis.caches;
    else globalThis.caches=previousCaches;
  }
});
