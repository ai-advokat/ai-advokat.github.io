import test from "node:test";
import assert from "node:assert/strict";
import {
  VERSION,
  LEGAL_MISSION_PROFILES,
  buildLegalIntelligencePlan,
  evaluateLegalEarlyExit,
  buildLegalRunRecord
} from "../src/legal-intelligence-engine.js";

test("LIOE version and profiles are canonical",()=>{
  assert.equal(VERSION,"ai-advokat-lioe-1.0.0");
  assert.equal(LEGAL_MISSION_PROFILES.L4_LEGAL_TRUTH_GOVERNANCE.specialistBudget,10);
});

test("general task bypasses legal engine",()=>{
  const p=buildLegalIntelligencePlan("Напиши кратка деловна порака.",{mode:"general_gpt",selectedAgents:["general_gpt_assistant"]});
  assert.equal(p.engaged,false);
  assert.equal(p.mission_profile.id,"GENERAL_BYPASS");
  assert.equal(p.knowledge.source_first,false);
});

test("simple guide orientation remains lightweight",()=>{
  const p=buildLegalIntelligencePlan("Каде во AI Advokat е водичот за наследство?",{mode:"passive_corpus",selectedAgents:["ai_advokat_knowledge"]});
  assert.equal(p.mission_profile.id,"L0_INFORMATIONAL");
  assert.equal(p.early_exit.allowed,true);
});

test("current Macedonian law requires temporal and source verification",()=>{
  const p=buildLegalIntelligencePlan("Што вели важечкото македонско право денес?",{selectedAgents:["macedonian_law"]});
  assert.equal(p.mission_profile.id,"L1_VERIFIED_RESEARCH");
  assert.equal(p.knowledge.current_law_verification_required,true);
  assert.equal(p.knowledge.effective_date_required,true);
  assert.equal(p.assurance.source_freshness_required,true);
});

test("comparative legal research becomes strategy-procedure depth",()=>{
  const p=buildLegalIntelligencePlan("Спореди македонско право, ЕУ право и пракса на ЕСЧП.",{selectedAgents:["macedonian_law","eu_law","echr_law"]});
  assert.equal(p.mission_profile.id,"L2_STRATEGY_PROCEDURE");
  assert.equal(p.system_map.required,true);
  assert.equal(p.legal_stress_test.required,true);
  assert.equal(p.adversarial_review.required,true);
});

test("final pleading request is consequential and cannot file autonomously",()=>{
  const p=buildLegalIntelligencePlan("Подготви финален поднесок за поднесување до суд и испрати го.",{selectedAgents:["macedonian_law"]});
  assert.equal(p.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(p.authority_and_human_gate.human_review_required,true);
  assert.ok(p.authority_and_human_gate.required_gate_types.includes("author_approval"));
  assert.equal(p.implementation.no_autonomous_filing,true);
});

test("drafting a divorce complaint is consequential and requires Human Gate",()=>{
  const p=buildLegalIntelligencePlan("Подготви тужба за развод со placeholders и докази.",{selectedAgents:["macedonian_law"]});
  assert.equal(p.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(p.authority_and_human_gate.human_review_required,true);
  assert.ok(p.authority_and_human_gate.required_gate_types.includes("author_approval"));
  assert.equal(p.implementation.no_autonomous_filing,true);
});

test("natural Macedonian request to make a divorce complaint is consequential",()=>{
  const p=buildLegalIntelligencePlan("Да те замолам да ми направиш тужба за развод!",{selectedAgents:["macedonian_law"]});
  assert.equal(p.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(p.authority_and_human_gate.human_review_required,true);
  assert.ok(p.authority_and_human_gate.required_gate_types.includes("author_approval"));
  assert.equal(p.implementation.no_autonomous_filing,true);
});

test("English complaint drafting is also consequential",()=>{
  const p=buildLegalIntelligencePlan("Draft a divorce complaint under North Macedonian law.",{selectedAgents:["macedonian_law"]});
  assert.equal(p.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(p.implementation.no_autonomous_legal_representation,true);
});

test("production corpus promotion is L4 and fail-closed",()=>{
  const p=buildLegalIntelligencePlan("Прогласи ја оваа верзија за важечка и внеси ја во production corpus.",{selectedAgents:["macedonian_law","verification_citation"],codeOrCorpusChange:true});
  assert.equal(p.mission_profile.id,"L4_LEGAL_TRUTH_GOVERNANCE");
  assert.ok(p.authority_and_human_gate.required_gate_types.includes("production_corpus_write"));
  assert.equal(p.implementation.no_autonomous_current_law_promotion,true);
  assert.equal(p.implementation.rollback_reference_required,true);
});

test("future-law wording keeps commencement and application date separate",()=>{
  const p=buildLegalIntelligencePlan("Новиот закон е објавен, но ќе почне да се применува подоцна. Кое право важи денес?");
  assert.equal(p.mission_profile.id,"L1_VERIFIED_RESEARCH");
  assert.equal(p.knowledge.application_date_required,true);
  assert.equal(p.knowledge.transitional_provisions_check,true);
});

test("legal early exit is blocked when temporal status is unresolved",()=>{
  const p=buildLegalIntelligencePlan("Што вели важечкото право денес?");
  const e=evaluateLegalEarlyExit(p,{objectiveResolved:true,sourcesSufficient:true,jurisdictionClear:true,temporalStatusClear:false,contraryAuthorityUnresolved:false});
  assert.equal(e.allowed,false);
});

test("legal early exit can close low-consequence verified orientation",()=>{
  const p=buildLegalIntelligencePlan("Каде е водичот за наследство?",{mode:"passive_corpus"});
  const e=evaluateLegalEarlyExit(p,{objectiveResolved:true,sourcesSufficient:true,jurisdictionClear:true,temporalStatusClear:true,contraryAuthorityUnresolved:false});
  assert.equal(e.allowed,true);
});

test("run record starts blocked and does not invent verification",()=>{
  const p=buildLegalIntelligencePlan("Спореди ги опциите за жалба и роковите.",{selectedAgents:["macedonian_law"]});
  const r=buildLegalRunRecord(p,{runId:"TEST-001",startedAt:"2026-10-06T00:08:00+02:00",jurisdictions:["MK"]});
  assert.equal(r.run_id,"TEST-001");
  assert.equal(r.verification_state,"PENDING");
  assert.equal(r.release_status,"BLOCKED");
  assert.equal(r.outcome_state,"UNKNOWN");
});
