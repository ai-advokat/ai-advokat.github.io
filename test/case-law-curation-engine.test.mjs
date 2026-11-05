import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_LAW_CURATION_VERSION,
  CASE_LAW_1000_TARGET,
  scoreCaseForCuration,
  selectBalancedAuthorities,
  auditCaseLawDiversity,
  caseLawCurationPromptPolicy
} from "../src/case-law-curation-engine.js";

const worker=fs.readFileSync("src/index.js","utf8");
const prompt=fs.readFileSync("docs/standards/AI_ADVOKAT_CASE_LAW_CURATION_PROMPT_V1.md","utf8");

test("curation score uses the governed 100-point dimensions and never promotes authority",()=>{
  const out=scoreCaseForCuration({
    court_level:"supreme",
    legal_usefulness:20,
    recurrence:15,
    reasoning_quality:15,
    distinctiveness:10,
    recency:5,
    provenance_quality:10
  });
  assert.equal(out.version,CASE_LAW_CURATION_VERSION);
  assert.equal(out.total,100);
  assert.equal(out.class,"A");
  assert.equal(out.authorityPromotion,false);
  assert.equal(out.humanGateRequired,true);
});

test("1000-case target preserves authority and counter-authority allocation",()=>{
  assert.deepEqual(CASE_LAW_1000_TARGET,{
    supreme:250,
    appellate:350,
    constitutional:100,
    echr:150,
    first_instance_and_administrative:100,
    counter_authority_reserve:50
  });
  assert.equal(Object.values(CASE_LAW_1000_TARGET).reduce((a,b)=>a+b,0),1000);
});

test("balanced retrieval includes supporting adverse distinguishing and strongest authority when available",()=>{
  const rows=[
    {id:1,_score:10,outcome_side:"supporting",court_level:"appellate",decision_date:"2025-01-01"},
    {id:2,_score:9,outcome_side:"adverse",court_level:"appellate",decision_date:"2025-02-01"},
    {id:3,_score:8,outcome_side:"distinguishing",court_level:"basic",decision_date:"2025-03-01"},
    {id:4,_score:7,outcome_side:"neutral",court_level:"supreme",decision_date:"2024-12-01"},
    {id:5,_score:6,outcome_side:"neutral",court_level:"appellate",decision_date:"2025-04-01"}
  ];
  const out=selectBalancedAuthorities(rows,4);
  assert.equal(out.length,4);
  assert.ok(out.some(x=>x.outcome_side==="supporting"));
  assert.ok(out.some(x=>x.outcome_side==="adverse"));
  assert.ok(out.some(x=>x.outcome_side==="distinguishing"));
  assert.ok(out.some(x=>x.court_level==="supreme"));
});

test("diversity audit identifies under-covered areas instead of rewarding raw volume",()=>{
  const records=Array.from({length:40},(_,i)=>({i:i<30?"Неовластено производство и промет на наркотични дроги":"Перење пари"}));
  const out=auditCaseLawDiversity(records,1000);
  assert.equal(out.currentTotal,40);
  assert.equal(out.overconcentrationWarning,true);
  assert.ok(out.nextCollectionPriorities.some(x=>x.bucket==="evidence_and_fair_trial"));
  assert.match(out.rule,/coverage/i);
});

test("shared backend applies curation policy to both AI Advokat surfaces and exposes the curation plan",()=>{
  assert.match(worker,/selectBalancedAuthorities\(scoredRows/);
  assert.match(worker,/caseLawCurationPromptPolicy\(\)/);
  assert.match(worker,/\/api\/case-law\/curation-plan/);
  assert.match(worker,/\/api\/chat"\) return handleGPTChat/);
  assert.match(worker,/\/api\/bot"\) return handleGPTChat\(request, env, \{openAIOnly:true\}\)/);
  assert.match(caseLawCurationPromptPolicy(),/Do not cherry-pick favourable authority/);
});

test("master prompt preserves discovery and Human Gate boundaries",()=>{
  assert.match(prompt,/DISCOVERY ONLY/);
  assert.match(prompt,/OFFICIAL ITEM BOUND/);
  assert.match(prompt,/HUMAN REVIEWED/);
  assert.match(prompt,/PRODUCTION-CITABLE AUTHORITY/);
  assert.match(prompt,/Never auto-issue FINAL \/ AUTHORITATIVE/);
});
