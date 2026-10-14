import test from "node:test";
import assert from "node:assert/strict";
import {
  CASE_INTELLIGENCE_STAGES,
  CASE_DRAFT_TYPES,
  sourceAnchor,
  extractedFact,
  contradiction,
  evidenceGap,
  evidenceGraph,
  analysisCoverage,
  draftReadiness,
  draftRequest
} from "../src/case-intelligence.js";

test("CIE1 pipeline includes evidence, law, strategy and drafting under Human Gate",()=>{
  for(const stage of [
    "document_extraction","timeline_reconstruction","fact_evidence_graph",
    "contradiction_detection","current_law_verification",
    "reviewed_case_law_comparison","strategy_synthesis","draft_preparation","human_gate"
  ]) assert.ok(CASE_INTELLIGENCE_STAGES.includes(stage));
  assert.ok(CASE_DRAFT_TYPES.includes("lawsuit"));
  assert.ok(CASE_DRAFT_TYPES.includes("appeal"));
});

test("CIE2 source-backed facts require concrete source locators",()=>{
  const anchor=sourceAnchor({sourceId:"DOC-1",page:3});
  const fact=extractedFact({
    id:"FACT-1",
    text:"The contract identifies parcel 123/4.",
    status:"source_confirmed",
    sources:[anchor],
    factType:"property"
  });
  assert.equal(fact.sources[0].page,3);
  assert.equal(fact.lockedForProfessionalUse,true);
  assert.throws(()=>sourceAnchor({sourceId:"DOC-2"}),/source_locator_required/);
  assert.throws(()=>extractedFact({id:"FACT-X",text:"Unsupported",sources:[]}),/fact_source_required/);
});

test("CIE3 contradictions and gaps remain explicit review objects",()=>{
  const c=contradiction({id:"CON-1",leftFactId:"FACT-1",rightFactId:"FACT-2",meaning:"Different ownership dates"});
  const g=evidenceGap({id:"GAP-1",issue:"Missing final probate decision",whyMaterial:"Inheritance chain cannot be closed",requestedEvidence:"Final probate decision"});
  const graph=evidenceGraph({facts:[
    extractedFact({id:"FACT-1",text:"Date A",status:"source_indication",sources:[sourceAnchor({sourceId:"DOC-1",page:1})]}),
    extractedFact({id:"FACT-2",text:"Date B",status:"source_indication",sources:[sourceAnchor({sourceId:"DOC-2",page:2})]})
  ],contradictions:[c],gaps:[g]});
  assert.equal(graph.contradictions[0].humanReviewRequired,true);
  assert.equal(graph.gaps[0].status,"missing");
});

test("CIE4 coverage reports evidence and law coverage but never synthetic accuracy",()=>{
  const coverage=analysisCoverage({
    registeredDocuments:10,
    extractedDocuments:9,
    materialFacts:20,
    sourceBackedFacts:18,
    currentLawClaims:4,
    verifiedCurrentLawClaims:3,
    unresolvedContradictions:2,
    materialEvidenceGaps:1
  });
  assert.equal(coverage.documentCoverage,90);
  assert.equal(coverage.evidenceCoverage,90);
  assert.equal(coverage.currentLawCoverage,75);
  assert.equal(coverage.syntheticAccuracyPercentage,null);
  assert.equal(coverage.accuracyClaimProhibited,true);
});

test("CIE5 working drafts are allowed while professional reliance remains fail-closed",()=>{
  const coverage=analysisCoverage({
    registeredDocuments:4,extractedDocuments:4,
    materialFacts:12,sourceBackedFacts:11,
    currentLawClaims:3,verifiedCurrentLawClaims:3,
    unresolvedContradictions:0,materialEvidenceGaps:1
  });
  const ready=draftReadiness({coverage,humanGateApproved:false});
  assert.equal(ready.workingDraftAllowed,true);
  assert.equal(ready.readyForProfessionalUse,false);
  assert.ok(ready.blockers.includes("material_facts_not_fully_source_backed"));
  assert.ok(ready.blockers.includes("material_evidence_gaps"));
  assert.ok(ready.blockers.includes("human_gate_required"));
  const req=draftRequest({caseId:"CASE-1",draftType:"lawsuit",instruction:"Prepare a property claim.",coverage});
  assert.equal(req.banner,"WORKING DRAFT — HUMAN GATE REQUIRED");
  assert.equal(req.filing,"forbidden");
  assert.equal(req.signature,"forbidden");
  assert.equal(req.externalTransmission,"forbidden");
});
