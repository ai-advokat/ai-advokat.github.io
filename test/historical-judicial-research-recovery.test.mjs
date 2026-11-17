import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  historicalJudicialResearchRecovery,
  isHistoricalJudicialPaperRequest,
  isTransientHistoricalResearchProviderFailure,
  HISTORICAL_JUDICIAL_RESEARCH_RECOVERY_VERSION,
  historicalJudicialResearchRecoveryPayload
} from "../src/historical-judicial-research-recovery.js";

const TRPE = "сакам да те замолам да ми направиш еден труд на тема: Судски пресуди во макеоднското судство во периодот оод 1991 до 2026 година, однапред мног ути благодарам ,со почит, Трпе";
const transient = {ok:false,error:"openai_incomplete_response",status:503,providerCalls:1};

test("real user research request with typo is recognized", () => {
  assert.equal(isHistoricalJudicialPaperRequest(TRPE), true);
  assert.equal(isHistoricalJudicialPaperRequest("Подготви научен труд за судската практика во Македонија 1991–2026"),true);
});

test("does not hijack personal litigation, court research without dates or non-MK studies", () => {
  for(const q of [
    "Напиши жалба за КОКЖ-43/25 и законската основа 1991-2026 во Македонија",
    "Подготви научен труд за судската практика во Македонија",
    "Напиши труд за европското судство 1991-2026",
    "Кога е рокот за жалба во судска постапка во Македонија 1991-2026?",
    "Направи истражувачки труд за судски пресуди во Македонија 2021-2026"
  ]) assert.equal(isHistoricalJudicialPaperRequest(q),false,q);
});

test("only bounded genuine provider faults may trigger source-based fallback", () => {
  for(const error of [
    "openai_network_error","openai_timeout_error","openai_incomplete_response",
    "openai_empty_response","workers_ai_daily_capacity_exhausted","workers_ai_timeout"
  ]) assert.equal(isTransientHistoricalResearchProviderFailure({ok:false,error}),true,error);
  assert.equal(isTransientHistoricalResearchProviderFailure({ok:false,error:"openai_response_error",status:503}),true);
  for(const error of [
    "case_law_claim_release_blocked","macedonian_language_release_blocked",
    "privacy_gate_failed","legal_postflight_failed","invalid_chat_history",
    "openai_response_error"
  ]) assert.equal(isTransientHistoricalResearchProviderFailure({ok:false,error,status:400}),false,error);
  assert.equal(isTransientHistoricalResearchProviderFailure({ok:true,error:"openai_timeout_error"}),false);
});

test("on 503 it returns a substantive, accurately labelled corpus research outline", () => {
  const answer=historicalJudicialResearchRecovery(TRPE,transient);
  assert.ok(answer);
  assert.match(answer.answer,/1991–2026/);
  assert.match(answer.answer,/РАБОТНА ИСТРАЖУВАЧКА РАМКА/);
  assert.match(answer.answer,/ПРЕДЛОГ-АПСТРАКТ/);
  assert.match(answer.answer,/ИСТРАЖУВАЧКИ ПРАШАЊА/);
  assert.match(answer.answer,/ПРЕДЛОГ-СТРУКТУРА/);
  assert.match(answer.answer,/МАТРИЦА ЗА СЕКОЈА ПРЕСУДА/);
  assert.match(answer.answer,/НЕ готов или рецензиран труд/);
  assert.match(answer.answer,/Нема потврда за целосна покриеност/);
  assert.match(answer.answer,/item-level проверка/);
  assert.equal(answer.years.from,1991);
  assert.equal(answer.years.to,2026);
  assert.equal(answer.sources.length,6);
  assert.ok(answer.sources.every(s=>s.discoveryOnly===true && s.legalAuthority===false && s.humanReviewRequired===true));
  assert.ok(answer.sources.every(s=>s.url.startsWith("https://")));
  assert.ok(answer.sources.some(s=>s.period==="1997"));
  assert.ok(answer.sources.some(s=>s.period==="2003, 2017"));
  assert.equal(new Set(answer.sources.map(s=>s.title)).size,6);
  assert.equal(HISTORICAL_JUDICIAL_RESEARCH_RECOVERY_VERSION,"HISTORICAL_JUDICIAL_RESEARCH_SOURCE_FIRST_R1");
});

test("does not release a source-indexed research outline on model success or safety gate failure", () => {
  assert.equal(historicalJudicialResearchRecovery(TRPE,{ok:true,answer:"finished article"}),null);
  assert.equal(historicalJudicialResearchRecovery(TRPE,{ok:false,error:"case_law_claim_release_blocked",status:503}),null);
  assert.equal(historicalJudicialResearchRecovery("Дали е правосилна КЖ-999/2022?",transient),null);
});

test("fallback logic runs before generic 503 but after actual model attempt, and returns no legal authority", () => {
  const worker=fs.readFileSync("src/index.js","utf8");
  const pos=worker.indexOf("const historicalResearchRecovery=");
  const generic=worker.indexOf('message:"AI runtime не успеа безбедно');
  const provider=worker.indexOf("let result=canonicalExactArticleSourceFirst");
  assert.ok(provider>0 && pos>provider && generic>pos,{pos,generic,provider});
  const section=worker.slice(pos,generic);
  assert.match(section,/historicalJudicialResearchRecovery\(q,result\)/);
  assert.match(section,/explicitWebRequested!==true/);
  assert.match(section,/attachmentCheck.attachments.length===0/);
  assert.match(section,/guideDocumentCheck.attachments.length===0/);
  assert.match(section,/historyCheck.history.length===0/);
  assert.match(section,/await releaseMonthlyQuota\(env,\{subject,period\}\)/);
  assert.match(section,/historicalJudicialResearchRecoveryPayload\(historicalResearchRecovery/);
  assert.match(section,/from:"openai"/);
  assert.match(worker,/return json\(request,historicalJudicialResearchRecoveryPayload\(freeResearchRecovery/);
  assert.match(worker,/from:"workers_ai"/);
  assert.match(worker,/if \(url.pathname === "\/api\/chat"\) return handleGPTChat\(request, env\)/);
  assert.match(worker,/if \(url.pathname === "\/api\/bot"\) return handleGPTChat\(request, env, \{openAIOnly:true\}\)/);
  assert.match(section,/sourceCount:historicalResearchRecovery.sources.length/);
  const contract=fs.readFileSync("src/historical-judicial-research-recovery.js","utf8");
  assert.match(contract,/researchOutputStatus:"OUTLINE_ONLY_NOT_COMPLETED_PAPER"/);
  assert.match(contract,/executionAuthorization:"NO_EXTERNAL_ACTION"/);
  assert.match(contract,/humanReviewRequired:true/);
});

test("no AI, HTTP, browser storage or confidential data is accessed by the fallback module", () => {
  const source=fs.readFileSync("src/historical-judicial-research-recovery.js","utf8");
  assert.doesNotMatch(source,/\bfetch\s*\(|\bAI\.run\s*\(|\blocalStorage\b|\bsessionStorage\b|\bD1\b|\bprocess\.env\b/);
});


test("single recovery payload is invariant for FREE, external and Academy routes", () => {
  const recovery=historicalJudicialResearchRecovery(TRPE,transient);
  const free=historicalJudicialResearchRecoveryPayload(recovery,{
    from:"workers_ai", failure:{ok:false,error:"workers_ai_daily_capacity_exhausted"},
    providerCalls:1, missionProfile:"L1_VERIFIED_RESEARCH", trainingOpen:true, used:4, quota:20
  });
  const pro=historicalJudicialResearchRecoveryPayload(recovery,{
    from:"openai", failure:transient,
    providerCalls:2, missionProfile:"L1_VERIFIED_RESEARCH", membership:{planCode:"PRO"}, used:4, quota:20
  });
  for(const payload of [free,pro]){
    assert.equal(payload.ok,true);
    assert.equal(payload.model,null);
    assert.equal(payload.provider,"canonical_corpus_no_model");
    assert.equal(payload.sourceMode,"historical_judicial_research_outline_registry_no_model");
    assert.equal(payload.researchOutputStatus,"OUTLINE_ONLY_NOT_COMPLETED_PAPER");
    assert.equal(payload.legalGovernance.releaseState,"RESEARCH_OUTLINE_ONLY");
    assert.equal(payload.legalGovernance.humanReviewRequired,true);
    assert.equal(payload.legalGovernance.executionAuthorization,"NO_EXTERNAL_ACTION");
    if(payload.membership.monthlyQuota!==undefined) assert.equal(payload.membership.used,3);
    else assert.equal(payload.membership.planCode,"training");
    assert.equal(payload.caseLawSources.length,6);
    assert.deepEqual(payload.sources,[]);
  }
  assert.equal(free.answer,pro.answer);
  assert.equal(free.providerFallback.from,"workers_ai");
  assert.equal(free.membership.trainingOpen,true);
  assert.equal(pro.membership.used,3);
  assert.equal(pro.providerFallback.from,"openai");
  assert.equal(free.performance.deterministicRecoveryProviderCalls,0);
});
test("Academy only embeds the single existing external bot",()=>{
  const academy=fs.readFileSync("assets/academy-ai-advokat-chat.js","utf8");
  assert.match(academy,/workers\.dev\/bot\//);
  assert.match(academy,/createElement\('iframe'\)/);
  assert.doesNotMatch(academy,/api\/chat|api\/bot|fetch\(/);
});


test("main FREE route preserves actual provider classification, never generic safety failures",()=>{
  const okCases=[
    {ok:false,error:"free_workers_ai_provider_error",upstreamErrorCategory:"workers_ai_timeout",retryable:true,providerCalls:1},
    {ok:false,error:"free_workers_ai_provider_error",upstreamErrorCategory:"workers_ai_provider_error",retryable:true,providerCalls:1},
    {ok:false,error:"free_workers_ai_empty_response",upstreamErrorCategory:"workers_ai_empty_response",retryable:true,providerCalls:1}
  ];
  for(const failure of okCases){
    assert.equal(isTransientHistoricalResearchProviderFailure(failure),true);
    assert.ok(historicalJudicialResearchRecovery(TRPE,failure));
  }
  const blocked=[
    {ok:false,error:"free_workers_ai_provider_error",retryable:true,providerCalls:1},
    {ok:false,error:"free_workers_ai_provider_error",upstreamErrorCategory:"security_gate_failed",retryable:true,providerCalls:1},
    {ok:false,error:"free_workers_ai_provider_error",upstreamErrorCategory:"workers_ai_timeout",retryable:false,providerCalls:1},
    {ok:false,error:"free_workers_ai_provider_error",upstreamErrorCategory:"workers_ai_timeout",retryable:true,providerCalls:0},
    {ok:false,error:"free_workers_ai_empty_response",upstreamErrorCategory:"workers_ai_provider_error",retryable:true,providerCalls:1}
  ];
  for(const failure of blocked)assert.equal(isTransientHistoricalResearchProviderFailure(failure),false);
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/upstreamErrorCategory:\["workers_ai_provider_error","workers_ai_timeout","workers_ai_empty_response"\]/);
});
