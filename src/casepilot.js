// AI Advokat CasePilot — governed case-analysis foundation.
// No private-document upload/storage is enabled by this module.

export const CASEPILOT_MAX_DOCUMENTS = 20;

export const CASEPILOT_EXPORT_FORMATS = Object.freeze(["md","docx","pdf"]);

export const CASEPILOT_OUTCOME_BANDS = Object.freeze([
  "strong",
  "moderate",
  "uncertain",
  "weak"
]);

export const CASEPILOT_ANALYTIC_VIEWS = Object.freeze([
  "client_theory",
  "opposing_theory",
  "neutral_adjudicator_view",
  "evidentiary_view",
  "procedural_view",
  "best_case",
  "base_case",
  "worst_case",
  "alternative_hypotheses"
]);

export const CASEPILOT_STATUSES = Object.freeze({
  CONFIRMED: "confirmed",
  INDICATION: "indication",
  DISPUTED: "disputed",
  MISSING: "missing",
  LAWYER_REVIEW: "lawyer_review"
});

export const CASEPILOT_SECTIONS = Object.freeze([
  "case_passport",
  "lawyer_summary",
  "source_document_register",
  "multi_document_ingestion",
  "document_summary_matrix",
  "fact_source_matrix",
  "legal_source_matrix",
  "completeness_check",
  "chronology",
  "participants_access_map",
  "legal_issue_tree",
  "prosecution_defence_theories",
  "claims_evidence_matrix",
  "evidence_assessment_matrix",
  "contradictions_matrix",
  "weaknesses",
  "alternative_hypotheses",
  "evidence_completion_plan",
  "procedural_risk_register",
  "hearing_plan",
  "opening_statement_working_draft",
  "witness_questions",
  "expert_questions",
  "client_preparation",
  "objections_interventions",
  "closing_structure",
  "scenario_map",
  "multi_perspective_analysis",
  "outcome_assessment",
  "executive_legal_opinion",
  "hearing_day_checklist",
  "hearing_notes",
  "ai_conclusion_register",
  "export_package"
]);

export function casePilotRecord({id,type,title,sourceId=null,page=null,status=CASEPILOT_STATUSES.MISSING,notes=""}={}) {
  if(!id || !type || !title) throw new Error("casepilot_record_fields_required");
  if(!Object.values(CASEPILOT_STATUSES).includes(status)) throw new Error("casepilot_invalid_status");
  return Object.freeze({id,type,title,sourceId,page,status,notes});
}

export function validateCasePilotClaim(claim) {
  const errors=[];
  if(!claim || typeof claim!=="object") return {ok:false,errors:["claim_required"]};
  if(!claim.id) errors.push("id_required");
  if(!claim.text) errors.push("text_required");
  if(!Object.values(CASEPILOT_STATUSES).includes(claim.status)) errors.push("valid_status_required");

  const sourceBacked=[CASEPILOT_STATUSES.CONFIRMED,CASEPILOT_STATUSES.INDICATION,CASEPILOT_STATUSES.DISPUTED];
  if(sourceBacked.includes(claim.status) && !validSourceRef({sourceId:claim.sourceId,page:claim.page})) {
    errors.push("source_and_page_required");
  }

  if(claim.status===CASEPILOT_STATUSES.CONFIRMED && claim.requiresProfessionalJudgment) {
    errors.push("confirmed_cannot_replace_professional_judgment");
  }

  return {ok:errors.length===0,errors};
}

function validSourceRef(ref) {
  return !!ref
    && typeof ref==="object"
    && typeof ref.sourceId==="string"
    && ref.sourceId.trim().length>0
    && Number.isInteger(ref.page)
    && ref.page>0;
}

function snapshotSourceRef(ref) {
  if(!validSourceRef(ref)) throw new Error("casepilot_complete_source_reference_required");
  return Object.freeze({sourceId:ref.sourceId.trim(),page:ref.page});
}

export function validateContradiction(value) {
  const errors=[];
  if(!value || typeof value!=="object") return {ok:false,errors:["contradiction_required"]};
  for(const side of ["left","right"]){
    const v=value[side];
    if(!v || typeof v.text!=="string" || !v.text.trim()) errors.push(`${side}_text_required`);
    if(!validSourceRef(v)) errors.push(`${side}_source_and_page_required`);
  }
  return {ok:errors.length===0,errors};
}

export function contradiction(a,b,{meaning="",question=""}={}) {
  const candidate={left:a,right:b};
  const check=validateContradiction(candidate);
  if(!check.ok) throw new Error(`casepilot_invalid_contradiction:${check.errors.join(",")}`);
  return Object.freeze({
    left:Object.freeze({text:a.text.trim(),...snapshotSourceRef(a)}),
    right:Object.freeze({text:b.text.trim(),...snapshotSourceRef(b)}),
    meaning,
    question,
    status:CASEPILOT_STATUSES.DISPUTED
  });
}

const VALID_LAWYER_DECISIONS=Object.freeze(["accepted","corrected","rejected"]);

function completedLawyerReview(value) {
  return value?.lockedForProfessionalUse===false
    && VALID_LAWYER_DECISIONS.includes(value?.decision)
    && typeof value?.decisionBy==="string" && value.decisionBy.trim().length>0
    && typeof value?.decisionAt==="string" && value.decisionAt.trim().length>0;
}

export function validateAIConclusion(value) {
  const errors=[];
  if(!value || typeof value!=="object") return {ok:false,errors:["conclusion_required"]};
  if(!value.id) errors.push("id_required");
  if(!value.text) errors.push("text_required");
  if(!Array.isArray(value.sources) || value.sources.length===0) errors.push("source_required");
  else value.sources.forEach((ref,index)=>{ if(!validSourceRef(ref)) errors.push(`source_${index}_requires_id_and_page`); });

  if(value.lockedForProfessionalUse===false && !completedLawyerReview(value)) {
    if(!VALID_LAWYER_DECISIONS.includes(value.decision)) errors.push("valid_lawyer_decision_required");
    if(typeof value.decisionBy!=="string" || !value.decisionBy.trim()) errors.push("lawyer_identity_required");
    if(typeof value.decisionAt!=="string" || !value.decisionAt.trim()) errors.push("lawyer_timestamp_required");
  }
  return {ok:errors.length===0,errors};
}

export function aiConclusion({id,text,sources=[],reviewType="lawyer_review"}={}) {
  const check=validateAIConclusion({id,text,sources});
  if(!check.ok) throw new Error(`casepilot_invalid_ai_conclusion:${check.errors.join(",")}`);
  const sourceSnapshot=Object.freeze(sources.map(snapshotSourceRef));
  return Object.freeze({
    id,text,sources:sourceSnapshot,
    reviewType,
    decision:null,
    decisionBy:null,
    decisionAt:null,
    lockedForProfessionalUse:true
  });
}

export function approveAIConclusion(conclusion,{decision,lawyer,at}={}) {
  if(!conclusion) throw new Error("casepilot_ai_conclusion_required");
  if(!VALID_LAWYER_DECISIONS.includes(decision)) throw new Error("casepilot_invalid_lawyer_decision");
  if(!lawyer || !at) throw new Error("casepilot_lawyer_and_timestamp_required");
  return Object.freeze({
    ...conclusion,
    decision,
    decisionBy:lawyer,
    decisionAt:at,
    lockedForProfessionalUse:false
  });
}

export function createCasePilotWorkspace(meta={}) {
  return {
    status:"draft",
    privateWorkspace:"LOCKED",
    professionalUse:"LOCKED",
    meta:{
      caseNumber:meta.caseNumber || null,
      phase:meta.phase || null,
      perspective:meta.perspective || null,
      version:meta.version || "0.1"
    },
    sections:Object.fromEntries(CASEPILOT_SECTIONS.map(s=>[s,[]])),
    humanGate:{
      required:true,
      lawyerApprovalRequiredForProfessionalUse:true,
      sourceVerificationRequired:true
    }
  };
}

export function casePilotReadiness(workspace) {
  const conclusions=workspace?.sections?.ai_conclusion_register || [];
  const unreviewed=conclusions.filter(c=>!completedLawyerReview(c));
  const sourceProblems=[];
  for(const [sectionName,section] of Object.entries(workspace?.sections || {})){
    if(!Array.isArray(section)) continue;
    for(const item of section){
      if(sectionName==="ai_conclusion_register"){
        const check=validateAIConclusion(item);
        if(!check.ok) sourceProblems.push({id:item?.id || null,section:sectionName,errors:check.errors});
        continue;
      }
      if(sectionName==="contradictions_matrix"){
        const check=validateContradiction(item);
        if(!check.ok) sourceProblems.push({id:item?.id || null,section:sectionName,errors:check.errors});
        continue;
      }
      if(item && typeof item==="object" && ("text" in item || "status" in item || "sourceId" in item || "page" in item)){
        const check=validateCasePilotClaim(item);
        if(!check.ok) sourceProblems.push({id:item.id || null,section:sectionName,errors:check.errors});
      }
    }
  }
  return {
    readyForProfessionalUse:false,
    privateWorkspace:workspace?.privateWorkspace || "LOCKED",
    unreviewedAIConclusions:unreviewed.length,
    sourceProblems,
    reason:"Human Gate and private-case security remain mandatory."
  };
}


export function validateCaseDocumentRegistry(documents=[]) {
  const errors=[];
  if(!Array.isArray(documents)) return {ok:false,errors:["documents_array_required"]};
  if(documents.length>CASEPILOT_MAX_DOCUMENTS) errors.push("document_limit_exceeded");
  const seen=new Set();
  documents.forEach((doc,index)=>{
    if(!doc || typeof doc!=="object") {
      errors.push(`document_${index}_required`);
      return;
    }
    if(typeof doc.id!=="string" || !doc.id.trim()) errors.push(`document_${index}_id_required`);
    if(typeof doc.title!=="string" || !doc.title.trim()) errors.push(`document_${index}_title_required`);
    if(typeof doc.sha256!=="string" || !/^[a-f0-9]{64}$/i.test(doc.sha256)) errors.push(`document_${index}_sha256_required`);
    if(!Number.isInteger(doc.pageCount) || doc.pageCount<1) errors.push(`document_${index}_page_count_required`);
    if(doc?.id){
      const key=doc.id.trim();
      if(seen.has(key)) errors.push(`document_${index}_duplicate_id`);
      seen.add(key);
    }
  });
  return {ok:errors.length===0,errors};
}

export function createCaseWorkPackage({caseId,documents=[],requestedFormats=["md"]}={}) {
  if(typeof caseId!=="string" || !caseId.trim()) throw new Error("casepilot_case_id_required");
  const registry=validateCaseDocumentRegistry(documents);
  if(!registry.ok) throw new Error(`casepilot_invalid_document_registry:${registry.errors.join(",")}`);
  if(!Array.isArray(requestedFormats) || requestedFormats.length===0) throw new Error("casepilot_export_format_required");
  const formats=[...new Set(requestedFormats)];
  if(formats.some(f=>!CASEPILOT_EXPORT_FORMATS.includes(f))) throw new Error("casepilot_invalid_export_format");

  return Object.freeze({
    caseId:caseId.trim(),
    documentLimit:CASEPILOT_MAX_DOCUMENTS,
    documents:Object.freeze(documents.map(d=>Object.freeze({...d}))),
    requestedFormats:Object.freeze(formats),
    privateWorkspace:"LOCKED",
    humanGateRequired:true,
    analysisViews:CASEPILOT_ANALYTIC_VIEWS,
    pipeline:Object.freeze([
      "register_and_hash",
      "page_level_extract",
      "per_document_analysis",
      "cross_document_synthesis",
      "fact_chronology_and_contradictions",
      "source_first_legal_retrieval",
      "multi_perspective_analysis",
      "outcome_strength_assessment",
      "lawyer_human_gate",
      "versioned_export"
    ])
  });
}

export function caseOutcomeAssessment({
  band,
  factors=[],
  numericProbability=null,
  statisticalModel=null,
  confidenceInterval=null,
  lawyerApproved=false
}={}) {
  if(!CASEPILOT_OUTCOME_BANDS.includes(band)) throw new Error("casepilot_valid_outcome_band_required");
  if(!Array.isArray(factors) || factors.length===0) throw new Error("casepilot_outcome_factors_required");

  if(numericProbability!==null){
    if(typeof numericProbability!=="number" || numericProbability<0 || numericProbability>100){
      throw new Error("casepilot_invalid_numeric_probability");
    }
    const modelOk=statisticalModel
      && typeof statisticalModel==="object"
      && typeof statisticalModel.name==="string" && statisticalModel.name.trim()
      && typeof statisticalModel.population==="string" && statisticalModel.population.trim()
      && typeof statisticalModel.period==="string" && statisticalModel.period.trim()
      && typeof statisticalModel.calibration==="string" && statisticalModel.calibration.trim()
      && typeof statisticalModel.applicability==="string" && statisticalModel.applicability.trim();
    const intervalOk=Array.isArray(confidenceInterval)
      && confidenceInterval.length===2
      && confidenceInterval.every(v=>typeof v==="number" && v>=0 && v<=100)
      && confidenceInterval[0]<=numericProbability
      && numericProbability<=confidenceInterval[1];
    if(!modelOk || !intervalOk || lawyerApproved!==true){
      throw new Error("casepilot_numeric_probability_requires_validated_model_interval_and_human_gate");
    }
  }

  return Object.freeze({
    band,
    factors:Object.freeze(factors.map(String)),
    numericProbability,
    statisticalModel:numericProbability===null ? null : Object.freeze({...statisticalModel}),
    confidenceInterval:numericProbability===null ? null : Object.freeze([...confidenceInterval]),
    lawyerApproved:numericProbability===null ? false : true
  });
}
