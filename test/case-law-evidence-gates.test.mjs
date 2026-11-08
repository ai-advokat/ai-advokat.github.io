import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPublicationBoundary, assessTemporalArticleGate, assessSourceGate,
  assessEchrComparisonGate, assessCanonicalCaseLawState, caseLawGateSummary
} from "../src/case-law-evidence-gates.js";
import { caseLawRecordEligible } from "../src/casepilot-case-law-bridge.js";
import { assessSpecificCaseLawClaims } from "../src/case-law-claim-guard.js";

const SHA="a".repeat(64);
function full(overrides={}){
  return {
    source_status:"official",
    source_url:"https://www.vrhoven.sud.mk/decision/1",
    source_sha256:SHA,
    official_binding_verified:true,
    remote_content_hash_verified:true,
    human_review_status:"reviewed",

    start_page:1,start_y:100,end_page:3,end_y:600,
    start_boundary_independent_signoff:true,
    end_boundary_independent_signoff:true,
    attribution_independent_signoff:true,
    complete_unit_accepted:true,
    warning_flags:[],
    warning_disposition:"NO_PRIOR_AUTOMATED_WARNING",

    domestic_articles:"ЗКП чл. 1",
    article_text_verified:true,
    historical_required:false,
    current_applicability:true,
    contrary_case_law:true,
    legal_review_status:"reviewed",
    legal_verified:true,

    authority_review_status:"reviewed",
    holding_review_status:"reviewed",
    holding_verified:true,
    publication_approved:false,
    human_gate_approved:false,
    ...overrides
  };
}

test("staging remains source-match hold until official binding is verified",()=>{
  const g=assessCanonicalCaseLawState({});
  assert.equal(g.state,"STAGED_NEEDS_SOURCE_MATCH");
  assert.equal(g.productionCitable,false);
  assert.equal(g.discoveryOnly,true);
});

test("source binding alone does not promote authority",()=>{
  const r=full({
    start_boundary_independent_signoff:false,
    end_boundary_independent_signoff:false,
    attribution_independent_signoff:false,
    complete_unit_accepted:false,
    article_text_verified:false,
    current_applicability:false,
    contrary_case_law:false,
    legal_review_status:"pending",
    legal_verified:false,
    authority_review_status:"pending",
    holding_review_status:"pending",
    holding_verified:false
  });
  const g=assessCanonicalCaseLawState(r);
  assert.equal(assessSourceGate(r).ready,true);
  assert.equal(g.state,"SOURCE_BOUND_REVIEW_REQUIRED");
  assert.equal(g.productionCitable,false);
});

test("publication boundary requires independent start/end, attribution and complete unit",()=>{
  const b=assessPublicationBoundary(full());
  assert.equal(b.ready,true);
  assert.equal(assessPublicationBoundary(full({end_boundary_independent_signoff:false})).ready,false);
  assert.equal(assessPublicationBoundary(full({complete_unit_accepted:false})).ready,false);
  assert.equal(assessPublicationBoundary(full({warning_flags:["LONG_PUBLICATION_UNIT"],warning_disposition:"LONG_TEXT_COMPLETENESS_REVIEW"})).ready,false);
  assert.equal(assessPublicationBoundary(full({warning_flags:["END_NEAR_NEXT_HEADING_VERIFY"],warning_disposition:"PROXIMITY_WARNING_EXPLAINED_BY_SOURCE_LAYOUT"})).ready,true);
});

test("historical temporal gate requires authentic law and transitional rules",()=>{
  const hold=assessTemporalArticleGate(full({
    historical_required:true,
    historical_authentic_gazette:false,
    transitional_rules:false
  }));
  assert.equal(hold.ready,false);
  const ok=assessTemporalArticleGate(full({
    historical_required:true,
    historical_authentic_gazette:true,
    transitional_rules:true
  }));
  assert.equal(ok.ready,true);
});

test("reviewed candidate is distinct from production-citable authority",()=>{
  const candidate=assessCanonicalCaseLawState(full());
  assert.equal(candidate.state,"REVIEWED_AUTHORITY_CANDIDATE");
  assert.equal(candidate.reviewedAuthorityCandidate,true);
  assert.equal(candidate.algorithmScoringAllowed,true);
  assert.equal(candidate.productionCitable,false);

  const released=assessCanonicalCaseLawState(full({publication_approved:true,human_gate_approved:true}));
  assert.equal(released.state,"PRODUCTION_CITABLE_AUTHORITY");
  assert.equal(released.productionCitable,true);
  assert.equal(released.discoveryOnly,false);
});

test("ECHR source match is not legal approval until all comparison gates pass",()=>{
  const hold=assessEchrComparisonGate({
    hudocUrl:"https://hudoc.echr.coe.int/eng?i=001-1",
    comparisonStatus:"RESEARCHED_SOURCE_MATCH_NOT_LEGAL_APPROVAL"
  });
  assert.equal(hold.status,"ECHR_RESEARCH_HOLD");
  assert.equal(hold.ready,false);
  const ok=assessEchrComparisonGate({
    hudocUrl:"https://hudoc.echr.coe.int/eng?i=001-1",
    comparisonStatus:"RESEARCHED_SOURCE_MATCH_NOT_LEGAL_APPROVAL",
    hudocMetadataVerified:true,
    historicalDomesticLawVerified:true,
    independentComparativeLegalReview:true,
    humanVerified:true
  });
  assert.equal(ok.status,"ECHR_COMPARISON_VERIFIED");
  assert.equal(ok.ready,true);
});

test("CasePilot rejects gate-aware records until final production-citable state",()=>{
  const base={
    id:99,case_title:"Case",court:"Врховен суд",case_number:"КВП-1/26",
    jurisdiction:"MK",source_url:"https://www.vrhoven.sud.mk/decision/1",
    ...full()
  };
  assert.equal(caseLawRecordEligible(base),false);
  assert.equal(caseLawRecordEligible({...base,publication_approved:true,human_gate_approved:true}),true);
});

test("claim guard cannot use gate-aware candidate as support before Human Gate",()=>{
  const text="Предмет бр. КВП-1/26 е релевантен.";
  const source={
    title:"Врховен суд КВП-1/26",caseTitle:"Case",caseNumber:"КВП-1/26",
    court:"Врховен суд",url:"https://www.vrhoven.sud.mk/decision/1",
    officialBindingVerified:true,humanReviewStatus:"reviewed",authorityReviewStatus:"reviewed",
    ...full()
  };
  assert.equal(assessSpecificCaseLawClaims(text,{reviewedCaseLawSources:[source]}).ok,false);
  const released={...source,publicationApproved:true,humanGateApproved:true,
    publication_approved:true,human_gate_approved:true};
  assert.equal(assessSpecificCaseLawClaims(text,{reviewedCaseLawSources:[released]}).ok,true);
});

test("gate summary separates every maturity state",()=>{
  const rows=[
    {},
    full({start_boundary_independent_signoff:false,end_boundary_independent_signoff:false,attribution_independent_signoff:false,complete_unit_accepted:false,article_text_verified:false,current_applicability:false,contrary_case_law:false,legal_review_status:"pending",legal_verified:false,authority_review_status:"pending",holding_verified:false}),
    full(),
    full({publication_approved:true,human_gate_approved:true})
  ];
  const s=caseLawGateSummary(rows);
  assert.equal(s.total,4);
  assert.equal(s.stagedNeedsSourceMatch,1);
  assert.equal(s.sourceBoundReviewRequired,1);
  assert.equal(s.reviewedAuthorityCandidates,1);
  assert.equal(s.productionCitable,1);
});
