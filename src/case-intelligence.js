// AI Advokat Case Intelligence Engine v1.
// Pure governed domain layer. No filing, signing, transmission or corpus promotion.

export const CASE_INTELLIGENCE_VERSION="1.0.0";

export const CASE_INTELLIGENCE_STAGES=Object.freeze([
  "document_extraction",
  "document_normalisation",
  "entity_and_property_resolution",
  "timeline_reconstruction",
  "fact_evidence_graph",
  "contradiction_detection",
  "evidence_gap_detection",
  "legal_issue_spotting",
  "current_law_verification",
  "reviewed_case_law_comparison",
  "strategy_synthesis",
  "draft_preparation",
  "human_gate"
]);

export const CASE_DRAFT_TYPES=Object.freeze([
  "lawsuit",
  "appeal",
  "objection",
  "motion",
  "request",
  "legal_opinion",
  "hearing_plan",
  "evidence_request",
  "registry_request"
]);

export const CASE_FACT_STATUSES=Object.freeze([
  "source_confirmed",
  "source_indication",
  "disputed",
  "missing",
  "professional_review_required"
]);

export const CASE_SOURCE_CLASSES=Object.freeze([
  "uploaded_document",
  "official_legal_source",
  "reviewed_case_law",
  "lawyer_input"
]);

function text(value,max=4000){
  if(typeof value!=="string") throw new TypeError("case_intelligence_text_required");
  const v=value.normalize("NFKC").trim();
  if(!v) throw new TypeError("case_intelligence_text_required");
  if(v.length>max) throw new TypeError("case_intelligence_text_too_long");
  return v;
}

function optionalText(value,max=4000){
  if(value===null||value===undefined||value==="") return null;
  return text(String(value),max);
}

function id(value){
  const v=text(String(value||""),160);
  if(!/^[A-Za-z0-9._:-]+$/.test(v)) throw new TypeError("case_intelligence_invalid_id");
  return v;
}

export function sourceAnchor({sourceId,page=null,locator=null,sourceClass="uploaded_document"}={}){
  if(!CASE_SOURCE_CLASSES.includes(sourceClass)) throw new TypeError("case_intelligence_invalid_source_class");
  const sid=id(sourceId);
  const p=page===null||page===undefined ? null : Number(page);
  if(p!==null && (!Number.isInteger(p)||p<1)) throw new TypeError("case_intelligence_invalid_page");
  const loc=optionalText(locator,240);
  if(p===null && !loc) throw new TypeError("case_intelligence_source_locator_required");
  return Object.freeze({sourceId:sid,page:p,locator:loc,sourceClass});
}

export function extractedFact({
  id:factId,
  text:body,
  status="professional_review_required",
  sources=[],
  factType="general",
  confidenceClass="unscored"
}={}){
  if(!CASE_FACT_STATUSES.includes(status)) throw new TypeError("case_intelligence_invalid_fact_status");
  if(!Array.isArray(sources)||sources.length===0) throw new TypeError("case_intelligence_fact_source_required");
  const anchors=Object.freeze(sources.map(sourceAnchor));
  if(status==="source_confirmed" && anchors.some(a=>a.sourceClass==="uploaded_document" && a.page===null && !a.locator)){
    throw new TypeError("case_intelligence_confirmed_fact_requires_locator");
  }
  return Object.freeze({
    id:id(factId),
    text:text(body,2400),
    factType:text(String(factType),120),
    status,
    confidenceClass:text(String(confidenceClass),80),
    sources:anchors,
    lockedForProfessionalUse:true
  });
}

export function evidenceGraph({facts=[],contradictions=[],gaps=[]}={}){
  if(!Array.isArray(facts)||!Array.isArray(contradictions)||!Array.isArray(gaps)) throw new TypeError("case_intelligence_arrays_required");
  const factIds=new Set();
  for(const fact of facts){
    if(!fact?.id) throw new TypeError("case_intelligence_fact_required");
    if(factIds.has(fact.id)) throw new TypeError("case_intelligence_duplicate_fact");
    factIds.add(fact.id);
  }
  return Object.freeze({
    facts:Object.freeze([...facts]),
    contradictions:Object.freeze([...contradictions]),
    gaps:Object.freeze([...gaps])
  });
}

export function contradiction({id:contradictionId,leftFactId,rightFactId,meaning,materiality="material"}={}){
  return Object.freeze({
    id:id(contradictionId),
    leftFactId:id(leftFactId),
    rightFactId:id(rightFactId),
    meaning:text(meaning,1800),
    materiality:text(String(materiality),80),
    status:"disputed",
    humanReviewRequired:true
  });
}

export function evidenceGap({id:gapId,issue,whyMaterial,requestedEvidence=null}={}){
  return Object.freeze({
    id:id(gapId),
    issue:text(issue,1600),
    whyMaterial:text(whyMaterial,1800),
    requestedEvidence:optionalText(requestedEvidence,1600),
    status:"missing",
    humanReviewRequired:true
  });
}

export function analysisCoverage({
  registeredDocuments=0,
  extractedDocuments=0,
  materialFacts=0,
  sourceBackedFacts=0,
  currentLawClaims=0,
  verifiedCurrentLawClaims=0,
  unresolvedContradictions=0,
  materialEvidenceGaps=0
}={}){
  const ints=[registeredDocuments,extractedDocuments,materialFacts,sourceBackedFacts,currentLawClaims,verifiedCurrentLawClaims,unresolvedContradictions,materialEvidenceGaps];
  if(ints.some(v=>!Number.isInteger(v)||v<0)) throw new TypeError("case_intelligence_nonnegative_integer_required");
  if(extractedDocuments>registeredDocuments) throw new TypeError("case_intelligence_extracted_exceeds_registered");
  if(sourceBackedFacts>materialFacts) throw new TypeError("case_intelligence_source_backed_exceeds_facts");
  if(verifiedCurrentLawClaims>currentLawClaims) throw new TypeError("case_intelligence_verified_law_exceeds_claims");
  const documentCoverage=registeredDocuments===0 ? 0 : Math.round((extractedDocuments/registeredDocuments)*10000)/100;
  const evidenceCoverage=materialFacts===0 ? 0 : Math.round((sourceBackedFacts/materialFacts)*10000)/100;
  const currentLawCoverage=currentLawClaims===0 ? 100 : Math.round((verifiedCurrentLawClaims/currentLawClaims)*10000)/100;
  return Object.freeze({
    documentCoverage,
    evidenceCoverage,
    currentLawCoverage,
    unresolvedContradictions,
    materialEvidenceGaps,
    syntheticAccuracyPercentage:null,
    accuracyClaimProhibited:true
  });
}

export function draftReadiness({coverage,humanGateApproved=false}={}){
  if(!coverage||typeof coverage!=="object") throw new TypeError("case_intelligence_coverage_required");
  const blockers=[];
  if(Number(coverage.documentCoverage)!==100) blockers.push("documents_not_fully_extracted");
  if(Number(coverage.evidenceCoverage)<100) blockers.push("material_facts_not_fully_source_backed");
  if(Number(coverage.currentLawCoverage)<100) blockers.push("current_law_not_fully_verified");
  if(Number(coverage.unresolvedContradictions)>0) blockers.push("unresolved_material_contradictions");
  if(Number(coverage.materialEvidenceGaps)>0) blockers.push("material_evidence_gaps");
  if(humanGateApproved!==true) blockers.push("human_gate_required");
  return Object.freeze({
    readyForProfessionalUse:blockers.length===0,
    workingDraftAllowed:true,
    autonomousFiling:false,
    autonomousSignature:false,
    autonomousTransmission:false,
    blockers:Object.freeze(blockers)
  });
}

export function draftRequest({caseId,draftType,instruction,coverage}={}){
  if(!CASE_DRAFT_TYPES.includes(draftType)) throw new TypeError("case_intelligence_invalid_draft_type");
  const readiness=draftReadiness({coverage,humanGateApproved:false});
  return Object.freeze({
    caseId:id(caseId),
    draftType,
    instruction:text(instruction,3000),
    mode:"working_draft",
    banner:"WORKING DRAFT — HUMAN GATE REQUIRED",
    sourceBackedFactsOnly:true,
    currentLawVerificationRequired:true,
    adverseAuthorityMustNotBeHidden:true,
    readiness,
    filing:"forbidden",
    signature:"forbidden",
    externalTransmission:"forbidden"
  });
}
