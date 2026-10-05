#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLegalIntelligencePlan } from "../src/legal-intelligence-engine.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const suite=JSON.parse(fs.readFileSync(path.join(root,"data/legal-intelligence-evaluation-suite.json"),"utf8"));
const failures=[];
const fail=(id,msg)=>failures.push(`${id}: ${msg}`);

for(const item of suite.cases||[]){
  let mode=null;
  let agents=[];
  if(item.id==="LE01_GUIDE_ORIENTATION"){mode="passive_corpus";agents=["ai_advokat_knowledge"];}
  if(item.id==="LE02_CURRENT_MK_LAW"||item.id==="LE04_DEADLINE_STRATEGY"||item.id==="LE05_PLEADING_ACTION"||item.id==="LE06_CORPUS_PROMOTION"||item.id==="LE07_FUTURE_LAW"||item.id==="LE08_UNVERIFIED_SOURCE")agents=["macedonian_law","verification_citation"];
  if(item.id==="LE03_COMPARATIVE")agents=["macedonian_law","eu_law","echr_law","verification_citation"];
  if(item.id==="LE09_GENERAL_BYPASS"){mode="general_gpt";agents=["general_gpt_assistant"];}

  const p=buildLegalIntelligencePlan(item.input,{mode,selectedAgents:agents,codeOrCorpusChange:item.id==="LE06_CORPUS_PROMOTION"});
  if(p.mission_profile.id!==item.expected_profile)fail(item.id,`expected ${item.expected_profile}, got ${p.mission_profile.id}`);

  for(const req of item.required||[]){
    if(req==="corpus_or_guide_route"&&!(p.mode==="passive_corpus"||p.problem_class==="legal_orientation_and_guides"))fail(item.id,"missing guide/corpus route");
    if(req==="mk_specialist"&&!p.specialist_routing.selected_agents.includes("macedonian_law"))fail(item.id,"missing MK specialist");
    if(req==="official_source_version_check"&&!(p.knowledge.official_source_priority&&p.knowledge.current_law_verification_required))fail(item.id,"missing current-law source/version check");
    if(req==="verification"&&!p.specialist_routing.verification_agent_required)fail(item.id,"verification not required");
    if(req==="jurisdiction_separation"&&!p.specialist_routing.jurisdiction_blending_forbidden)fail(item.id,"jurisdiction blending not forbidden");
    if(req==="multiple_specialists"&&p.specialist_routing.selected_agents.length<3)fail(item.id,"comparison lacks multiple specialists");
    if(req==="adversarial_review"&&!p.adversarial_review.required)fail(item.id,"adversarial review not required");
    if(req==="deadline_map"&&!p.system_map.dimensions.includes("deadlines"))fail(item.id,"deadline dimension missing");
    if(req==="options"&&!p.options.required)fail(item.id,"options not required");
    if(req==="legal_stress_test"&&!p.legal_stress_test.required)fail(item.id,"legal stress test not required");
    if(req==="human_gate"&&!p.authority_and_human_gate.human_review_required)fail(item.id,"human review not required");
    if(req==="no_autonomous_filing"&&!p.implementation.no_autonomous_filing)fail(item.id,"autonomous filing not blocked");
    if(req==="current_law_verification"&&!p.knowledge.current_law_verification_required)fail(item.id,"current-law verification not required");
    if(req==="production_corpus_write_gate"&&!p.authority_and_human_gate.required_gate_types.includes("production_corpus_write"))fail(item.id,"production corpus gate missing");
    if(req==="no_auto_promotion"&&!p.implementation.no_autonomous_current_law_promotion)fail(item.id,"automatic current-law promotion not blocked");
    if(req==="commencement_application_distinction"&&!(p.knowledge.effective_date_required&&p.knowledge.application_date_required))fail(item.id,"temporal distinction missing");
    if(req==="temporal_status"&&!p.knowledge.transitional_provisions_check)fail(item.id,"transitional check missing");
    if(req==="fail_closed"&&!p.assurance.unknown_is_not_verified)fail(item.id,"unknown-is-not-verified missing");
    if(req==="general_assistant"&&!p.specialist_routing.selected_agents.includes("general_gpt_assistant"))fail(item.id,"general assistant missing");
  }

  for(const forb of item.forbidden||[]){
    if(forb==="full_specialist_fanout"&&p.specialist_routing.selected_agents.length>2)fail(item.id,"over-routed simple guide task");
    if(forb==="current_law_promotion"&&!p.implementation.no_autonomous_current_law_promotion)fail(item.id,"auto current-law promotion allowed");
    if(forb==="invented_current_law"&&!p.assurance.unknown_is_not_verified)fail(item.id,"unknown current law could be invented");
    if(forb==="legal_specialist_fanout"&&p.specialist_routing.selected_agents.some(x=>x!=="general_gpt_assistant"))fail(item.id,"general task routed to legal specialists");
  }
}

if(failures.length){
  console.error("AI Advokat LIOE canonical evaluation: FAIL");
  failures.forEach((x,i)=>console.error(`${i+1}. ${x}`));
  process.exit(1);
}
console.log(`AI Advokat LIOE canonical evaluation: PASS (${suite.cases.length} cases)`);
