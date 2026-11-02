import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";

const {workerModule}=await loadWorker();
const {professionalL0WorkersFallbackEligible}=workerModule;
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

test("Professional fallback contract remains transparent and membership-aware",()=>{
  const handle=workerSource.slice(workerSource.indexOf("async function handleGPTChat"),workerSource.indexOf("async function handleAssistant"));
  assert.match(handle,/professionalL0WorkersFallbackEligible/);
  assert.match(handle,/professionalFallback:true/);
  assert.match(handle,/primaryResult:result/);
  assert.match(handle,/professional_l0_workers_ai_provider_fallback/);
  assert.match(handle,/fallbackRuntimeAssessment\?\.releaseState\|\|"PROVISIONAL_RESEARCH"/);
  assert.match(handle,/providerFallbackMode:professionalFallbackActive \? "PROFESSIONAL_L0_WORKERS_AI"/);
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
