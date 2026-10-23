import {
  classifyOpenLegalSource,
  isRegisteredOfficialLegalSource,
  OPEN_LEGAL_SOURCE_POLICY_VERSION
} from "./open-legal-sources-policy.js";

// AI Advokat LIOE runtime governance.
// Pure release assessment + privacy-minimised D1 telemetry.
// This module stores no user question, answer, attachment, source text,
// membership identity, client fact or conversation history.

export const LEGAL_RUNTIME_GOVERNANCE_VERSION="ai-advokat-lioe-runtime-1.0.0";
export const LEGAL_RUNTIME_TELEMETRY_SCHEMA="1.1";

function officialWebSourceCount(sources=[]){
  let count=0;
  for(const source of Array.isArray(sources)?sources:[]){
    if(isRegisteredOfficialLegalSource(source?.url))count++;
  }
  return count;
}

function registeredWebSourceCount(sources=[]){
  let count=0;
  for(const source of Array.isArray(sources)?sources:[]){
    if(classifyOpenLegalSource(source?.url))count++;
  }
  return count;
}

function policyCompliantWebSourceCount(sources=[]){
  let count=0;
  for(const source of Array.isArray(sources)?sources:[]){
    const policy=classifyOpenLegalSource(source?.url);
    if(!policy)continue;
    if(source?.agentBoundaryAllowed===false)continue;
    count++;
  }
  return count;
}
function profileId(plan){return plan?.legalIntelligenceEngine?.mission_profile?.id||"GENERAL_BYPASS";}
export function estimateWeightedCreditUnits({plan,result={},attachmentCount=0,postflightMeta={}}={}){
  const profile=profileId(plan);
  const base={
    GENERAL_BYPASS:1,
    L0_INFORMATIONAL:1,
    L1_VERIFIED_RESEARCH:2,
    L2_STRATEGY_PROCEDURE:3,
    L3_CONSEQUENTIAL:5,
    L4_LEGAL_TRUTH_GOVERNANCE:8
  }[profile]||1;
  const providerCalls=(Number(postflightMeta?.primaryProviderCalls)||0)+(Number(postflightMeta?.providerCalls)||0);
  const web=result?.webSearchUsed===true?1:0;
  const attachments=Math.min(5,Math.ceil((Number(attachmentCount)||0)/2));
  const extraCalls=Math.max(0,providerCalls-1);
  return Math.min(25,Math.max(1,base+web+attachments+extraCalls));
}
function isHighDepth(profile){return ["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile);}
function nativeCurrentVerified(articleBundle={}){
  const v=articleBundle?.version;
  const sources=Array.isArray(articleBundle?.legalSources)?articleBundle.legalSources:[];
  if(articleBundle?.state!=="matched" || v?.isCurrent!==true || v?.humanReviewStatus!=="approved" || !sources.length)return false;
  return sources.every(s=>s?.versionHumanReviewStatus==="approved"
    && s?.humanReviewStatus==="approved"
    && s?.status==="current_consolidated");
}

export function legalPostflightRequired(plan){
  const lioe=plan?.legalIntelligenceEngine;
  if(!lioe?.engaged)return false;
  const profile=profileId(plan);
  return lioe?.knowledge?.current_law_verification_required===true || isHighDepth(profile);
}

export function assessLegalRuntimeRelease({
  plan,
  articleBundle={},
  result={},
  postflight=null
}={}){
  const lioe=plan?.legalIntelligenceEngine;
  const engaged=lioe?.engaged===true;
  const profile=profileId(plan);
  const currentLawMaterial=lioe?.knowledge?.current_law_verification_required===true;
  const articleMatched=articleBundle?.state==="matched";
  const currentVerified=nativeCurrentVerified(articleBundle);
  const webSources=Array.isArray(result?.sources)?result.sources:[];
  const officialCount=officialWebSourceCount(webSources);
  const registeredCount=registeredWebSourceCount(webSources);
  const policyCompliantCount=policyCompliantWebSourceCount(webSources);
  const webUsed=result?.webSearchUsed===true;
  const postflightNeeded=legalPostflightRequired(plan);
  const postflightPassed=!postflightNeeded || postflight?.verdict==="PASS";
  const postflightRevised=postflightNeeded && postflight?.verdict==="REVISE";

  if(!engaged){
    return Object.freeze({
      currentLawMaterial:false,
      sourceVerificationState:"NOT_REQUIRED",
      temporalVerificationState:"NOT_REQUIRED",
      jurisdictionVerificationState:"NOT_REQUIRED",
      humanReviewRequired:false,
      releaseState:"GENERAL_ASSISTANCE",
      executionAuthorization:"GENERAL_ASSISTANCE_ONLY",
      verificationState:"PASSED",
      legalStressTestState:"NOT_REQUIRED",
      adversarialReviewState:"NOT_REQUIRED",
      officialWebSourceCount:officialCount,
      registeredOpenLegalSourceCount:registeredCount,
      policyCompliantWebSourceCount:policyCompliantCount,
      openLegalSourcePolicyVersion:OPEN_LEGAL_SOURCE_POLICY_VERSION,
      postflightRequired:false,
      warningMk:null
    });
  }

  const sourceVerificationState=articleMatched
    ? "VERIFIED"
    : webUsed&&webSources.length ? "PARTIAL"
      : "PENDING";

  const temporalVerificationState=!currentLawMaterial
    ? "NOT_REQUIRED"
    : currentVerified && postflight?.temporal_integrity==="VERIFIED" ? "VERIFIED"
      : webUsed&&webSources.length ? "PARTIAL"
        : "PENDING";

  const jurisdictionVerificationState=articleMatched
    ? "VERIFIED"
    : webUsed&&webSources.length ? "PARTIAL"
      : "PENDING";

  const requiredGates=lioe?.authority_and_human_gate?.required_gate_types||[];
  const planHumanReview=lioe?.authority_and_human_gate?.human_review_required===true;
  const humanReviewRequired=planHumanReview || !postflightPassed || (currentLawMaterial&&!currentVerified);

  let releaseState="PROVISIONAL_RESEARCH";
  let executionAuthorization="RESEARCH_OUTPUT_ONLY";
  let warningMk="Правниот одговор е истражувачки материјал и бара човечка проверка пред професионално потпирање.";

  if(profile==="L3_CONSEQUENTIAL"){
    releaseState="ADVISORY_DRAFT_HUMAN_GATE_REQUIRED";
    executionAuthorization="NO_EXTERNAL_ACTION";
    warningMk="L3 consequential: AI Advokat може да подготви истражување/нацрт, но не смее да поднесе, испрати, потпише или правно да застапува. Потребен е Human Gate.";
  }else if(profile==="L4_LEGAL_TRUTH_GOVERNANCE"){
    releaseState="GOVERNANCE_DRAFT_HUMAN_GATE_REQUIRED";
    executionAuthorization="NO_LEGAL_TRUTH_MUTATION";
    warningMk="L4 legal-truth/governance: нема автоматска промоција на важечко право, corpus/RAG, production legal truth или provider state. Потребен е соодветниот именуван Human Gate.";
  }else if(currentLawMaterial&&currentVerified&&postflightPassed){
    releaseState="VERIFIED_CURRENT_RESEARCH";
    executionAuthorization="RESEARCH_OUTPUT_ONLY";
    warningMk="Тековната верзија е поддржана од Human-Gate одобрен article-level corpus; сепак конечната професионална одговорност останува човечка.";
  }else if(currentLawMaterial){
    releaseState=webUsed&&webSources.length ? "PROVISIONAL_CURRENT_LAW_EXTERNAL_RESEARCH" : "UNVERIFIED_CURRENT_LAW";
    executionAuthorization="RESEARCH_OUTPUT_ONLY";
    warningMk="Не е исполнет условот за VERIFIED_CURRENT. Одговорот е provisional research; проверете официјален извор, применлива верзија/датум и Human Gate пред потпирање.";
  }else if(articleMatched&&postflightPassed){
    releaseState="VERIFIED_SOURCE_BACKED_RESEARCH";
    executionAuthorization="RESEARCH_OUTPUT_ONLY";
    warningMk="Source-backed правно истражување; не претставува автономно правно дејство или застапување.";
  }else if(webUsed&&webSources.length){
    releaseState="PROVISIONAL_EXTERNAL_RESEARCH";
    executionAuthorization="RESEARCH_OUTPUT_ONLY";
    warningMk="External legal research е одделно означено и останува provisional додека не се потврдат authority, version/date и applicability.";
  }

  const verificationState=postflightNeeded
    ? (postflightPassed
      ? (currentLawMaterial&&!currentVerified ? "PROVISIONAL" : "PASSED")
      : postflightRevised ? "PROVISIONAL" : "FAILED")
    : (articleMatched ? "PASSED" : "PROVISIONAL");

  return Object.freeze({
    currentLawMaterial,
    sourceVerificationState,
    temporalVerificationState,
    jurisdictionVerificationState,
    humanReviewRequired,
    requiredGateTypes:Object.freeze([...requiredGates]),
    releaseState,
    executionAuthorization,
    verificationState,
    legalStressTestState:isHighDepth(profile)
      ? (postflightPassed&&postflight?.stress_test==="PASS" ? "PASSED" : "PROVISIONAL")
      : "NOT_REQUIRED",
    adversarialReviewState:isHighDepth(profile)
      ? (postflightPassed&&postflight?.adversarial_review==="PASS" ? "PASSED" : "PROVISIONAL")
      : "NOT_REQUIRED",
    officialWebSourceCount:officialCount,
    registeredOpenLegalSourceCount:registeredCount,
    policyCompliantWebSourceCount:policyCompliantCount,
    openLegalSourcePolicyVersion:OPEN_LEGAL_SOURCE_POLICY_VERSION,
    postflightRequired:postflightNeeded,
    warningMk
  });
}

export function buildSanitisedRuntimeRecord({
  runId,
  startedAt,
  finishedAt,
  elapsedMs,
  plan,
  assessment,
  result={},
  articleBundle={},
  guideContextCount=0,
  attachmentCount=0,
  sourceMode=null,
  postflightMeta={}
}={}){
  const usage=result?.usage||{};
  const postUsage=postflightMeta?.usage||{};
  const inputTokens=(Number(usage.inputTokens)||0)+(Number(postUsage.inputTokens)||0);
  const outputTokens=(Number(usage.outputTokens)||0)+(Number(postUsage.outputTokens)||0);
  const totalTokens=(Number(usage.totalTokens)||0)+(Number(postUsage.totalTokens)||0);
  const profile=profileId(plan);
  const lioe=plan?.legalIntelligenceEngine||{};
  const specialistAgents=Array.isArray(plan?.agents)?plan.agents:[];
  return Object.freeze({
    run_id:String(runId),
    started_at:String(startedAt),
    finished_at:String(finishedAt),
    mission_profile:profile,
    problem_class:String(lioe.problem_class||"general_assistance"),
    mode:plan?.mode||null,
    source_mode:sourceMode||null,
    current_law_material:assessment?.currentLawMaterial===true?1:0,
    source_verification_state:String(assessment?.sourceVerificationState||"PENDING"),
    temporal_verification_state:String(assessment?.temporalVerificationState||"PENDING"),
    jurisdiction_verification_state:String(assessment?.jurisdictionVerificationState||"PENDING"),
    human_review_required:assessment?.humanReviewRequired===true?1:0,
    required_gate_types_json:JSON.stringify(assessment?.requiredGateTypes||[]),
    specialist_agents_json:JSON.stringify(specialistAgents),
    implementation_requested:lioe?.implementation?.requested===true?1:0,
    execution_authorization:String(assessment?.executionAuthorization||"RESEARCH_OUTPUT_ONLY"),
    legal_stress_test_state:String(assessment?.legalStressTestState||"NOT_REQUIRED"),
    adversarial_review_state:String(assessment?.adversarialReviewState||"NOT_REQUIRED"),
    verification_state:String(assessment?.verificationState||"PENDING"),
    outcome_state:result?.ok===true?"SUCCESS":"FAILURE",
    release_state:String(assessment?.releaseState||"BLOCKED"),
    provider_state:result?.ok===true?"COMPLETED":"FAILED",
    postflight_required:assessment?.postflightRequired===true?1:0,
    first_pass_verification:postflightMeta?.attempts
      ? (postflightMeta.firstPass===true?1:0)
      : null,
    verification_attempts:postflightMeta?.attempts||null,
    correction_required:(postflightMeta?.verdict==="REVISE" || postflightMeta?.attempts>1)?1:0,
    web_search_used:result?.webSearchUsed===true?1:0,
    official_web_source_count:Number(assessment?.officialWebSourceCount)||0,
    external_source_count:Array.isArray(result?.sources)?result.sources.length:0,
    registered_open_legal_source_count:Number(assessment?.registeredOpenLegalSourceCount)||0,
    policy_compliant_web_source_count:Number(assessment?.policyCompliantWebSourceCount)||0,
    article_context_count:Array.isArray(articleBundle?.context)?articleBundle.context.length:0,
    guide_context_count:Number(guideContextCount)||0,
    attachment_count:Number(attachmentCount)||0,
    provider_calls:(Number(postflightMeta?.primaryProviderCalls)||0)+(Number(postflightMeta?.providerCalls)||0),
    estimated_credit_units:estimateWeightedCreditUnits({plan,result,attachmentCount,postflightMeta}),
    input_tokens:inputTokens||null,
    output_tokens:outputTokens||null,
    total_tokens:totalTokens||null,
    elapsed_ms:Math.max(0,Number(elapsedMs)||0),
    model:result?.model||null,
    error_code:typeof result?.error==="string"?result.error.slice(0,80):null,
    http_status:Number.isFinite(Number(result?.status))?Number(result.status):null,
    response_status:typeof result?.responseStatus==="string"?result.responseStatus.slice(0,80):null,
    incomplete_reason:typeof result?.failureDetail==="string"?result.failureDetail.slice(0,120):null,
    provider_request_id:typeof result?.requestId==="string"?result.requestId.slice(0,180):null,
    provider_response_id:typeof result?.responseId==="string"?result.responseId.slice(0,180):null,
    provider_timeout_ms:Number.isFinite(Number(result?.timeoutMs))?Number(result.timeoutMs):null,
    provider_attempts_json:JSON.stringify(Array.isArray(result?.providerAttempts)?result.providerAttempts.slice(0,2):[]),
    telemetry_schema_version:LEGAL_RUNTIME_TELEMETRY_SCHEMA
  });
}

export async function persistSanitisedRuntimeRecord(env,record){
  if(!env?.DB)return Object.freeze({ok:false,state:"database_not_bound"});
  try{
    // Weighted credit units are deliberately derived from already-stored,
    // privacy-minimised telemetry. They are not persisted as a new billing
    // field, so cost calibration does not require a production schema change.
    await env.DB.prepare(
      `INSERT INTO lioe_runtime_runs (
        run_id,started_at,finished_at,mission_profile,problem_class,mode,source_mode,
        current_law_material,source_verification_state,temporal_verification_state,
        jurisdiction_verification_state,human_review_required,required_gate_types_json,
        specialist_agents_json,implementation_requested,execution_authorization,
        legal_stress_test_state,adversarial_review_state,verification_state,outcome_state,
        release_state,provider_state,postflight_required,first_pass_verification,
        verification_attempts,correction_required,web_search_used,official_web_source_count,
        external_source_count,article_context_count,guide_context_count,attachment_count,
        provider_calls,input_tokens,output_tokens,total_tokens,elapsed_ms,model,
        error_code,http_status,response_status,incomplete_reason,provider_request_id,
        provider_response_id,provider_timeout_ms,provider_attempts_json,telemetry_schema_version
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      record.run_id,record.started_at,record.finished_at,record.mission_profile,record.problem_class,
      record.mode,record.source_mode,record.current_law_material,record.source_verification_state,
      record.temporal_verification_state,record.jurisdiction_verification_state,record.human_review_required,
      record.required_gate_types_json,record.specialist_agents_json,record.implementation_requested,
      record.execution_authorization,record.legal_stress_test_state,record.adversarial_review_state,
      record.verification_state,record.outcome_state,record.release_state,record.provider_state,
      record.postflight_required,record.first_pass_verification,record.verification_attempts,
      record.correction_required,record.web_search_used,record.official_web_source_count,
      record.external_source_count,record.article_context_count,record.guide_context_count,
      record.attachment_count,record.provider_calls,record.input_tokens,record.output_tokens,
      record.total_tokens,record.elapsed_ms,record.model,record.error_code,record.http_status,
      record.response_status,record.incomplete_reason,record.provider_request_id,record.provider_response_id,
      record.provider_timeout_ms,record.provider_attempts_json,record.telemetry_schema_version
    ).run();
    return Object.freeze({ok:true,state:"recorded"});
  }catch(error){
    const message=String(error?.message||error);
    console.error("lioe_runtime_telemetry_write_failed",message.slice(0,180));
    return Object.freeze({
      ok:false,
      state:/no such table/i.test(message)?"migration_0028_required":"write_failed"
    });
  }
}
