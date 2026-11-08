// AI Advokat Proactive Legal Agents v1.
// Deterministic orchestration primitives inspired by frontier legal-agent patterns,
// adapted to AI Advokat Source-First + Human Gate doctrine.
// No filing, signing, external transmission, corpus promotion, or legal-status declaration.

export const PROACTIVE_LEGAL_AGENTS_VERSION="1.1.0";

export const AGENT_CAPABILITIES=Object.freeze({
  horizon_scanner:Object.freeze({
    id:"horizon_scanner",
    label:"Horizon & Change Agent",
    purpose:"Detect candidate legal/regulatory changes and create a source-backed review queue.",
    allowed:["discover_sources","compare_versions","flag_change","draft_change_note"],
    forbidden:["declare_current_law","publish_as_authority","edit_canonical_corpus"]
  }),
  matter_analyst:Object.freeze({
    id:"matter_analyst",
    label:"Matter Intelligence Agent",
    purpose:"Build a source-linked map of issues, facts, evidence gaps, deadlines and next questions.",
    allowed:["map_issues","map_facts","map_evidence","flag_gaps","draft_questions"],
    forbidden:["decide_case","guarantee_outcome","file_document"]
  }),
  contract_reviewer:Object.freeze({
    id:"contract_reviewer",
    label:"Contract Intelligence Agent",
    purpose:"Compare clauses against approved playbooks, precedents and user-supplied positions.",
    allowed:["extract_terms","compare_clauses","flag_deviation","draft_redline_notes","track_obligations"],
    forbidden:["accept_terms","send_counterparty_response","sign_contract"]
  }),
  litigation_strategist:Object.freeze({
    id:"litigation_strategist",
    label:"Litigation Strategy Agent",
    purpose:"Stress-test arguments, evidence, adverse authority and procedural risks.",
    allowed:["build_argument_map","find_counterarguments","identify_adverse_authority","draft_strategy_note"],
    forbidden:["predict_guaranteed_outcome","contact_court","submit_filing"]
  }),
  authority_verifier:Object.freeze({
    id:"authority_verifier",
    label:"Authority & Citation Agent",
    purpose:"Verify source identity, hierarchy, jurisdiction, temporal status and citation coverage.",
    allowed:["verify_source","verify_version","verify_locator","verify_hierarchy","reject_unsupported_claim"],
    forbidden:["promote_unverified_source","waive_human_gate"]
  }),
  deliverable_builder:Object.freeze({
    id:"deliverable_builder",
    label:"Legal Work Product Agent",
    purpose:"Assemble review-ready memoranda, checklists, chronologies and comparison tables.",
    allowed:["draft_memo","draft_checklist","draft_chronology","draft_table"],
    forbidden:["send_external","file_external","represent_as_final_without_review"]
  })
});

export const WORKFLOW_TEMPLATES=Object.freeze({
  regulatory_change_review:Object.freeze({
    id:"regulatory_change_review",
    label:"Regulatory Change Review",
    agents:["horizon_scanner","authority_verifier","deliverable_builder"],
    phases:["intake","source_discovery","version_compare","impact_map","verification","human_review"],
    scheduleEligible:true
  }),
  litigation_case_review:Object.freeze({
    id:"litigation_case_review",
    label:"Litigation Case Review",
    agents:["matter_analyst","litigation_strategist","authority_verifier","deliverable_builder"],
    phases:["intake","matter_map","source_research","adversarial_review","verification","human_review"],
    scheduleEligible:false
  }),
  contract_review:Object.freeze({
    id:"contract_review",
    label:"Contract Review",
    agents:["contract_reviewer","authority_verifier","deliverable_builder"],
    phases:["intake","term_extraction","playbook_compare","deviation_review","verification","human_review"],
    scheduleEligible:true
  }),
  due_diligence_review:Object.freeze({
    id:"due_diligence_review",
    label:"Due Diligence Review",
    agents:["contract_reviewer","matter_analyst","authority_verifier","deliverable_builder"],
    phases:["intake","document_map","term_extraction","risk_map","verification","human_review"],
    scheduleEligible:false
  }),
  evidence_review:Object.freeze({
    id:"evidence_review",
    label:"Evidence & Contradiction Review",
    agents:["matter_analyst","litigation_strategist","authority_verifier","deliverable_builder"],
    phases:["intake","fact_map","evidence_linking","contradiction_review","gap_review","human_review"],
    scheduleEligible:false
  }),
  legal_research_memo:Object.freeze({
    id:"legal_research_memo",
    label:"Legal Research Memo",
    agents:["matter_analyst","authority_verifier","deliverable_builder"],
    phases:["question","source_research","authority_ranking","claim_check","memo_draft","human_review"],
    scheduleEligible:false
  }),
  compliance_review:Object.freeze({
    id:"compliance_review",
    label:"Compliance Review",
    agents:["horizon_scanner","matter_analyst","authority_verifier","deliverable_builder"],
    phases:["scope","source_check","control_map","gap_review","verification","human_review"],
    scheduleEligible:true
  }),
  employment_review:Object.freeze({
    id:"employment_review",
    label:"Employment Matter Review",
    agents:["matter_analyst","authority_verifier","deliverable_builder"],
    phases:["intake","fact_timeline","source_research","risk_map","verification","human_review"],
    scheduleEligible:false
  }),
  obligation_monitoring:Object.freeze({
    id:"obligation_monitoring",
    label:"Contract Obligation Monitoring",
    agents:["contract_reviewer","horizon_scanner","deliverable_builder"],
    phases:["portfolio_scope","obligation_extract","deadline_queue","change_check","nudge","human_review"],
    scheduleEligible:true
  }),
  authority_update:Object.freeze({
    id:"authority_update",
    label:"Authority Update Review",
    agents:["horizon_scanner","authority_verifier","litigation_strategist","deliverable_builder"],
    phases:["matter_scope","change_scan","authority_compare","impact_note","verification","human_review"],
    scheduleEligible:true
  }),
  fact_graph_review:Object.freeze({
    id:"fact_graph_review",
    label:"Fact & Evidence Graph Review",
    agents:["matter_analyst","litigation_strategist","deliverable_builder"],
    phases:["matter_map","claim_graph","evidence_graph","contradictions","gaps","human_review"],
    scheduleEligible:false
  })
});

export const CONSEQUENT_ACTIONS=Object.freeze([
  "declare_current_law",
  "publish_as_authority",
  "edit_canonical_corpus",
  "accept_terms",
  "send_counterparty_response",
  "sign_contract",
  "contact_court",
  "submit_filing",
  "send_external",
  "file_external",
  "promote_unverified_source",
  "waive_human_gate"
]);

function clean(value,max=500){
  if(typeof value!=="string") throw new TypeError("proactive_text_required");
  const v=value.normalize("NFKC").trim();
  if(!v) throw new TypeError("proactive_text_required");
  if(v.length>max) throw new TypeError("proactive_text_too_long");
  return v;
}

function cleanList(values,maxItems=20,maxLen=240){
  if(!Array.isArray(values)) throw new TypeError("proactive_array_required");
  if(values.length>maxItems) throw new TypeError("proactive_array_too_long");
  return Object.freeze(values.map(v=>clean(String(v),maxLen)));
}

export function sanitizePreferenceMemory(input={}){
  if(!input || typeof input!=="object" || Array.isArray(input)) throw new TypeError("proactive_memory_object_required");
  const out={};
  if(input.citationStyle) out.citationStyle=clean(String(input.citationStyle),80);
  if(input.outputLanguage) out.outputLanguage=clean(String(input.outputLanguage),40);
  if(input.summaryStyle) out.summaryStyle=clean(String(input.summaryStyle),120);
  if(input.preferredStructure) out.preferredStructure=cleanList(input.preferredStructure,12,80);
  return Object.freeze(out);
}

export function buildProactiveRun({
  runId,
  templateId,
  matterId=null,
  objective,
  sourceUniverse=[],
  userPreferences={},
  requestedSchedule=null
}={}){
  const template=WORKFLOW_TEMPLATES[templateId];
  if(!template) throw new TypeError("proactive_unknown_template");
  if(requestedSchedule && !template.scheduleEligible) throw new TypeError("proactive_schedule_not_allowed");
  const schedule=requestedSchedule ? Object.freeze({
    cadence:clean(String(requestedSchedule.cadence||""),80),
    timezone:clean(String(requestedSchedule.timezone||""),80),
    enabled:false,
    activation:"requires_separate_runtime_authorization"
  }) : null;

  return Object.freeze({
    version:PROACTIVE_LEGAL_AGENTS_VERSION,
    runId:clean(String(runId),120),
    templateId,
    templateLabel:template.label,
    matterId:matterId ? clean(String(matterId),160) : null,
    objective:clean(objective,1200),
    sourceUniverse:cleanList(sourceUniverse,40,500),
    preferences:sanitizePreferenceMemory(userPreferences),
    agents:Object.freeze(template.agents.map(id=>AGENT_CAPABILITIES[id])),
    phases:template.phases,
    schedule,
    state:"planned",
    humanGate:Object.freeze({
      required:true,
      consequentialActions:"locked",
      externalTransmission:"forbidden",
      filing:"forbidden",
      signature:"forbidden",
      canonicalPromotion:"forbidden"
    })
  });
}

export function planParallelTasks(run){
  if(!run || run.version!==PROACTIVE_LEGAL_AGENTS_VERSION) throw new TypeError("proactive_run_required");
  const tasks=[];
  for(const agent of run.agents){
    tasks.push(Object.freeze({
      id:run.runId+":"+agent.id,
      agentId:agent.id,
      status:"planned",
      objective:run.objective,
      sourceUniverse:run.sourceUniverse,
      allowed:agent.allowed,
      forbidden:agent.forbidden,
      reviewRequired:true
    }));
  }
  return Object.freeze(tasks);
}

export function assertAgentAction(agentId,action){
  const agent=AGENT_CAPABILITIES[agentId];
  if(!agent) throw new TypeError("proactive_unknown_agent");
  const act=clean(String(action),120);
  if(CONSEQUENT_ACTIONS.includes(act) || agent.forbidden.includes(act)){
    return Object.freeze({allowed:false,reason:"human_gate_or_forbidden_action"});
  }
  return Object.freeze({
    allowed:agent.allowed.includes(act),
    reason:agent.allowed.includes(act) ? "bounded_agent_action" : "action_not_in_agent_mandate"
  });
}

export function createHumanNudge({runId,reason,question,blocking=true,sourceRefs=[]}={}){
  return Object.freeze({
    type:"human_nudge",
    runId:clean(String(runId),120),
    reason:clean(reason,300),
    question:clean(question,800),
    blocking:Boolean(blocking),
    sourceRefs:cleanList(sourceRefs,20,300),
    state:"awaiting_human_judgment"
  });
}

export function verifyRunForReview(run,{citationsComplete=false,sourceVersionsChecked=false,adverseAuthorityChecked=false}={}){
  if(!run || run.version!==PROACTIVE_LEGAL_AGENTS_VERSION) throw new TypeError("proactive_run_required");
  const blockers=[];
  if(!citationsComplete) blockers.push("citation_coverage_incomplete");
  if(!sourceVersionsChecked) blockers.push("source_version_check_incomplete");
  if(run.templateId==="litigation_case_review" && !adverseAuthorityChecked) blockers.push("adverse_authority_check_incomplete");
  return Object.freeze({
    readyForHumanReview:blockers.length===0,
    blockers:Object.freeze(blockers),
    humanGateRequired:true,
    releaseState:blockers.length ? "blocked_before_human_review" : "ready_for_human_review_not_release"
  });
}
