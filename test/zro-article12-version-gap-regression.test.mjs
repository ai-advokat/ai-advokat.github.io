import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {loadWorker} from "./load-worker.mjs";
import {buildAgentPlan} from "../src/agent-orchestrator.js";

const {workerModule}=await loadWorker();
const {professionalExactArticleSourceGapFallback}=workerModule;
const EXACT_Q="Што уредува член 12 од ЗРО и кои услови ги предвидува? Не измислувај членови или содржина. Наведи го точниот извор и важечката верзија.";

test("exact Article 12 request is L1 current-law research",()=>{
  const plan=buildAgentPlan(EXACT_Q,{preferCorpus:true});
  assert.equal(plan.legalIntelligenceEngine.mission_profile.id,"L1_VERIFIED_RESEARCH");
  assert.equal(plan.legalIntelligenceEngine.knowledge.current_law_verification_required,true);
});

test("version_required becomes controlled source gap instead of generic runtime failure",()=>{
  const out=professionalExactArticleSourceGapFallback({
    q:EXACT_Q,
    articleBundle:{
      state:"version_required",
      instrument:{canonicalKey:"mk:zro",title:"Закон за работните односи",jurisdiction:"MK"},
      version:null,versionBasis:null,context:[],legalSources:[],articles:[]
    },
    missionProfile:"L1_VERIFIED_RESEARCH"
  });
  assert.ok(out);
  assert.equal(out.state,"version_required");
  assert.equal(out.requested,"12");
  assert.match(out.answer,/SOURCE\/VERSION GAP/);
  assert.match(out.answer,/не избира произволно една од повеќе верзии/);
});

test("warning-only article context is not treated as governed primary support",()=>{
  const src=fs.readFileSync("src/index.js","utf8");
  const handle=src.slice(src.indexOf("async function handleGPTChat"),src.indexOf("async function handleAssistant"));
  assert.match(handle,/articleBundle\.state==="matched"/);
  assert.match(handle,/gazetteBundle\.state==="matched"/);
  assert.match(handle,/caseLawBundle\.state==="matched"/);
  assert.match(handle,/displayMode:"professional_exact_article_source_gap"/);
});
