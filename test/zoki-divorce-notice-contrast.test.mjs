import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";
import {
  isFamilyPrelitigationNoticeRequest,
  formatFamilyPrelitigationNotice,
  familyPrelitigationNoticeLegalSources
} from "../src/family-prelitigation-notice.js";
import {isFamilyDivorceDraftRequest,formatFamilyDivorceDraft} from "../src/family-divorce-draft.js";

const exactZoranPrompt="Да те замолам да ми направиш Опомена пред тужба за развод, со измислени имиња, однапред многу ти благодарам Сашо";

test("the exact Zoran prompt is NOTICE, never a divorce petition",()=>{
  assert.equal(isFamilyPrelitigationNoticeRequest(exactZoranPrompt),true);
  assert.equal(isFamilyDivorceDraftRequest(exactZoranPrompt),false);
  const answer=formatFamilyPrelitigationNotice(exactZoranPrompt);
  assert.ok(answer);
  assert.match(answer,/^ОПОМЕНА \/ ПОКАНА ПРЕД ЕВЕНТУАЛНО ПОДНЕСУВАЊЕ ТУЖБА ЗА РАЗВОД НА БРАК/m);
  assert.match(answer,/Александар Петров/);
  assert.match(answer,/Елена Петрова/);
  assert.match(answer,/ИЗМИСЛЕНИ/);
  assert.match(answer,/ДОБРОВОЛНО ПИСМЕНО ОБРАЌАЊЕ/);
  assert.match(answer,/не е законски рок/);
  assert.match(answer,/не значи согласност/);
  assert.match(answer,/не е задолжителна/);
  assert.match(answer,/Член 229/);
  assert.match(answer,/HUMAN GATE/);
  assert.doesNotMatch(answer,/^ДО\s+ОСНОВЕН ГРАЃАНСКИ СУД/mi);
  assert.doesNotMatch(answer,/^III\. ТУЖБЕНО БАРАЊЕ/m);
  assert.doesNotMatch(answer,/^П Р Е С У Д А/m);
  assert.doesNotMatch(answer,/^СЕ РАЗВЕДУВА/m);
});

test("the real lawsuit request stays in the separate divorce petition lane",()=>{
  const q="Направи ми тужба за развод со измислени имиња";
  assert.equal(isFamilyPrelitigationNoticeRequest(q),false);
  assert.equal(isFamilyDivorceDraftRequest(q),true);
  assert.match(formatFamilyDivorceDraft(q),/^ТУЖБА ЗА РАЗВОД НА БРАК/m);
  assert.equal(isFamilyPrelitigationNoticeRequest("Направи тужба за развод, а не опомена"),false);
  assert.equal(isFamilyDivorceDraftRequest("Направи тужба за развод, а не опомена"),true);
  assert.equal(isFamilyPrelitigationNoticeRequest("Како се поведува постапка за развод?"),false);
});

test("voluntary notice preserves primary sources and never invents a required warning",()=>{
  const sources=familyPrelitigationNoticeLegalSources();
  assert.equal(sources.length,4);
  assert.deepEqual(sources[0].articles,["39","229","237"]);
  assert.ok(sources.some(row=>row.relation==="family_law_lineage_outside_divorce_procedure" && row.affectedDivorceNoticeProvisions===false));
  assert.ok(formatFamilyPrelitigationNotice(exactZoranPrompt).includes("У.бр.57/2025"));
  assert.ok(sources.some(s=>s.url.includes("ldbis.pravda.gov.mk")));
  const t=formatFamilyPrelitigationNotice(exactZoranPrompt);
  assert.doesNotMatch(t,/задолжителна опомена пред тужба|автоматски развод|се смета дека сте согласни/iu);
  assert.match(t,/14 дена.*не е законски рок/isu);
  assert.match(t,/согласност или признание/);
});

test("worker external bot returns exact notice without calling an AI provider",async()=>{
  const {worker}=await loadWorker();
  let called=0;
  const url="https://ai-advokat-github-io.aiadvokat16.workers.dev/api/bot";
  const req=new Request(url,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({q:exactZoranPrompt,capabilityRoute:"SMART_DOCUMENTS",outputLanguage:"mk",history:[],mode:"auto"})});
  const res=await worker.fetch(req,{
    EXTERNAL_BOT_TRAINING_OPEN:"true",
    EXTERNAL_BOT_TRAINING_MONTHLY_QUOTA:"100",
    FREE_CHAT_PROVIDER:"workers_ai",
    AI:{run(){called++;throw Error("provider call forbidden in deterministic notice")}}
  },{});
  assert.equal(res.status,200);
  const data=await res.json();
  assert.equal(data.ok,true);
  assert.equal(data.sourceMode,"canonical_family_divorce_pre_litigation_notice_no_model");
  assert.match(data.answer,/ОПОМЕНА \/ ПОКАНА/);
  assert.doesNotMatch(data.answer,/III\. ТУЖБЕНО БАРАЊЕ/);
  assert.equal(data.performance.providerCalls,0);
  assert.equal(called,0);
  assert.equal(data.legalGovernance.humanReviewRequired,true);
  assert.equal(data.legalGovernance.executionAuthorization,"NO_EXTERNAL_ACTION");
});

test("external conversation contrast repair loads LAST and is theme-safe",()=>{
  const html=fs.readFileSync("bot/index.html","utf8");
  const css=fs.readFileSync("assets/zoki-conversation-contrast-r1.css","utf8");
  assert.ok(html.indexOf("/assets/zoki-conversation-contrast-r1.css")>html.indexOf("/assets/standalone-bot-r7.js"));
  assert.match(html,/name="ai-advokat-external-hotfix" content="P0-R29-readable-notice-20261117"/);
  assert.match(css,/data-external-experience="conversation"/);
  assert.match(css,/data-vnext-theme="dark"/);
  assert.match(css,/--zoki-ink:#192b3b/);
  assert.match(css,/--zoki-ink:#eef3f9/);
  assert.match(css,/\.message\.assistant/);
  assert.match(css,/\.message \.text/);
  assert.match(css,/\.bot-language-control select option/);
  assert.match(css,/color:var\(--zoki-ink\)!important/);
  assert.doesNotMatch(css,/\bdisplay:none\b/i);
});
