// AI Advokat CasePilot — governed case-analysis foundation.
// No private-document upload/storage is enabled by this module.

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
  if(sourceBacked.includes(claim.status) && (!claim.sourceId || !claim.page)) errors.push("source_and_page_required");

  if(claim.status===CASEPILOT_STATUSES.CONFIRMED && claim.requiresProfessionalJudgment) {
    errors.push("confirmed_cannot_replace_professional_judgment");
  }

  return {ok:errors.length===0,errors};
}

export function contradiction(a,b,{meaning="",question=""}={}) {
  if(!a?.sourceId || !b?.sourceId) throw new Error("casepilot_contradiction_sources_required");
  return Object.freeze({
    left:{text:a.text,sourceId:a.sourceId,page:a.page || null},
    right:{text:b.text,sourceId:b.sourceId,page:b.page || null},
    meaning,
    question,
    status:CASEPILOT_STATUSES.DISPUTED
  });
}

export function aiConclusion({id,text,sources=[],reviewType="lawyer_review"}={}) {
  if(!id || !text) throw new Error("casepilot_ai_conclusion_fields_required");
  if(!Array.isArray(sources) || sources.length===0) throw new Error("casepilot_ai_conclusion_source_required");
  return Object.freeze({
    id,text,sources,
    reviewType,
    decision:null,
    decisionBy:null,
    decisionAt:null,
    lockedForProfessionalUse:true
  });
}

export function approveAIConclusion(conclusion,{decision,lawyer,at}={}) {
  if(!conclusion) throw new Error("casepilot_ai_conclusion_required");
  if(!["accepted","corrected","rejected"].includes(decision)) throw new Error("casepilot_invalid_lawyer_decision");
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
  const unreviewed=conclusions.filter(c=>c.lockedForProfessionalUse || !c.decision);
  const sourceProblems=[];
  for(const section of Object.values(workspace?.sections || {})){
    if(!Array.isArray(section)) continue;
    for(const item of section){
      if(item?.text && item?.status){
        const check=validateCasePilotClaim(item);
        if(!check.ok) sourceProblems.push({id:item.id || null,errors:check.errors});
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
