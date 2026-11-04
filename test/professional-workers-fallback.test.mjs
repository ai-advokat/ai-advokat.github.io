import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";

const {workerModule}=await loadWorker();
const {professionalL0WorkersFallbackEligible,professionalResearchWorkersFallbackEligible,professionalDegradedDraftFallbackEligible}=workerModule;
const workerSource=fs.readFileSync("src/index.js","utf8");

const membership={planCode:"office"};
const transient429={error:"openai_response_error",status:429,providerCalls:2};

test("Professional L0 informational traffic may use governed Workers fallback after transient OpenAI 429",()=>{
  assert.equal(professionalL0WorkersFallbackEligible({
    membership,
    missionProfile:"L0_INFORMATIONAL",
    postflightRequired:false,
    explicitWebRequested:false,
    webRequested:false,
    attachmentCount:0,
    guideDocumentCount:0,
    result:transient429
  }),true);
});

test("Professional fallback stays fail-closed outside the exact low-risk boundary",()=>{
  const base={
    membership,
    missionProfile:"L0_INFORMATIONAL",
    postflightRequired:false,
    explicitWebRequested:false,
    attachmentCount:0,
    guideDocumentCount:0,
    result:transient429
  };
  assert.equal(professionalL0WorkersFallbackEligible({...base,membership:null}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,missionProfile:"L1_VERIFIED_RESEARCH"}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,missionProfile:"L2_STRATEGY_PROCEDURE"}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,postflightRequired:true}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,explicitWebRequested:true}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,webRequested:true}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,attachmentCount:1}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,guideDocumentCount:1}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"openai_authentication_error",status:401}}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"specialist_execution_failed",status:503}}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"orchestrator_precondition_failed",status:503}}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"openai_response_error",status:400}}),false);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"openai_timeout_error"}}),true);
  assert.equal(professionalL0WorkersFallbackEligible({...base,result:{error:"openai_response_error",status:503}}),true);
});

test("Professional L1 research and GENERAL traffic may use bounded Workers fallback after transient OpenAI failure",()=>{
  const base={
    membership,
    postflightRequired:false,
    explicitWebRequested:false,
    webRequested:false,
    attachmentCount:0,
    guideDocumentCount:0,
    result:{error:"openai_response_error",status:503,providerCalls:2}
  };
  assert.equal(professionalResearchWorkersFallbackEligible({...base,missionProfile:"L1_VERIFIED_RESEARCH"}),true);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,missionProfile:"GENERAL_BYPASS"}),true);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,missionProfile:"L0_INFORMATIONAL"}),false);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,missionProfile:"L2_STRATEGY_PROCEDURE"}),false);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,postflightRequired:true,missionProfile:"L1_VERIFIED_RESEARCH"}),false);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,explicitWebRequested:true,missionProfile:"L1_VERIFIED_RESEARCH"}),false);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,webRequested:true,missionProfile:"L1_VERIFIED_RESEARCH"}),true);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,attachmentCount:1,missionProfile:"L1_VERIFIED_RESEARCH"}),false);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,result:{error:"openai_response_error",status:400},missionProfile:"L1_VERIFIED_RESEARCH"}),false);
});

test("Professional research fallback is surfaced transparently in runtime metadata",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/professionalResearchWorkersFallbackEligible/);
  assert.match(handle,/PROFESSIONAL_RESEARCH_WORKERS_AI/);
  assert.match(handle,/professional_workers_ai_research_fallback/);
  assert.match(handle,/professional_research_workers_ai_provider_fallback/);
});

test("Professional fallback contract remains transparent and membership-aware",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/professionalL0WorkersFallbackEligible/);
  assert.match(handle,/professionalFallback:true/);
  assert.match(handle,/primaryResult:result/);
  assert.match(handle,/professional_l0_workers_ai_provider_fallback/);
  assert.match(handle,/fallbackRuntimeAssessment\?\.releaseState\|\|"PROVISIONAL_RESEARCH"/);
  assert.match(handle,/PROFESSIONAL_L0_WORKERS_AI/);
  assert.match(handle,/PROFESSIONAL_DEGRADED_DRAFT_WORKERS_AI/);
  assert.match(handle,/planCode:fallbackPlanCode/);
  assert.match(handle,/professional_workers_ai_fallback/);
  assert.match(handle,/primaryProviderState:professionalFallbackActive \? "FAILED_FALLBACK_RELEASED"/);
});

test("Zoki 2026-11-02 diagnostic evidence stays bounded to the two supplied run ids",()=>{
  const diagnostic=JSON.parse(fs.readFileSync(".github/diagnostics/lioe-runtime-article12-20261101.json","utf8"));
  assert.deepEqual(diagnostic.run_ids,[
    "LIOE-RT-20261102170112-fe0d0fa3",
    "LIOE-RT-20261102170154-da6d0b8b"
  ]);
  assert.match(diagnostic.privacy_boundary,/technical telemetry only/i);
});


test("L0 informational Auto mode does not force proactive external web research",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/const initialMissionProfile=initialPlan\.legalIntelligenceEngine\?\.mission_profile\?\.id\|\|"GENERAL_BYPASS"/);
  assert.match(handle,/initialMissionProfile!=="L0_INFORMATIONAL"/);
  assert.match(handle,/professionalL0WorkersFallbackEligible\(\{[\s\S]*?webRequested,/);
});


test("Professional L2/L3 may use degraded drafting after transient provider failure even when no governed current-law context matches",()=>{
  const base={
    membership,
    postflightRequired:true,
    explicitWebRequested:false,
    attachmentCount:0,
    guideDocumentCount:0,
    result:transient429
  };
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L2_STRATEGY_PROCEDURE"}),true);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL"}),true);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L4_LEGAL_TRUTH_GOVERNANCE"}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L1_VERIFIED_RESEARCH"}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",membership:null}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",postflightRequired:false}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",explicitWebRequested:true}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",attachmentCount:1}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",guideDocumentCount:1}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL"}),true);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",result:{error:"openai_authentication_error",status:401}}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L2_STRATEGY_PROCEDURE",result:{error:"openai_response_error",status:400}}),false);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L2_STRATEGY_PROCEDURE",result:{error:"openai_timeout_error"}}),true);
  assert.equal(professionalDegradedDraftFallbackEligible({...base,missionProfile:"L3_CONSEQUENTIAL",result:{error:"openai_response_error",status:503}}),true);
});

test("Degraded Professional draft keeps Human Gate, no-action L3 boundary and strips unverified article numbers",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/professionalDegradedDraftFallbackEligible/);
  assert.match(handle,/professional_degraded_draft_fallback/);
  assert.match(handle,/professional_degraded_workers_ai_provider_fallback/);
  assert.match(handle,/NOT_EXECUTED_PRIMARY_PROVIDER_UNAVAILABLE/);
  assert.match(handle,/NOT_EXECUTED_PROVIDER_UNAVAILABLE/);
  assert.match(handle,/replaceUngroundedArticleReferences\(releasedFallbackText/);
  assert.match(handle,/hasGovernedLegalContext:false/);
  assert.match(handle,/ЧОВЕЧКА ПРОВЕРКА ПРЕД ПОДНЕСУВАЊЕ/u);
  assert.match(handle,/fallbackRuntimeAssessment\?\.executionAuthorization\|\|"RESEARCH_OUTPUT_ONLY"/);
  assert.match(handle,/PROFESSIONAL_DEGRADED_DRAFT_WORKERS_AI/);
  assert.match(handle,/NO_GOVERNED_CURRENT_LAW_CONTEXT/);
  assert.match(handle,/professional_degraded_structure_only_workers_ai_fallback/);
  assert.match(handle,/NOT_ESTABLISHED_NO_GOVERNED_CONTEXT/);
  assert.match(handle,/РАБОТЕН ШАБЛОН — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА/u);
  assert.match(workerSource,/ZERO-GOVERNED-CONTEXT SAFETY/);
  assert.match(workerSource,/\[ДА СЕ ПРОВЕРИ ВО ВАЖЕЧКИ ОФИЦИЈАЛЕН ИЗВОР\]/u);
});


test("Professional L1 bounded fallback permits auto-elevated web intent but not explicit web request",()=>{
  const base={
    membership,
    missionProfile:"L1_VERIFIED_RESEARCH",
    postflightRequired:false,
    explicitWebRequested:false,
    webRequested:true,
    attachmentCount:0,
    guideDocumentCount:0,
    result:{error:"openai_response_error",status:503,providerCalls:2}
  };
  assert.equal(professionalResearchWorkersFallbackEligible(base),true);
  assert.equal(professionalResearchWorkersFallbackEligible({...base,explicitWebRequested:true}),false);
});


test("dual-provider failure preserves primary OpenAI provenance when Workers fallback also fails",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/providerFallback:professionalFallback && fallbackReason/);
  assert.match(handle,/from:"openai"/);
  assert.match(handle,/to:"workers_ai"/);
  assert.match(handle,/primaryProviderCalls:Number\(primaryProviderCalls\|\|primaryResult\?\.providerCalls\|\|0\)/);
  assert.match(handle,/primaryHttpStatus:Number\(primaryResult\?\.status\|\|0\)\|\|null/);
  assert.match(handle,/fallbackState:capacityExhausted \? "capacity_exhausted" : "failed"/);
});


test("OpenAI 429 must not replay the full multi-call Professional orchestrator",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/\[408,500,502,503,504\]\.includes\(transientStatus\)/);
  assert.doesNotMatch(handle,/\[408,429,500,502,503,504\]\.includes\(transientStatus\)/);
  assert.match(handle,/Do not immediately replay the whole multi-call orchestrator on HTTP 429/);
});
