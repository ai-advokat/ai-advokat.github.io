// AI Advokat LIOE runtime governance.
// Pure release assessment + privacy-minimised D1 telemetry.
// This module stores no user question, answer, attachment, source text,
// membership identity, client fact or conversation history.

export const LEGAL_RUNTIME_GOVERNANCE_VERSION="ai-advokat-lioe-runtime-1.0.0";
export const LEGAL_RUNTIME_TELEMETRY_SCHEMA="1.0";

const OFFICIAL_HOSTS=Object.freeze([
  "slvesnik.com.mk",
  "ldbis.pravda.gov.mk",
  "pravda.gov.mk",
  "ustavensud.mk",
  "vrhoven.sud.mk",
  "sud.mk",
  "eur-lex.europa.eu",
  "curia.europa.eu",
  "hudoc.echr.coe.int",
  "echr.coe.int"
]);

function hostOf(value){
  try{return new URL(String(value||"")).hostname.toLowerCase();}
  catch{return"";}
}
function officialWebSourceCount(sources=[]){
  let count=0;
  for(const source of Array.isArray(sources)?sources:[]){
    const host=hostOf(source?.url);
    if(!host)continue;
    if(OFFICIAL_HOSTS.some(allowed=>host===allowed||host.endsWith("."+allowed)))count++;
  }
  return count;
}
function profileId(plan){return plan?.legalIntelligenceEngine?.mission_profile?.id||"GENERAL_BYPASS";}
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
  const webUsed=result?.webSearchUsed===true;
  const postflightNeeded=legalPostflightRequired(plan);
  const postflightPassed=!postflightNeeded || postflight?.verdict==="PASS";

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
    ? (postflightPassed ? (currentLawMaterial&&!currentVerified ? "PROVISIONAL" : "PASSED") : "FAILED")
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
    correction_required:postflightMeta?.attempts>1?1:0,
    web_search_used:result?.webSearchUsed===true?1:0,
    official_web_source_count:Number(assessment?.officialWebSourceCount)||0,
    external_source_count:Array.isArray(result?.sources)?result.sources.length:0,
    article_context_count:Array.isArray(articleBundle?.context)?articleBundle.context.length:0,
    guide_context_count:Number(guideContextCount)||0,
    attachment_count:Number(attachmentCount)||0,
    provider_calls:(Number(postflightMeta?.primaryProviderCalls)||0)+(Number(postflightMeta?.providerCalls)||0),
    input_tokens:inputTokens||null,
    output_tokens:outputTokens||null,
    total_tokens:totalTokens||null,
    elapsed_ms:Math.max(0,Number(elapsedMs)||0),
    model:result?.model||null,
    telemetry_schema_version:LEGAL_RUNTIME_TELEMETRY_SCHEMA
  });
}

export async function persistSanitisedRuntimeRecord(env,record){
  if(!env?.DB)return Object.freeze({ok:false,state:"database_not_bound"});
  try{
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
        provider_calls,input_tokens,output_tokens,total_tokens,elapsed_ms,model,telemetry_schema_version
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
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
      record.total_tokens,record.elapsed_ms,record.model,record.telemetry_schema_version
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
