import { buildLegalIntelligencePlan, VERSION as LIOE_VERSION, SPEC_PATH as LIOE_SPEC_PATH } from "./legal-intelligence-engine.js";

// AI Advokat — governed legal-agent orchestration architecture.
// V2 implements the manager-style contract requested by the author:
// one user-facing Chief Legal Orchestrator, bounded specialist agents,
// a final Verification & Citation Agent, corpus-first native knowledge,
// strict jurisdiction separation and fail-closed Human Gates.
//
// Provider activation is deliberately separate from architecture readiness.
// No external provider call is made unless OPENAI_ORCHESTRATOR_ENABLED=true
// and the required server-side provider configuration is present.

export const AGENT_ROLES = Object.freeze({
  chief: Object.freeze({
    id: "chief_legal_orchestrator",
    label: "AI Advokat — Chief Legal Orchestrator",
    control: "manager_retains_user_conversation",
    purpose: "Understands the legal research task, selects bounded specialists, compares their outputs, requires verification, and composes the final answer."
  }),
  mk: Object.freeze({
    id: "macedonian_law",
    label: "Macedonian Law Agent",
    jurisdiction: "MK",
    authorityBoundary: "controlling_only_when_supported_by_verified_official_MK_sources",
    preferredSources: ["Official Gazette", "LDBIS", "Constitutional Court", "Supreme Court", "official court/institution source"],
    purpose: "North Macedonian law with official-source priority, exact version/application date and Human Gate state."
  }),
  eu: Object.freeze({
    id: "eu_law",
    label: "EU Law Agent",
    jurisdiction: "EU",
    authorityBoundary: "EU_authority_only",
    preferredSources: ["EUR-Lex", "CURIA/CJEU"],
    purpose: "EU primary and secondary law and CJEU authority, with jurisdiction, date and source labels."
  }),
  echr: Object.freeze({
    id: "echr_law",
    label: "ECHR Agent",
    jurisdiction: "ECHR",
    authorityBoundary: "ECHR_ECtHR_authority_only",
    preferredSources: ["HUDOC", "ECtHR official materials"],
    purpose: "European Convention and ECtHR/HUDOC authority, kept distinct from EU law and domestic law."
  }),
  international: Object.freeze({
    id: "international_law",
    label: "International Law Agent",
    jurisdiction: "INTL",
    authorityBoundary: "international_authority_with_instrument_and_body_label",
    preferredSources: ["official treaty depository", "United Nations", "ICJ/ICC/official international organisation source"],
    purpose: "Treaties, international organisations, international courts and relevant instruments with authority labels."
  }),
  common: Object.freeze({
    id: "common_law",
    label: "Anglo-American / Common Law Agent",
    jurisdiction: "COMMON_LAW",
    authorityBoundary: "country_and_court_hierarchy_required",
    preferredSources: ["official legislation/court source", "authorised report/source"],
    purpose: "UK/US and other common-law research with explicit country, court hierarchy and precedent status; never imported as Macedonian controlling law."
  }),
  general: Object.freeze({
    id: "general_gpt_assistant",
    label: "GPT General Assistant",
    jurisdiction: "GENERAL",
    authorityBoundary: "general_assistance_non_legal_or_explicitly_labelled",
    preferredSources: ["OpenAI model knowledge", "approved tools when enabled"],
    purpose: "Handles ordinary non-legal questions and productivity tasks when they are outside the AI Advokat native corpus, while never presenting general model knowledge as verified Macedonian law."
  }),
  corpus: Object.freeze({
    id: "ai_advokat_knowledge",
    label: "AI Advokat Knowledge Agent",
    jurisdiction: "AI_ADVOCAT_CORPUS",
    authorityBoundary: "native_material_only_until_explicit_external_research_step",
    preferredSources: ["AI Advokat governed corpus", "author-approved internal instructions", "governed guides/publications"],
    purpose: "Answers from Zoran Stojankich / AI Advokat native materials first, preserving exact document provenance and corpus boundaries."
  }),
  verify: Object.freeze({
    id: "verification_citation",
    label: "Verification & Citation Agent",
    control: "mandatory_pre_release_check",
    purpose: "Checks source identity, jurisdiction, date/version, authority hierarchy, claim-to-citation coverage, external/native labels and Human Gate state before the Chief composes the final answer."
  })
});

export const ORCHESTRATOR_MODES = Object.freeze({
  PASSIVE_CORPUS: "passive_corpus",
  PROACTIVE_RESEARCH: "proactive_research",
  COMPARATIVE: "comparative",
  GENERAL: "general_gpt"
});

export const LEGAL_OPERATING_PROTOCOL = Object.freeze({
  id:"AI_ADVOKAT_LEGAL_OPERATING_PROTOCOL_v1",
  document:"/data/legal-operating-protocol-v1.json",
  directive:"/architecture/AI_ADVOKAT_LEGAL_OPERATING_PROTOCOL.md",
  executionEngine:Object.freeze({id:"AI_ADVOKAT_LIOE_v1",version:LIOE_VERSION,specification:LIOE_SPEC_PATH,createsLegalAuthority:false}),
  cycle:Object.freeze(["intake","knowledge","system_map","diagnosis","specialist_routing","options","legal_stress_test","authority_gate","solution_design","implementation","adversarial_review","verify","learn"]),
  createsLegalAuthority:false,
  humanGateUnchanged:true
});

export const ORCHESTRATION_PATTERN = Object.freeze({
  pattern: "manager_agents_as_tools",
  userFacingAgent: AGENT_ROLES.chief.id,
  specialistControl: "bounded_subtasks",
  handoffPolicy: "disabled_by_default",
  verifierRequired: true,
  finalAnswerOwner: AGENT_ROLES.chief.id,
  externalResearchPolicy: "separate_and_visibly_labelled",
  humanGatePolicy: "gate_isolation_fail_closed"
});

const ROUTE_PATTERNS = Object.freeze({
  mk: /(?:македонск(?:о|ото|и|ата) право|северна македонија|република северна македонија|службен весник|лдбис|уставен суд|врховен суд|\bmk law\b|north macedonia law)/iu,
  corpus: /(?:ai advokat|аи адвокат|зора(?:н|нот)|стојанкиќ|упатств(?:о|ата)|наш(?:и|ата) документ|во базата|корпус|водич(?:от|ите)?|knowledge base|native corpus)/iu,
  eu: /(?:\b(?:eu|european union|eur-lex|curia|cjeu|tfeu|teu|directive|regulation)\b|европска(?:та)? унија|право(?:то)? на европска(?:та)? унија|еур-лекс|курија|суд(?:от)? на правдата на европска(?:та)? унија)/iu,
  echr: /(?:\b(?:echr|ecthr|hudoc|european convention|strasbourg)\b|европски(?:от)? суд за човекови права|есчп|ехрч|европска(?:та)? конвенција за човекови права|худок)/iu,
  common: /(?:\b(?:common law|england|wales|uk law|united kingdom|us law|u\.s\.|united states|precedent|stare decisis)\b|англо[- ]?американско право|англо[- ]?саксонско право|англиско право|право(?:то)? на обединетото кралство|американско право|судски преседан)/iu,
  international: /(?:\b(?:international law|treaty|convention|united nations|\bun\b|icc|icj|vienna convention)\b|меѓународно право|меѓународен договор|обединети нации|меѓународен суд на правдата|виенска конвенција)/iu,
  comparison: /(?:спореди|споредба|компаратив|наспроти|versus|\bvs\.?\b|compare|comparative)/iu,
  legal: /(?:право|правен|правна|закон|член|тужб|жалб|суд|адвокат|обвин|полици|кривич|управн|договор|нотар|рок|пресуд|решение|осигур|штета|работен однос|семејн|развод|притвор|казна|важечк|поднесок|human gate|production corpus|corpus promotion|rag eligibility|provider activation|legal|law|court|lawsuit|appeal|statute|regulation|contract|police)/iu
});

const ROLE_BY_ID = Object.freeze(Object.fromEntries(
  Object.values(AGENT_ROLES).map(role=>[role.id,role])
));

function routeKeys(question,{preferCorpus=false}={}) {
  const q=String(question || "");
  const selected=new Set();
  if(preferCorpus || ROUTE_PATTERNS.corpus.test(q)) selected.add("corpus");

  for(const key of ["mk","eu","echr","common","international"]){
    if(ROUTE_PATTERNS[key].test(q)) selected.add(key);
  }

  // Ordinary non-legal tasks are routed to the general GPT layer. Legal
  // questions with no named foreign jurisdiction default conservatively to MK.
  if(!selected.size){
    if(ROUTE_PATTERNS.legal.test(q)) selected.add("mk");
    else selected.add("general");
  }

  // A comparison that names a foreign system but references Macedonian law
  // explicitly keeps MK as a separate specialist; it is never inferred as
  // controlling law merely because AI Advokat is a Macedonian platform.
  return [...selected];
}

export function buildAgentPlan(question, {preferCorpus=false, explicitMode=null}={}) {
  const q=String(question || "");
  const keys=routeKeys(q,{preferCorpus});
  const selected=new Set(keys);

  // Passive corpus mode always keeps the domestic-law specialist available for
  // source/version verification, but native material remains first.
  if(preferCorpus || explicitMode===ORCHESTRATOR_MODES.PASSIVE_CORPUS){
    selected.add("corpus");
    selected.add("mk");
  }

  const jurisdictionKeys=[...selected].filter(k=>k!=="corpus" && k!=="general");
  const comparative=ROUTE_PATTERNS.comparison.test(q) || jurisdictionKeys.length>1;
  const mode=explicitMode
    || (selected.has("corpus") && (preferCorpus || !comparative)
      ? ORCHESTRATOR_MODES.PASSIVE_CORPUS
      : selected.has("general") && selected.size===1
        ? ORCHESTRATOR_MODES.GENERAL
        : comparative
          ? ORCHESTRATOR_MODES.COMPARATIVE
          : ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);

  const agents=[...selected].map(key=>AGENT_ROLES[key].id);
  const legalIntelligenceEngine=buildLegalIntelligencePlan(q,{mode,selectedAgents:agents});

  return Object.freeze({
    mode,
    legalOperatingProtocol:LEGAL_OPERATING_PROTOCOL,
    legalIntelligenceEngine,
    orchestrator:AGENT_ROLES.chief.id,
    agents,
    verifier:AGENT_ROLES.verify.id,
    pattern:ORCHESTRATION_PATTERN.pattern,
    rules:Object.freeze({
      corpusFirst:mode===ORCHESTRATOR_MODES.PASSIVE_CORPUS,
      corpusMissingMustBeSaidExplicitly:true,
      preserveJurisdictionBoundaries:true,
      sourceFirst:true,
      verifierRequired:true,
      managerRetainsConversation:true,
      externalResearchMustBeLabelled:true,
      externalResearchIsSeparateStep:true,
      humanGateRequiredForCurrentLawPromotion:true,
      humanGateRequiredForCorpusPromotion:true,
      minimalSufficientSpecialistActivation:true,
      lioeMissionProfile:legalIntelligenceEngine.mission_profile.id,
      legalStressTestRequired:legalIntelligenceEngine.legal_stress_test.required,
      runRecordRequired:legalIntelligenceEngine.observability.run_record_required
    })
  });
}

export function buildExecutionGraph(plan) {
  if(!plan || !Array.isArray(plan.agents)) throw new TypeError("invalid_agent_plan");
  return Object.freeze({
    pattern:ORCHESTRATION_PATTERN.pattern,
    userFacingAgent:AGENT_ROLES.chief.id,
    phases:Object.freeze([
      Object.freeze({
        id:"legal_operating_protocol",
        execution:"mandatory_for_legal_tasks",
        cycle:LEGAL_OPERATING_PROTOCOL.cycle,
        rule:"Structure the problem before specialist research; the protocol creates no legal authority and cannot bypass any Human Gate."
      }),
      Object.freeze({
        id:"legal_intelligence_engine",
        execution:plan.legalIntelligenceEngine?.engaged===false?"bypassed_for_general_task":"mandatory_for_legal_tasks",
        engine:plan.legalIntelligenceEngine?.engine_id||"AI_ADVOKAT_LIOE_v1",
        missionProfile:plan.legalIntelligenceEngine?.mission_profile?.id||"GENERAL_BYPASS",
        rule:"Apply variable legal mission depth, source/version discipline, named Human Gates and legal stress testing without creating legal authority."
      }),
      Object.freeze({
        id:"specialist_research",
        execution:"parallel_when_independent",
        agents:Object.freeze([...plan.agents]),
        rule:"Each specialist may use only its own jurisdiction/source boundary."
      }),
      Object.freeze({
        id:"verification",
        execution:"mandatory_after_specialists",
        agent:AGENT_ROLES.verify.id,
        rule:"Reject unsupported claims, mixed jurisdictions, missing source/version labels and native/external mislabelling."
      }),
      Object.freeze({
        id:"chief_synthesis",
        execution:"after_verification_only",
        agent:AGENT_ROLES.chief.id,
        rule:"Compose one user-facing answer while preserving separate authority labels and Human Gate state."
      })
    ]),
    finalAnswerOwner:AGENT_ROLES.chief.id,
    handoffPolicy:ORCHESTRATION_PATTERN.handoffPolicy
  });
}

export function specialistInstructions(agentId) {
  const role=ROLE_BY_ID[agentId];
  if(!role || agentId===AGENT_ROLES.chief.id) throw new TypeError("unknown_or_non_specialist_agent");

  const shared=[
    `You are ${role.label}, a bounded specialist inside AI Advokat.`,
    "You do not own the user conversation. Return research findings to the Chief Legal Orchestrator.",
    "Use only supplied/approved source material or tools for your own authority boundary; do not fill gaps from memory.",
    "Every material legal claim must carry source identity, locator where available, date/version and jurisdiction.",
    "If the sources do not support a proposition, say NOT_SUPPORTED instead of guessing.",
    "Never silently import another jurisdiction as controlling authority."
  ];

  if(agentId===AGENT_ROLES.general.id){
    shared.push(
      "Handle ordinary non-legal questions and productivity tasks helpfully.",
      "Never present general model knowledge as verified Macedonian law.",
      "If a task becomes legal or high-stakes, preserve legal-source and Human Gate rules."
    );
  }
  if(agentId===AGENT_ROLES.corpus.id){
    shared.push(
      "Native AI Advokat corpus comes first.",
      "Do not replace missing corpus support with model knowledge.",
      "If the native corpus does not support the answer, return CORPUS_NOT_SUPPORTED.",
      "External legal research, if later authorised, must be a separate visibly labelled step."
    );
  }
  if(agentId===AGENT_ROLES.verify.id){
    shared.push(
      "You are the final verification gate before Chief synthesis.",
      "Reject claims without adequate citations, current-law claims without version/date evidence, and any jurisdiction blending.",
      "Check that AI Advokat native material and External legal research are visibly separated."
    );
  }

  return shared.join("\n");
}

export function orchestratorInstructions(plan) {
  const agentList=plan.agents.join(", ");
  return [
    "You are AI Advokat, the Chief Legal Orchestrator and the only user-facing legal agent.",
    "Use manager-style orchestration: keep control of the conversation and call bounded specialists for sub-tasks.",
    plan.mode===ORCHESTRATOR_MODES.GENERAL
      ? "For ordinary non-legal questions, provide general GPT assistance. For legal or high-stakes claims, preserve AI Advokat source and Human Gate rules."
      : "Your task is legal research assistance, not autonomous legal representation.",
    `MODE: ${plan.mode}. SPECIALISTS: ${agentList}. VERIFIER: ${plan.verifier}.`,
    `LIOE MISSION PROFILE: ${plan.legalIntelligenceEngine?.mission_profile?.id||"GENERAL_BYPASS"}. CURRENT-LAW VERIFICATION: ${plan.legalIntelligenceEngine?.knowledge?.current_law_verification_required===true?"REQUIRED":"NOT_TRIGGERED"}.`,
    "Never merge jurisdictions or imply that comparative authority is controlling law.",
    "For AI Advokat native documents, corpus content and exact provenance come first. If the corpus does not support a proposition, say so.",
    "Fingerprint-verified GUIDE_DOCUMENT attachments are secondary authored/editorial guides. You may read them for procedure, explanation, examples, checklists and authorial framing, but they are not official law and never outrank article-level or official legal sources.",
    "If a guide states a legal rule, deadline, remedy or current-law proposition that is not supported by the supplied article-level/official layer, label it as guide-derived and unverified rather than presenting it as current law.",
    "Do not silently fall back from the native corpus to general model knowledge.",
    "External research must be a separate step visibly labelled 'External legal research' and must never be presented as authored/native AI Advokat material.",
    "For Macedonian law, never promote a version to current/verified without controlling official-source/version evidence and the applicable Human Gate.",
    "Every material legal proposition must be traceable to a supplied source or tool result.",
    "The Verification & Citation Agent must check source, jurisdiction, date/version, applicability and citation coverage before you compose the final answer. For material legal tasks, apply the Legal Operating Protocol: Intake -> Knowledge -> System Map -> Diagnosis -> Specialist Routing -> Options -> Legal Stress Test -> Authority & Human Gate -> Solution Design -> Implementation -> Adversarial Review -> Verify -> Learn. Adversarial review challenges the proposal but never substitutes for source verification or Human Gate approval.",
    "AI may research, compare and propose; author approval, current-law status, corpus promotion, RAG eligibility and sensitive production changes remain separate Human Gates."
  ].join("\n");
}

export function buildExecutionEnvelope(plan,{question,corpusContext=[],externalContext=[]}={}) {
  const graph=buildExecutionGraph(plan);
  return Object.freeze({
    architecture:"AI_ADVOKAT_GOVERNED_AGENT_ARCHITECTURE_v2",
    question:String(question || ""),
    plan,
    graph,
    context:Object.freeze({
      nativeCorpus:Object.freeze(Array.isArray(corpusContext)?[...corpusContext]:[]),
      externalResearch:Object.freeze(Array.isArray(externalContext)?[...externalContext]:[])
    }),
    labels:Object.freeze({
      native:"AI Advokat corpus",
      external:"External legal research",
      synthesis:"AI synthesis"
    })
  });
}

export function validateExecutionPreconditions(plan,{corpusContext=[],externalContext=[],externalResearchEnabled=false}={}) {
  const problems=[];
  const nativeCount=Array.isArray(corpusContext)?corpusContext.length:0;
  const externalCount=Array.isArray(externalContext)?externalContext.length:0;

  if(plan?.rules?.corpusFirst && nativeCount===0) problems.push("native_corpus_context_required");
  if(externalCount>0 && !externalResearchEnabled) problems.push("external_research_not_authorized");
  if(plan?.agents?.includes(AGENT_ROLES.corpus.id) && nativeCount===0) problems.push("knowledge_agent_has_no_governed_context");

  return Object.freeze({
    ok:problems.length===0,
    problems:Object.freeze(problems)
  });
}

export function openAIOrchestratorConfigured(env) {
  return env?.OPENAI_ORCHESTRATOR_ENABLED==="true"
    && typeof env?.OPENAI_API_KEY==="string" && env.OPENAI_API_KEY.length>20
    && typeof env?.OPENAI_MODEL==="string" && env.OPENAI_MODEL.trim().length>0;
}

export function orchestratorRuntimeReadiness(env={}) {
  return Object.freeze({
    architecture:"ready_v2",
    orchestrationPattern:ORCHESTRATION_PATTERN.pattern,
    provider:openAIOrchestratorConfigured(env) ? "configured" : "locked",
    nativeCorpusTool:env?.OPENAI_NATIVE_CORPUS_TOOL_ENABLED==="true" ? "configured" : "locked",
    externalResearchTools:env?.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED==="true" ? "configured" : "locked",
    fileInputs:env?.OPENAI_FILE_INPUT_ENABLED==="true" ? "configured" : "locked",
    tracing:env?.OPENAI_AGENTS_TRACING_ENABLED==="true" ? "configured" : "locked",
    humanGate:"required"
  });
}

export function extractOpenAIResponseText(payload) {
  if(payload && typeof payload.output_text==="string" && payload.output_text.trim()) return payload.output_text.trim();
  if(!Array.isArray(payload?.output)) return null;
  const parts=[];
  for(const item of payload.output){
    if(item?.type!=="message" || !Array.isArray(item.content)) continue;
    for(const content of item.content){
      if(content?.type==="output_text" && typeof content.text==="string" && content.text.trim()) parts.push(content.text.trim());
    }
  }
  return parts.length ? parts.join("\n\n") : null;
}

export function extractOpenAIUsage(payload) {
  const usage=payload?.usage||{};
  const inputTokens=Number(usage.input_tokens||0);
  const outputTokens=Number(usage.output_tokens||0);
  const totalTokens=Number(usage.total_tokens||inputTokens+outputTokens);
  return Object.freeze({
    inputTokens:Number.isFinite(inputTokens)&&inputTokens>=0?inputTokens:0,
    outputTokens:Number.isFinite(outputTokens)&&outputTokens>=0?outputTokens:0,
    totalTokens:Number.isFinite(totalTokens)&&totalTokens>=0?totalTokens:0
  });
}

export function extractOpenAIWebCitations(payload) {
  if(!Array.isArray(payload?.output)) return [];
  const seen=new Set();
  const citations=[];
  for(const item of payload.output){
    if(item?.type!=="message" || !Array.isArray(item.content)) continue;
    for(const content of item.content){
      if(content?.type!=="output_text" || !Array.isArray(content.annotations)) continue;
      for(const annotation of content.annotations){
        if(annotation?.type!=="url_citation") continue;
        const url=String(annotation.url || "").trim();
        if(!/^https?:\/\//i.test(url) || seen.has(url)) continue;
        seen.add(url);
        citations.push({
          url,
          title:String(annotation.title || url).trim().slice(0,240)
        });
      }
    }
  }
  return citations.slice(0,12);
}

function compactSourceContext(items,label) {
  if(!Array.isArray(items) || !items.length) return `${label}: NONE`;
  return `${label}:\n`+items.map((item,index)=>{
    if(typeof item==="string") return `[${index+1}] ${item}`;
    const source=String(item?.source || item?.source_identity || "unknown");
    const locator=String(item?.locator || "");
    const version=String(item?.version || item?.date || "");
    const text=String(item?.text || item?.content || "");
    return `[${index+1}] SOURCE=${source}; LOCATOR=${locator}; VERSION=${version}\n${text}`;
  }).join("\n\n---\n\n");
}

export function specialistExecutionRequired(plan){
  const lioe=plan?.legalIntelligenceEngine;
  const profile=lioe?.mission_profile?.id||"GENERAL_BYPASS";
  return lioe?.engaged===true
    && ["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile);
}

function mergeWebSources(...groups){
  const seen=new Set();
  const out=[];
  for(const group of groups){
    for(const source of Array.isArray(group)?group:[]){
      const url=String(source?.url||"").trim();
      if(!/^https?:\/\//i.test(url)||seen.has(url))continue;
      seen.add(url);
      out.push({url,title:String(source?.title||url).trim().slice(0,240)});
      if(out.length>=20)return out;
    }
  }
  return out;
}

async function runOneBoundedSpecialist(env,{
  agentId,input,missionProfile,corpusContext=[],webSearchEnabled=false
}={}){
  const role=ROLE_BY_ID[agentId];
  if(!role) return {ok:false,error:"unknown_specialist",agentId,providerCalls:0};
  const useWeb=webSearchEnabled===true && agentId!==AGENT_ROLES.corpus.id;
  const body={
    model:env.OPENAI_MODEL.trim(),
    instructions:[
      specialistInstructions(agentId),
      "MISSION PROFILE: "+String(missionProfile||"UNKNOWN"),
      "Return concise findings for the Chief Legal Orchestrator, not a user-facing final answer.",
      "Separate supported propositions, uncertainty, contrary authority/risk and missing evidence.",
      "Do not claim Human Gate approval or external action."
    ].join("\n"),
    reasoning:{effort:"medium"},
    input:[{role:"user",content:[{type:"input_text",text:[
      "USER LEGAL TASK:",
      String(input||""),
      "",
      compactSourceContext(corpusContext,"GOVERNED_NATIVE_CONTEXT")
    ].join("\n")}]}],
    max_output_tokens:850,
    store:false,
    ...(useWeb ? {
      tools:[{type:"web_search"}],
      tool_choice:"required",
      include:["web_search_call.action.sources"]
    } : {})
  };

  let response;
  try{
    response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
  }catch(error){
    return {ok:false,error:"specialist_network_error",agentId,providerCalls:1,detail:String(error?.message||error).slice(0,160)};
  }
  let payload=null;
  try{payload=await response.json();}catch{}
  const usage=extractOpenAIUsage(payload);
  if(!response.ok) return {ok:false,error:"specialist_response_error",status:response.status,agentId,providerCalls:1,usage};
  if(payload?.status!=="completed") return {ok:false,error:"specialist_incomplete",agentId,providerCalls:1,usage};
  const text=extractOpenAIResponseText(payload);
  if(!text) return {ok:false,error:"specialist_empty_response",agentId,providerCalls:1,usage};
  const sources=extractOpenAIWebCitations(payload);
  return Object.freeze({
    ok:true,agentId,label:role.label,text,sources,
    webSearchUsed:Array.isArray(payload?.output)&&payload.output.some(item=>item?.type==="web_search_call"),
    providerCalls:1,usage
  });
}

export async function runBoundedSpecialists(env,{
  plan,input,corpusContext=[],webSearchEnabled=false
}={}){
  if(!specialistExecutionRequired(plan)){
    return Object.freeze({
      ok:true,required:false,executed:false,findings:Object.freeze([]),
      sources:Object.freeze([]),webSearchUsed:false,providerCalls:0,
      usage:Object.freeze({inputTokens:0,outputTokens:0,totalTokens:0})
    });
  }
  if(env?.LIOE_SPECIALIST_EXECUTION_ENABLED!=="true"){
    return {ok:false,required:true,error:"lioe_specialist_execution_locked",providerCalls:0};
  }
  const selected=(Array.isArray(plan?.agents)?plan.agents:[])
    .filter(id=>id!==AGENT_ROLES.general.id && id!==AGENT_ROLES.verify.id)
    .slice(0,4);
  if(!selected.length){
    return {ok:false,required:true,error:"no_specialist_selected",providerCalls:0};
  }

  const results=await Promise.all(selected.map(agentId=>runOneBoundedSpecialist(env,{
    agentId,input,
    missionProfile:plan?.legalIntelligenceEngine?.mission_profile?.id,
    corpusContext,
    webSearchEnabled
  })));

  const failed=results.find(x=>!x.ok);
  const aggregate=results.reduce((acc,x)=>{
    acc.inputTokens+=Number(x?.usage?.inputTokens||0);
    acc.outputTokens+=Number(x?.usage?.outputTokens||0);
    acc.totalTokens+=Number(x?.usage?.totalTokens||0);
    acc.providerCalls+=Number(x?.providerCalls||0);
    return acc;
  },{inputTokens:0,outputTokens:0,totalTokens:0,providerCalls:0});
  if(failed){
    return {
      ok:false,required:true,error:failed.error||"specialist_execution_failed",
      failedAgent:failed.agentId||null,providerCalls:aggregate.providerCalls,
      usage:{inputTokens:aggregate.inputTokens,outputTokens:aggregate.outputTokens,totalTokens:aggregate.totalTokens}
    };
  }

  return Object.freeze({
    ok:true,required:true,executed:true,
    findings:Object.freeze(results.map(x=>Object.freeze({agentId:x.agentId,label:x.label,text:x.text}))),
    sources:Object.freeze(mergeWebSources(...results.map(x=>x.sources))),
    webSearchUsed:results.some(x=>x.webSearchUsed===true),
    providerCalls:aggregate.providerCalls,
    usage:Object.freeze({inputTokens:aggregate.inputTokens,outputTokens:aggregate.outputTokens,totalTokens:aggregate.totalTokens})
  });
}

function compactSpecialistFindings(stage){
  const findings=Array.isArray(stage?.findings)?stage.findings:[];
  if(!findings.length)return"NONE";
  return findings.map((f,i)=>`[${i+1}] ${f.label} (${f.agentId})\n${String(f.text||"").slice(0,5000)}`).join("\n\n---\n\n");
}

export async function runOpenAIOrchestrator(env, {
  plan,
  input,
  corpusContext=[],
  externalContext=[],
  externalResearchEnabled=false,
  webSearchEnabled=false,
  attachments=[],
  history=[],
  maxOutputTokens=1600,
  reasoningEffort=null
}={}) {
  if(!openAIOrchestratorConfigured(env)){
    return {ok:false,error:"openai_orchestrator_not_configured"};
  }

  const preflight=validateExecutionPreconditions(plan,{corpusContext,externalContext,externalResearchEnabled});
  if(!preflight.ok){
    return {ok:false,error:"orchestrator_precondition_failed",problems:[...preflight.problems]};
  }

  const model=env.OPENAI_MODEL.trim();

  const specialistStage=await runBoundedSpecialists(env,{
    plan,
    input,
    corpusContext,
    webSearchEnabled:webSearchEnabled && externalResearchEnabled
  });
  if(!specialistStage.ok){
    return {
      ok:false,
      error:specialistStage.error||"specialist_execution_failed",
      failedAgent:specialistStage.failedAgent||null,
      providerCalls:specialistStage.providerCalls||0,
      usage:specialistStage.usage||{inputTokens:0,outputTokens:0,totalTokens:0}
    };
  }

  const envelope=buildExecutionEnvelope(plan,{
    question:input,
    corpusContext,
    externalContext
  });

  const sessionHistory=(Array.isArray(history)?history:[])
    .slice(-12)
    .map(item=>({
      role:item?.role==="assistant" ? "assistant" : "user",
      text:String(item?.text || "").normalize("NFKC").trim().slice(0,6000)
    }))
    .filter(item=>item.text)
    .slice(-12);

  const historyContext=sessionHistory.length
    ? sessionHistory.map((item,index)=>`[${index+1}] ${item.role.toUpperCase()}: ${item.text}`).join("\n\n")
    : "NONE";

  const userContent=[
    "<<<ORCHESTRATION_GRAPH>>>",
    JSON.stringify(envelope.graph),
    "<<<END_ORCHESTRATION_GRAPH>>>",
    "",
    "<<<AI_ADVOCAT_NATIVE_CORPUS>>>",
    compactSourceContext(corpusContext,"AI Advokat corpus"),
    "<<<END_AI_ADVOCAT_NATIVE_CORPUS>>>",
    "",
    "<<<EXTERNAL_LEGAL_RESEARCH>>>",
    externalResearchEnabled ? compactSourceContext(externalContext,"External legal research") : "NOT_AUTHORISED",
    "<<<END_EXTERNAL_LEGAL_RESEARCH>>>",
    "",
    "<<<BOUNDED_SPECIALIST_FINDINGS>>>",
    compactSpecialistFindings(specialistStage),
    "<<<END_BOUNDED_SPECIALIST_FINDINGS>>>",
    "",
    "<<<SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY>>>",
    historyContext,
    "<<<END_SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY>>>",
    "",
    "<<<USER_QUESTION>>>",
    String(input || ""),
    "<<<END_USER_QUESTION>>>"
  ].join("\n");

  const userParts=[{type:"input_text",text:userContent}];
  for(const attachment of (Array.isArray(attachments)?attachments:[]).slice(0,7)){
    if(!attachment || typeof attachment!=="object") continue;
    const filename=String(attachment.name || "attachment").slice(0,180);
    if(attachment.kind==="image" && typeof attachment.dataUrl==="string" && attachment.dataUrl.startsWith("data:image/")){
      userParts.push({type:"input_image",image_url:attachment.dataUrl,detail:"auto"});
    }else if(attachment.kind==="file" && typeof attachment.base64==="string" && attachment.base64.length){
      const mime=String(attachment.mime || "application/octet-stream").slice(0,120);
      userParts.push({type:"input_file",file_data:`data:${mime};base64,${attachment.base64}`,filename});
    }else if(attachment.kind==="text" && typeof attachment.text==="string"){
      userParts.push({type:"input_text",text:"ATTACHMENT: "+filename+"\n"+attachment.text.slice(0,120000)});
    }
  }

  const tools=[];
  const chiefNeedsWeb=webSearchEnabled
    && env?.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED==="true"
    && specialistStage.webSearchUsed!==true;
  if(chiefNeedsWeb){
    tools.push({type:"web_search"});
  }

  const body={
    model,
    instructions:orchestratorInstructions(plan),
    reasoning:{effort:["low","medium","high"].includes(String(reasoningEffort || "")) ? String(reasoningEffort) : (["low","medium","high"].includes(String(env?.OPENAI_REASONING_EFFORT || "")) ? String(env.OPENAI_REASONING_EFFORT) : "medium")},
    input:[{role:"user",content:userParts}],
    max_output_tokens:maxOutputTokens,
    store:false,
    ...(tools.length ? {
      tools,
      tool_choice:"required",
      include:["web_search_call.action.sources"]
    } : {})
  };

  let response;
  try{
    response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(body)
    });
  }catch(error){
    return {ok:false,error:"openai_network_error",detail:String(error?.message || error).slice(0,180)};
  }

  let payload=null;
  try{ payload=await response.json(); }catch{}

  if(!response.ok){
    return {ok:false,error:"openai_response_error",status:response.status};
  }

  // Legal answers must never be returned from a truncated/refused/incomplete
  // Responses API payload, even if HTTP status is 2xx.
  if(payload?.status!=="completed"){
    return {
      ok:false,
      error:"openai_incomplete_response",
      responseStatus:typeof payload?.status==="string" ? payload.status : "unknown"
    };
  }

  const text=extractOpenAIResponseText(payload);
  if(!text) return {ok:false,error:"openai_empty_response"};
  const chiefSources=extractOpenAIWebCitations(payload);
  const sources=mergeWebSources(specialistStage.sources,chiefSources);
  const chiefWebSearchUsed=Array.isArray(payload?.output) && payload.output.some(item=>item?.type==="web_search_call");
  const webSearchUsed=specialistStage.webSearchUsed===true||chiefWebSearchUsed;
  const chiefUsage=extractOpenAIUsage(payload);
  const combinedUsage=Object.freeze({
    inputTokens:Number(specialistStage.usage?.inputTokens||0)+chiefUsage.inputTokens,
    outputTokens:Number(specialistStage.usage?.outputTokens||0)+chiefUsage.outputTokens,
    totalTokens:Number(specialistStage.usage?.totalTokens||0)+chiefUsage.totalTokens
  });
  return {
    ok:true,
    text,
    model,
    responseId:payload?.id || null,
    sources,
    webSearchUsed,
    architecture:envelope.architecture,
    plan,
    conversationPersistence:"browser_session_only_store_false",
    historyItemsUsed:sessionHistory.length,
    toolMode:webSearchUsed ? "web_search_enabled" : "no_external_tools",
    humanGate:"output_not_authorized_for_autonomous_legal_reliance",
    specialistExecution:{
      required:specialistStage.required===true,
      executed:specialistStage.executed===true,
      agents:Array.isArray(specialistStage.findings)?specialistStage.findings.map(x=>x.agentId):[],
      providerCalls:Number(specialistStage.providerCalls||0)
    },
    providerCalls:Number(specialistStage.providerCalls||0)+1,
    usage:combinedUsage
  };
}

const LEGAL_POSTFLIGHT_SCHEMA=Object.freeze({
  type:"object",
  additionalProperties:false,
  properties:{
    verdict:{type:"string",enum:["PASS","REVISE","FAIL"]},
    stress_test:{type:"string",enum:["PASS","PROVISIONAL","FAIL","NOT_REQUIRED"]},
    adversarial_review:{type:"string",enum:["PASS","PROVISIONAL","FAIL","NOT_REQUIRED"]},
    source_integrity:{type:"string",enum:["VERIFIED","PARTIAL","FAILED","NOT_REQUIRED"]},
    temporal_integrity:{type:"string",enum:["VERIFIED","PARTIAL","FAILED","NOT_REQUIRED"]},
    jurisdiction_integrity:{type:"string",enum:["VERIFIED","PARTIAL","FAILED","NOT_REQUIRED"]},
    human_gate:{type:"string",enum:["NOT_REQUIRED","REQUIRED","MISSING_OR_UNAPPROVED"]},
    issues:{type:"array",items:{type:"string"}},
    corrected_answer:{type:"string"}
  },
  required:[
    "verdict","stress_test","adversarial_review","source_integrity",
    "temporal_integrity","jurisdiction_integrity","human_gate","issues","corrected_answer"
  ]
});

function postflightRequired(plan){
  const lioe=plan?.legalIntelligenceEngine;
  const profile=lioe?.mission_profile?.id||"GENERAL_BYPASS";
  return lioe?.engaged===true && (
    lioe?.knowledge?.current_law_verification_required===true
    || ["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(profile)
  );
}

function safePostflightContext(items,label){
  const rows=(Array.isArray(items)?items:[]).slice(0,12).map((item,index)=>{
    const source=String(item?.source||item?.title||"unknown").slice(0,220);
    const locator=String(item?.locator||item?.url||"").slice(0,320);
    const version=String(item?.version||"").slice(0,220);
    const text=String(item?.text||"").slice(0,2600);
    return `[${index+1}] SOURCE=${source}; LOCATOR=${locator}; VERSION=${version}${text?"\n"+text:""}`;
  });
  return rows.length ? `${label}:\n${rows.join("\n---\n")}` : `${label}: NONE`;
}

export async function runLegalPostflightVerifier(env,{
  plan,
  draft,
  corpusContext=[],
  webSources=[],
  maxAttempts=2
}={}){
  if(!postflightRequired(plan)){
    return Object.freeze({
      ok:true,required:false,verdict:"PASS",stress_test:"NOT_REQUIRED",
      adversarial_review:"NOT_REQUIRED",source_integrity:"NOT_REQUIRED",
      temporal_integrity:"NOT_REQUIRED",jurisdiction_integrity:"NOT_REQUIRED",
      human_gate:"NOT_REQUIRED",issues:Object.freeze([]),corrected_answer:String(draft||""),
      attempts:0,firstPass:true,providerCalls:0,
      usage:Object.freeze({inputTokens:0,outputTokens:0,totalTokens:0})
    });
  }
  if(!openAIOrchestratorConfigured(env)){
    return {ok:false,required:true,error:"legal_postflight_provider_not_configured",attempts:0,providerCalls:0};
  }

  const profile=plan?.legalIntelligenceEngine?.mission_profile?.id||"UNKNOWN";
  const currentLaw=plan?.legalIntelligenceEngine?.knowledge?.current_law_verification_required===true;
  const requiredGates=plan?.legalIntelligenceEngine?.authority_and_human_gate?.required_gate_types||[];
  let answer=String(draft||"").trim();
  const limit=Math.max(1,Math.min(2,Number(maxAttempts)||2));
  let aggregate={inputTokens:0,outputTokens:0,totalTokens:0};
  let attempts=0;

  for(let attempt=1;attempt<=limit;attempt++){
    attempts=attempt;
    const input=[
      "MISSION_PROFILE: "+profile,
      "CURRENT_LAW_VERIFICATION_REQUIRED: "+String(currentLaw),
      "NAMED_HUMAN_GATES: "+JSON.stringify(requiredGates),
      "",
      safePostflightContext(corpusContext,"GOVERNED_NATIVE_CORPUS"),
      "",
      safePostflightContext(webSources,"EXTERNAL_WEB_SOURCE_METADATA"),
      "",
      "DRAFT_TO_VERIFY:",
      answer
    ].join("\n");

    const body={
      model:env.OPENAI_MODEL.trim(),
      instructions:[
        "You are the AI Advokat Legal Postflight Verifier. You do not answer the user independently; you verify the draft.",
        "Return only the structured schema requested by the API.",
        "Never treat model memory, a URL title, or majority agreement as legal authority.",
        "For current-law claims, VERIFIED source_integrity and temporal_integrity require governed native official/article-level evidence that identifies the applicable version/date. External Web URL metadata alone can be at most PARTIAL.",
        "Check jurisdiction separation, authority hierarchy, version/date/applicability, deadlines where material, citation/source support, contrary authority risk and Human Gate boundaries.",
        "For L2-L4, stress_test and adversarial_review must be PASS before verdict PASS.",
        "For L3, the corrected answer must remain advisory/draft-only and must not claim that AI filed, sent, signed, represented or exercised legal authority.",
        "For L4, the corrected answer must not claim current-law/corpus/RAG/production/provider mutation without the named Human Gate.",
        "If the draft can be made safe and materially correct from the supplied evidence, verdict REVISE and provide corrected_answer. If it cannot, verdict FAIL.",
        "If verdict PASS, corrected_answer must preserve the draft's substance while removing any unsafe overclaim."
      ].join("\n"),
      input:[{role:"user",content:[{type:"input_text",text:input}]}],
      reasoning:{effort:"medium"},
      max_output_tokens:1800,
      store:false,
      text:{
        format:{
          type:"json_schema",
          name:"legal_postflight_verdict",
          strict:true,
          schema:LEGAL_POSTFLIGHT_SCHEMA
        }
      }
    };

    let response;
    try{
      response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify(body)
      });
    }catch(error){
      return {ok:false,required:true,error:"legal_postflight_network_error",attempts,providerCalls:attempts,detail:String(error?.message||error).slice(0,180),usage:aggregate};
    }

    let payload=null;
    try{payload=await response.json();}catch{}
    const usage=extractOpenAIUsage(payload);
    aggregate={
      inputTokens:aggregate.inputTokens+usage.inputTokens,
      outputTokens:aggregate.outputTokens+usage.outputTokens,
      totalTokens:aggregate.totalTokens+usage.totalTokens
    };

    if(!response.ok){
      return {ok:false,required:true,error:"legal_postflight_response_error",status:response.status,attempts,providerCalls:attempts,usage:aggregate};
    }
    if(payload?.status!=="completed"){
      return {ok:false,required:true,error:"legal_postflight_incomplete",attempts,providerCalls:attempts,usage:aggregate};
    }

    const text=extractOpenAIResponseText(payload);
    let verdict;
    try{verdict=JSON.parse(text||"");}
    catch{
      return {ok:false,required:true,error:"legal_postflight_invalid_json",attempts,providerCalls:attempts,usage:aggregate};
    }

    if(!["PASS","REVISE","FAIL"].includes(verdict?.verdict)){
      return {ok:false,required:true,error:"legal_postflight_invalid_verdict",attempts,providerCalls:attempts,usage:aggregate};
    }

    if(verdict.verdict==="PASS"){
      return Object.freeze({
        ok:true,
        required:true,
        ...verdict,
        corrected_answer:String(verdict.corrected_answer||answer).trim()||answer,
        issues:Object.freeze(Array.isArray(verdict.issues)?verdict.issues.map(x=>String(x).slice(0,240)).slice(0,12):[]),
        attempts,
        firstPass:attempt===1,
        providerCalls:attempts,
        usage:Object.freeze(aggregate)
      });
    }

    if(verdict.verdict==="FAIL"){
      return Object.freeze({
        ok:false,
        required:true,
        error:"legal_postflight_failed",
        verdict:"FAIL",
        issues:Object.freeze(Array.isArray(verdict.issues)?verdict.issues.map(x=>String(x).slice(0,240)).slice(0,12):[]),
        attempts,
        firstPass:false,
        providerCalls:attempts,
        usage:Object.freeze(aggregate)
      });
    }

    answer=String(verdict.corrected_answer||"").trim();
    if(!answer){
      return {ok:false,required:true,error:"legal_postflight_empty_revision",attempts,firstPass:false,providerCalls:attempts,usage:aggregate};
    }
  }

  return Object.freeze({
    ok:false,required:true,error:"legal_postflight_revision_limit_reached",
    attempts,firstPass:false,providerCalls:attempts,usage:Object.freeze(aggregate)
  });
}
