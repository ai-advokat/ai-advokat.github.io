// AI Advokat reusable professional legal workflows v1.
// Definitions only: execution remains bounded by source availability, privacy controls
// and Human Gate. No workflow may file, sign, send or unlock professional use.

export const LEGAL_WORKFLOW_VERSION="1.0.0";

export const LEGAL_WORKFLOWS=Object.freeze([
  Object.freeze({
    id:"complaint_or_indictment_analysis",
    title:"Анализа на тужба / обвинение",
    scope:"matter",
    requiredInputs:["source_documents"],
    steps:Object.freeze([
      "register_sources",
      "extract_claims_or_counts",
      "map_legal_elements",
      "map_supporting_evidence",
      "map_adverse_or_missing_evidence",
      "identify_procedural_deadlines",
      "retrieve_governed_law",
      "retrieve_reviewed_case_law",
      "draft_issue_map",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["issue_map","claims_evidence_matrix","risk_register","source_manifest"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"matter_chronology",
    title:"Хронологија на предмет",
    scope:"matter",
    requiredInputs:["source_documents"],
    steps:Object.freeze([
      "extract_dated_events",
      "link_each_event_to_source_page",
      "normalize_dates_without_destroying_original_text",
      "flag_date_conflicts",
      "flag_missing_intervals",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["chronology","date_conflicts","source_manifest"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"statement_comparison",
    title:"Споредба на искази",
    scope:"matter",
    requiredInputs:["two_or_more_statements"],
    steps:Object.freeze([
      "register_statements",
      "extract_material_assertions",
      "align_same_issue_assertions",
      "identify_consistency",
      "identify_contradictions",
      "identify_omissions",
      "preserve_source_page_for_each_side",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["comparison_matrix","contradictions","follow_up_questions"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"missing_evidence_review",
    title:"Проверка на недостасувачки докази",
    scope:"matter",
    requiredInputs:["claims_evidence_matrix"],
    steps:Object.freeze([
      "identify_material_claims",
      "identify_existing_support",
      "identify_counterevidence",
      "identify_unproven_elements",
      "separate_unavailable_from_not_yet_collected",
      "rank_by_legal_materiality",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["evidence_gap_register","collection_plan"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"contract_review",
    title:"Проверка на договор",
    scope:"document",
    requiredInputs:["contract"],
    steps:Object.freeze([
      "extract_parties_and_authority",
      "extract_obligations",
      "extract_payment_terms",
      "extract_deadlines_and_renewal",
      "extract_termination",
      "extract_liability",
      "extract_confidentiality_and_ip",
      "extract_governing_law_and_disputes",
      "verify_governed_legal_references",
      "identify_missing_or_ambiguous_terms",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["clause_table","risk_register","open_questions","source_manifest"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"hearing_preparation",
    title:"Подготовка за рочиште",
    scope:"matter",
    requiredInputs:["verified_matter_map"],
    steps:Object.freeze([
      "summarize_live_issues",
      "prepare_fact_and_source_map",
      "prepare_witness_questions",
      "prepare_expert_questions",
      "prepare_objection_checklist",
      "prepare_adverse_points",
      "prepare_working_opening_or_closing_structure",
      "verify_every_material_proposition",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["hearing_pack","question_sets","objection_checklist","source_manifest"]),
    humanGate:"required"
  }),
  Object.freeze({
    id:"due_diligence_review_table",
    title:"Due Diligence Review Table",
    scope:"batch",
    requiredInputs:["document_collection"],
    steps:Object.freeze([
      "classify_documents",
      "extract_requested_columns",
      "preserve_source_locator",
      "flag_missing_values",
      "flag_inconsistencies",
      "verify_legal_references_where_applicable",
      "lawyer_human_gate"
    ]),
    outputs:Object.freeze(["review_table","exceptions_register","source_manifest"]),
    humanGate:"required"
  })
]);

const BY_ID=new Map(LEGAL_WORKFLOWS.map(w=>[w.id,w]));

export function getLegalWorkflow(id){
  return BY_ID.get(String(id||""))||null;
}

export function listLegalWorkflows(){
  return LEGAL_WORKFLOWS.map(w=>({
    id:w.id,
    title:w.title,
    scope:w.scope,
    outputs:[...w.outputs],
    humanGate:w.humanGate
  }));
}

export function buildWorkflowRun(id,{matterId=null,documentIds=[],requestedBy=null}={}){
  const workflow=getLegalWorkflow(id);
  if(!workflow) throw new Error("legal_workflow_not_found");
  if(!Array.isArray(documentIds)) throw new Error("legal_workflow_document_ids_array_required");
  if(documentIds.length>100) throw new Error("legal_workflow_document_limit_exceeded");
  const docs=[...new Set(documentIds.map(v=>String(v||"").trim()).filter(Boolean))];
  return Object.freeze({
    version:LEGAL_WORKFLOW_VERSION,
    workflowId:workflow.id,
    matterId:matterId?String(matterId):null,
    documentIds:Object.freeze(docs),
    requestedBy:requestedBy?String(requestedBy):null,
    status:"draft",
    sourceVerification:"required",
    humanGate:Object.freeze({
      required:true,
      professionalUse:"locked",
      filing:"forbidden",
      signature:"forbidden",
      externalTransmission:"forbidden"
    }),
    steps:Object.freeze(workflow.steps.map((id,index)=>Object.freeze({
      index:index+1,
      id,
      status:"pending"
    }))),
    outputs:workflow.outputs
  });
}
