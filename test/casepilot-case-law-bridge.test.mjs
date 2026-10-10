import test from "node:test";
import assert from "node:assert/strict";
import {
  caseLawRecordEligible,
  toCasePilotAuthorityCard,
  buildCaseLawComparison
} from "../src/casepilot-case-law-bridge.js";

const base={
  id:1,
  case_title:"Решение",
  court:"Врховен суд",
  case_number:"КЖ-101/2026",
  jurisdiction:"MK",
  court_level:"supreme",
  decision_type:"decision",
  decision_date:"2026-09-10",
  finality_status:"final",
  precedential_weight:"strong_persuasive",
  outcome_side:"neutral",
  legal_issue_keys:"притвор жалба",
  domestic_articles:"ЗКП",
  reviewed_holdings:"Притворот бара конкретно образложена нужност.",
  outcome_summary:"Жалбата е разгледана.",
  reasoning_summary:"Судот ја оценува нужноста.",
  source_url:"https://www.vrhoven.sud.mk/test-case",
  source_status:"official",
  human_review_status:"reviewed",
  authority_review_status:"reviewed"
};

test("only official dual-reviewed records are eligible",()=>{
  assert.equal(caseLawRecordEligible(base),true);
  assert.equal(caseLawRecordEligible({...base,source_status:"verified"}),false);
  assert.equal(caseLawRecordEligible({...base,human_review_status:"pending"}),false);
  assert.equal(caseLawRecordEligible({...base,authority_review_status:"pending"}),false);
  assert.equal(caseLawRecordEligible({...base,source_url:"http://example.com"}),false);
});

test("authority cards preserve source and review state",()=>{
  const card=toCasePilotAuthorityCard(base,{role:"adverse",roleReason:"Materially cuts against the proposed argument."});
  assert.equal(card.role,"adverse");
  assert.match(card.sourceUrl,/vrhoven/);
  assert.equal(card.sourceClass,"official_reviewed_case_law");
  assert.equal(card.humanGateRequired,true);
  assert.equal(card.authorityReviewStatus,"reviewed");
});

test("outcome alone does not force a supporting role",()=>{
  const card=toCasePilotAuthorityCard({...base,outcome_side:"favourable"});
  assert.equal(card.role,"neutral");
});

test("comparison preserves supporting, adverse, distinguishing and neutral buckets",()=>{
  const records=[
    base,
    {...base,id:2,case_number:"КЖ-102/2026"},
    {...base,id:3,case_number:"КЖ-103/2026"},
    {...base,id:4,case_number:"КЖ-104/2026"}
  ];
  const out=buildCaseLawComparison(records,{roleAssignments:{
    "1":{role:"supporting",reason:"same issue"},
    "2":{role:"adverse",reason:"contrary holding"},
    "3":{role:"distinguishing",reason:"different procedural stage"}
  }});
  assert.equal(out.byRole.supporting.length,1);
  assert.equal(out.byRole.adverse.length,1);
  assert.equal(out.byRole.distinguishing.length,1);
  assert.equal(out.byRole.neutral.length,1);
  assert.equal(out.safeguards.adverseAuthorityMustNotBeHidden,true);
});

test("unreviewed/secondary records are rejected rather than silently included",()=>{
  const out=buildCaseLawComparison([
    base,
    {...base,id:9,source_status:"verified"}
  ]);
  assert.equal(out.cards.length,1);
  assert.equal(out.rejected.length,1);
  assert.equal(out.rejected[0].caseLawId,9);
});
