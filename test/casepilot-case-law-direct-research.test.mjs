import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildCaseLawComparison} from "../src/casepilot-case-law-bridge.js";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

const reviewedRecord={
  id:7,
  case_title:"Example reviewed case",
  court:"Supreme Court",
  case_number:"Rev-7/2026",
  jurisdiction:"MK",
  decision_date:"2026-01-10",
  source_status:"official",
  source_url:"https://example.invalid/case/7",
  human_review_status:"reviewed",
  authority_review_status:"approved",
  outcome_side:"supporting"
};

test("direct CasePilot case-law endpoint forces governed LIOE engagement",()=>{
  const start=worker.indexOf("async function handleCasePilotCaseLawResearch");
  const end=worker.indexOf("async function handleLegalAnalyzerVerify",start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/directResearchPlan/);
  assert.match(block,/engaged:true/);
  assert.match(block,/engagementReason:"direct_case_law_research_endpoint"/);
  assert.match(block,/governedCaseLawContext\(env,query,directResearchPlan,\{limit:6\}\)/);
});

test("unclassified reviewed authority stays neutral even if outcome field looks favourable",()=>{
  const comparison=buildCaseLawComparison([reviewedRecord],{roleAssignments:{}});
  assert.equal(comparison.cards.length,1);
  assert.equal(comparison.cards[0].role,"neutral");
  assert.equal(comparison.byRole.supporting.length,0);
  assert.equal(comparison.byRole.neutral.length,1);
});

test("explicit lawyer role assignment overrides neutral default",()=>{
  const comparison=buildCaseLawComparison([reviewedRecord],{
    roleAssignments:{
      "7":{role:"supporting",reason:"Issue-specific lawyer classification."}
    }
  });
  assert.equal(comparison.cards[0].role,"supporting");
  assert.equal(comparison.cards[0].roleReason,"Issue-specific lawyer classification.");
});

test("direct endpoint still rejects private matter body fields",()=>{
  const start=worker.indexOf("async function handleCasePilotCaseLawResearch");
  const end=worker.indexOf("async function handleLegalAnalyzerVerify",start);
  const block=worker.slice(start,end);
  for(const field of ["documentText","fullText","matterText","attachments","documents"]){
    assert.match(block,new RegExp(field));
  }
  assert.match(block,/private_matter_content_not_accepted/);
});
