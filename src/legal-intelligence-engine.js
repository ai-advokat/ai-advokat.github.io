// AI Advokat — Legal Intelligence & Orchestration Engine (LIOE)
// Internal non-authority engine implementing the Legal Operating Protocol.
// It classifies mission depth, preserves jurisdiction/source/version discipline,
// applies named Human Gates, and prevents efficiency optimisations from weakening
// legal verification or human responsibility.

export const VERSION="ai-advokat-lioe-1.0.0";
export const ENGINE_ID="AI_ADVOKAT_LIOE_v1";
export const SPEC_PATH="/data/legal-intelligence-engine-v1.json";
export const EVAL_PATH="/data/legal-intelligence-evaluation-suite.json";
export const RUN_SCHEMA_PATH="/data/legal-runs/legal-run-record.schema.json";

export const LEGAL_MISSION_PROFILES=Object.freeze({
  GENERAL_BYPASS:Object.freeze({id:"GENERAL_BYPASS",depth:"non_legal",specialistBudget:1}),
  L0_INFORMATIONAL:Object.freeze({id:"L0_INFORMATIONAL",depth:"lightweight",specialistBudget:2}),
  L1_VERIFIED_RESEARCH:Object.freeze({id:"L1_VERIFIED_RESEARCH",depth:"standard",specialistBudget:4}),
  L2_STRATEGY_PROCEDURE:Object.freeze({id:"L2_STRATEGY_PROCEDURE",depth:"institutional",specialistBudget:6}),
  L3_CONSEQUENTIAL:Object.freeze({id:"L3_CONSEQUENTIAL",depth:"consequential",specialistBudget:8}),
  L4_LEGAL_TRUTH_GOVERNANCE:Object.freeze({id:"L4_LEGAL_TRUTH_GOVERNANCE",depth:"constitutional",specialistBudget:10})
});

const normalize=value=>` ${String(value||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim()} `;
const has=(q,patterns)=>patterns.some(p=>q.includes(normalize(p).trim()));

const LEGAL_SIGNALS=[
  "право","правен","правна","закон","член","суд","тужба","жалба","рок","постапка","пресуда","решение","договор","адвокат","кривич","управн","нотар",
  "legal","law","court","appeal","deadline","statute","regulation","contract","judgment","procedure"
];
const CURRENT_LAW_SIGNALS=["важечко","важечки","важечката","денес","сега","current law","currently in force","applicable law","најнова верзија","latest law"];
const TEMPORAL_SIGNALS=["влегува во сила","почнува да се применува","преодни одредби","application date","effective date","commencement","transitional provision","објавен но","published but"];
const STRATEGY_SIGNALS=["стратег","опции","спореди","ризик","процесен","рок за","жалба","remedy","strategy","options","compare","procedural","deadline","limitation","case plan"];
const ACTION_SIGNALS=[
  "финален поднесок","поднесок за поднесување","испрати до суд","поднеси до суд","поднеси го",
  "подготви тужба","изготви тужба","состави тужба","нацрт тужба","подготви жалба","изготви жалба","состави жалба",
  "подготви поднесок","изготви поднесок","состави поднесок",
  "file it","submit to court","send to court","final pleading","draft complaint","draft lawsuit","prepare complaint","prepare lawsuit","draft appeal","prepare appeal","draft pleading",
  "потпиши договор","sign contract","public release","јавна објава","production deploy","deploy to production"
];
const L4_SIGNALS=["production corpus","production corpus write","rag eligibility","rag_eligibility","прогласи ја оваа верзија","прогласи за важечк","current law promotion","legal status promotion","legal truth","сменi human gate","смени human gate","provider activation","активирај provider","corpus promotion"];
const GUIDE_SIGNALS=["водич","guide","каде е","каде во ai advokat","каталог","catalog"];
const ACTION_DRAFT_PATTERN=/\b(?:draft|prepare|compose|write)\b.{0,48}\b(?:complaint|lawsuit|appeal|pleading|petition|motion)\b/u;
const MK_ACTION_DRAFT_PATTERN=/(?:подготви|изготви|состави|направи(?:ш)?|напиши|изработи)(?: ми)?(?: нацрт)? (?:тужба|жалба|поднесок)/u;
const MK_PROCEDURE_PREP_PATTERN=/(?:подготв(?:и|иш|ам)|организира(?:ј|м)|собер(?:и|ам)|што ми треба|се што е потребно|сакам да започнам|како да започнам).{0,90}(?:оставинск|наследн).{0,40}(?:постапк|предмет|имот)?/u;

function inferGeneralBypass(q,mode){
  const governedLegalSignal=has(q,[...LEGAL_SIGNALS,...GUIDE_SIGNALS,...CURRENT_LAW_SIGNALS,...TEMPORAL_SIGNALS,...STRATEGY_SIGNALS,...ACTION_SIGNALS,...L4_SIGNALS])
    || ACTION_DRAFT_PATTERN.test(q) || MK_ACTION_DRAFT_PATTERN.test(q) || MK_PROCEDURE_PREP_PATTERN.test(q);
  return mode==="general_gpt" || !governedLegalSignal;
}
function selectProfile(q,{mode=null}={}){
  if(inferGeneralBypass(q,mode))return LEGAL_MISSION_PROFILES.GENERAL_BYPASS;
  if(has(q,L4_SIGNALS))return LEGAL_MISSION_PROFILES.L4_LEGAL_TRUTH_GOVERNANCE;
  if(has(q,ACTION_SIGNALS)||ACTION_DRAFT_PATTERN.test(q)||MK_ACTION_DRAFT_PATTERN.test(q))return LEGAL_MISSION_PROFILES.L3_CONSEQUENTIAL;
  const comparative=has(q,["спореди","compare","comparative","компаратив","versus"]);
  if(MK_PROCEDURE_PREP_PATTERN.test(q)||comparative||has(q,STRATEGY_SIGNALS))return LEGAL_MISSION_PROFILES.L2_STRATEGY_PROCEDURE;
  if(has(q,CURRENT_LAW_SIGNALS)||has(q,TEMPORAL_SIGNALS)||has(q,["истраж","research","правна анализа","legal analysis"]))return LEGAL_MISSION_PROFILES.L1_VERIFIED_RESEARCH;
  return LEGAL_MISSION_PROFILES.L0_INFORMATIONAL;
}

function requiredGateTypes(q,profile){
  const gates=new Set();
  if(profile.id==="L3_CONSEQUENTIAL")gates.add("author_approval");
  if(profile.id==="L4_LEGAL_TRUTH_GOVERNANCE"){
    if(has(q,["прогласи ја оваа верзија","прогласи за важечк","current law promotion","legal status promotion"]))gates.add("current_law_verification");
    if(has(q,["corpus promotion","legal corpus promotion","промовирај corpus","промовирај во корпус"]))gates.add("corpus_promotion");
    if(has(q,["production corpus","production corpus write"]))gates.add("production_corpus_write");
    if(has(q,["rag eligibility","rag_eligibility","rag promotion"]))gates.add("rag_eligibility");
    if(has(q,["public release","јавна објава"]))gates.add("public_release");
    if(has(q,["github","merge","код","code","production deploy","deploy to production"]))gates.add("github_merge");
    if(has(q,["provider activation","активирај provider"]))gates.add("provider_activation");
    if(!gates.size)gates.add("author_approval");
  }
  return [...gates];
}

function currentLawVerification(q,profile){
  return profile.id!=="GENERAL_BYPASS" && (has(q,CURRENT_LAW_SIGNALS)||has(q,TEMPORAL_SIGNALS)||profile.id==="L4_LEGAL_TRUTH_GOVERNANCE");
}

function classifyProblem(q,profile){
  if(profile.id==="GENERAL_BYPASS")return"general_assistance";
  if(profile.id==="L4_LEGAL_TRUTH_GOVERNANCE")return"legal_truth_and_governance";
  if(profile.id==="L3_CONSEQUENTIAL")return"consequential_legal_action_support";
  if(has(q,["рок","deadline","limitation","жалба"]))return"procedure_and_deadline";
  if(has(q,["спореди","compare","comparative","компаратив"]))return"comparative_legal_research";
  if(has(q,GUIDE_SIGNALS))return"legal_orientation_and_guides";
  return"verified_legal_research";
}

export function buildLegalIntelligencePlan(question="",options={}){
  const q=normalize(question);
  const mode=options.mode||null;
  const profile=selectProfile(q,{mode});
  const generalBypass=profile.id==="GENERAL_BYPASS";
  const currentLawRequired=currentLawVerification(q,profile);
  const temporalRequired=currentLawRequired||has(q,TEMPORAL_SIGNALS);
  const gateTypes=generalBypass?[]:requiredGateTypes(q,profile);
  const humanReviewRequired=!generalBypass && (
    ["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id)
    || currentLawRequired
    || options.highStakes===true
  );
  const legalStressRequired=["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id);
  const adversarialRequired=legalStressRequired;
  const optionsRequired=["L2_STRATEGY_PROCEDURE","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id);
  const systemMapRequired=["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id);
  const selectedAgents=Object.freeze([...(options.selectedAgents||[])]);
  const routingReasons=Object.freeze(Object.fromEntries(selectedAgents.map(id=>[id,["selected_by_chief_legal_orchestrator"]])));
  const earlyExitAllowed=["L0_INFORMATIONAL","L1_VERIFIED_RESEARCH"].includes(profile.id) && gateTypes.length===0;

  return Object.freeze({
    engine_id:ENGINE_ID,
    version:VERSION,
    engaged:!generalBypass,
    problem_class:classifyProblem(q,profile),
    mission_profile:profile,
    mode,
    objective:String(question||"").trim(),
    operating_cycle:Object.freeze(["intake","knowledge","system_map","diagnosis","specialist_routing","options","legal_stress_test","authority_and_human_gate","solution_design","implementation","adversarial_review","verify","learn"]),
    knowledge:Object.freeze({
      source_first:!generalBypass,
      corpus_first_when_applicable:mode==="passive_corpus",
      official_source_priority:!generalBypass,
      claim_level_provenance_required:!generalBypass,
      jurisdiction_labels_required:!generalBypass,
      current_law_verification_required:currentLawRequired,
      effective_date_required:temporalRequired,
      application_date_required:temporalRequired,
      transitional_provisions_check:temporalRequired,
      external_research_must_be_separately_labelled:!generalBypass
    }),
    system_map:Object.freeze({
      required:systemMapRequired,
      dimensions:Object.freeze(["parties","competent_body_or_court","procedural_posture","deadlines","documents","evidence","remedies","dependencies"])
    }),
    specialist_routing:Object.freeze({
      selected_agents:selectedAgents,
      routing_reasons:routingReasons,
      specialist_budget:profile.specialistBudget,
      every_specialist_requires_reason:true,
      full_fanout_by_default:false,
      verification_agent_required:!generalBypass,
      jurisdiction_blending_forbidden:true
    }),
    options:Object.freeze({
      required:optionsRequired,
      minimum_materially_different_options:optionsRequired?2:0,
      compare_on:Object.freeze(["authority_basis","deadline","benefit","risk","evidence_dependency","reversibility","procedural_consequence"])
    }),
    legal_stress_test:Object.freeze({
      required:legalStressRequired,
      checks:Object.freeze(["superseded_or_amended_law","commencement_vs_application_date","transitional_provisions","wrong_jurisdiction_or_authority_level","deadline_or_limitation_expiry","contrary_authority","missing_fact_or_evidence","procedural_inadmissibility","remedy_or_enforcement_failure","citation_or_locator_failure"])
    }),
    authority_and_human_gate:Object.freeze({
      human_review_required:humanReviewRequired,
      required_gate_types:Object.freeze(gateTypes),
      gate_isolation:true,
      missing_gate_means_not_approved:true,
      current_law_promotion_never_automatic:true,
      legal_representation_never_automatic:true
    }),
    implementation:Object.freeze({
      requested:options.implementationRequested===true||profile.id==="L3_CONSEQUENTIAL"||profile.id==="L4_LEGAL_TRUTH_GOVERNANCE",
      no_autonomous_filing:true,
      no_autonomous_legal_representation:true,
      no_autonomous_current_law_promotion:true,
      no_autonomous_production_corpus_write:true,
      no_autonomous_rag_promotion:true,
      staged_change_preferred:["L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id),
      rollback_reference_required:options.codeOrCorpusChange===true,
      regression_verification_required:options.codeOrCorpusChange===true
    }),
    adversarial_review:Object.freeze({
      required:adversarialRequired,
      preserve_material_disagreement:true,
      majority_vote_is_not_legal_authority:true
    }),
    early_exit:Object.freeze({
      allowed:earlyExitAllowed,
      forbidden:["L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id),
      conditions:Object.freeze(["objective_resolved","sources_sufficient","jurisdiction_clear","temporal_status_clear_if_material","no_high_stakes_action","no_contrary_authority_unresolved","no_required_gate_pending"])
    }),
    observability:Object.freeze({
      run_record_required:["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile.id),
      run_schema:RUN_SCHEMA_PATH,
      evaluation_suite:EVAL_PATH
    }),
    assurance:Object.freeze({
      unknown_is_not_verified:true,
      preserve_material_disagreement:true,
      provider_or_tool_failure_must_be_visible:true,
      source_freshness_required:currentLawRequired,
      no_uncalibrated_confidence_as_legal_evidence:true,
      privacy_data_minimisation:true
    }),
    release_state:"BLOCKED_PENDING_VERIFICATION"
  });
}

export function evaluateLegalEarlyExit(plan,state={}){
  const checks={
    objective_resolved:state.objectiveResolved===true,
    sources_sufficient:state.sourcesSufficient===true,
    jurisdiction_clear:state.jurisdictionClear===true,
    temporal_status_clear_if_material:plan?.knowledge?.current_law_verification_required!==true||state.temporalStatusClear===true,
    no_high_stakes_action:plan?.implementation?.requested!==true,
    no_contrary_authority_unresolved:state.contraryAuthorityUnresolved!==true,
    no_required_gate_pending:(plan?.authority_and_human_gate?.required_gate_types||[]).length===0
  };
  const allowed=plan?.early_exit?.allowed===true&&plan?.early_exit?.forbidden!==true&&Object.values(checks).every(Boolean);
  return Object.freeze({allowed,checks:Object.freeze(checks),reason:allowed?(state.reason||"all_legal_early_exit_conditions_satisfied"):"conditions_not_satisfied"});
}

export function buildLegalRunRecord(plan,meta={}){
  return Object.freeze({
    run_id:String(meta.runId||"UNASSIGNED"),
    case_id:meta.caseId??null,
    started_at:String(meta.startedAt||"UNASSIGNED"),
    finished_at:meta.finishedAt??null,
    record_origin:meta.recordOrigin||"LIVE_LIOE",
    mission_profile:plan?.mission_profile?.id||"L0_INFORMATIONAL",
    problem_class:plan?.problem_class||"verified_legal_research",
    mode:plan?.mode||null,
    objective:plan?.objective||null,
    jurisdictions:Object.freeze([...(meta.jurisdictions||[])]),
    specialist_agents:Object.freeze([...(plan?.specialist_routing?.selected_agents||[])]),
    routing_reasons:plan?.specialist_routing?.routing_reasons||{},
    source_verification_state:meta.sourceVerificationState||"PENDING",
    temporal_verification_state:plan?.knowledge?.current_law_verification_required?"PENDING":"NOT_REQUIRED",
    jurisdiction_verification_state:plan?.engaged?"PENDING":"NOT_REQUIRED",
    human_review_state:plan?.authority_and_human_gate?.human_review_required?"PENDING":"NOT_REQUIRED",
    required_gate_types:Object.freeze([...(plan?.authority_and_human_gate?.required_gate_types||[])]),
    gate_decisions:Object.freeze(meta.gateDecisions||{}),
    implementation_state:plan?.implementation?.requested?"PLANNED":"NOT_REQUESTED",
    legal_stress_test_state:plan?.legal_stress_test?.required?"PENDING":"NOT_REQUIRED",
    adversarial_review_state:plan?.adversarial_review?.required?"PENDING":"NOT_REQUIRED",
    verification_state:"PENDING",
    outcome_state:"UNKNOWN",
    release_status:"BLOCKED",
    first_pass_verification:null,
    correction_required:false,
    learning_candidates:Object.freeze([]),
    provider_or_tool_failures:Object.freeze([]),
    fallback_mode:"NONE",
    data_classification:meta.dataClassification||"UNKNOWN",
    elapsed_ms:null,
    tool_calls:null,
    measured_cost:null,
    metric_eligibility:Object.freeze({effectiveness:false,time:false,activation:false,tooling:false,cost:false})
  });
}

export const __test=Object.freeze({normalize,has,selectProfile,requiredGateTypes,currentLawVerification,classifyProblem});
