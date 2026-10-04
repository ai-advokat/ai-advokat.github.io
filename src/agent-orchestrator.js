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
  legal: /(?:право|правен|правна|закон|член|тужб|жалб|суд|адвокат|обвин|полици|кривич|управн|договор|нотар|рок|пресуд|решение|осигур|штета|работен однос|семејн|развод|притвор|казна|legal|law|court|lawsuit|appeal|statute|regulation|contract|police)/iu
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

  return Object.freeze({
    mode,
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
      humanGateRequiredForCorpusPromotion:true
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
    "Never merge jurisdictions or imply that comparative authority is controlling law.",
    "For AI Advokat native documents, corpus content and exact provenance come first. If the corpus does not support a proposition, say so.",
    "Do not silently fall back from the native corpus to general model knowledge.",
    "External research must be a separate step visibly labelled 'External legal research' and must never be presented as authored/native AI Advokat material.",
    "For Macedonian law, never promote a version to current/verified without controlling official-source/version evidence and the applicable Human Gate.",
    "Every material legal proposition must be traceable to a supplied source or tool result.",
    "The Verification & Citation Agent must check source, jurisdiction, date/version, applicability and citation coverage before you compose the final answer.",
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
    "<<<SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY>>>",
    historyContext,
    "<<<END_SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY>>>",
    "",
    "<<<USER_QUESTION>>>",
    String(input || ""),
    "<<<END_USER_QUESTION>>>"
  ].join("\n");

  const userParts=[{type:"input_text",text:userContent}];
  for(const attachment of (Array.isArray(attachments)?attachments:[]).slice(0,5)){
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
  if(webSearchEnabled && env?.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED==="true"){
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
  const sources=extractOpenAIWebCitations(payload);
  const webSearchUsed=Array.isArray(payload?.output) && payload.output.some(item=>item?.type==="web_search_call");
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
    toolMode:tools.length ? "web_search_enabled" : "no_external_tools",
    humanGate:"output_not_authorized_for_autonomous_legal_reliance"
  };
}
