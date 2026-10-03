// AI Advokat — governed GPT orchestration foundation.
// Phase 1 is intentionally fail-closed: no external provider call is made unless
// OPENAI_ORCHESTRATOR_ENABLED=true and both OPENAI_API_KEY and OPENAI_MODEL exist.

export const AGENT_ROLES = Object.freeze({
  chief: Object.freeze({
    id: "chief_legal_orchestrator",
    label: "AI Advokat — Chief Legal Orchestrator",
    purpose: "Routes work, preserves jurisdiction boundaries, verifies provenance, and composes the final research answer."
  }),
  mk: Object.freeze({
    id: "macedonian_law",
    label: "Macedonian Law Agent",
    jurisdiction: "MK",
    purpose: "North Macedonian legislation, official sources, version/application dates and Human Gate status."
  }),
  eu: Object.freeze({
    id: "eu_law",
    label: "EU Law Agent",
    jurisdiction: "EU",
    purpose: "EU primary/secondary law and CJEU authority, with source and temporal labelling."
  }),
  echr: Object.freeze({
    id: "echr_law",
    label: "ECHR Agent",
    jurisdiction: "ECHR",
    purpose: "European Convention and ECtHR/HUDOC authority, kept distinct from EU law."
  }),
  common: Object.freeze({
    id: "common_law",
    label: "Common Law Agent",
    jurisdiction: "COMMON_LAW",
    purpose: "Common-law research with explicit country/court hierarchy; never imported as Macedonian controlling law."
  }),
  international: Object.freeze({
    id: "international_law",
    label: "International Law Agent",
    jurisdiction: "INTL",
    purpose: "Treaties, international organisations and international judicial sources with authority labels."
  }),
  corpus: Object.freeze({
    id: "ai_advokat_knowledge",
    label: "AI Advokat Knowledge Agent",
    jurisdiction: "AI_ADVOCAT_CORPUS",
    purpose: "Answers from Zoran Stojankich / AI Advokat native materials first, preserving exact provenance and corpus boundaries."
  }),
  verify: Object.freeze({
    id: "verification_citation",
    label: "Verification & Citation Agent",
    purpose: "Checks source, jurisdiction, date/version, citation coverage and Human Gate state before release."
  })
});

export const ORCHESTRATOR_MODES = Object.freeze({
  PASSIVE_CORPUS: "passive_corpus",
  PROACTIVE_RESEARCH: "proactive_research",
  COMPARATIVE: "comparative"
});

const ROUTE_PATTERNS = Object.freeze({
  eu: /\b(eu|european union|eur-lex|cjeu|tfeu|teu|directive|regulation)\b/i,
  echr: /\b(echr|ecthr|hudoc|european convention|strasbourg)\b/i,
  common: /\b(common law|england|wales|uk law|united kingdom|us law|u\.s\.|united states|precedent|stare decisis)\b/i,
  international: /\b(international law|treaty|convention|united nations|un\b|icc\b|icj\b|vienna convention)\b/i
});

export function buildAgentPlan(question, {preferCorpus=false, explicitMode=null}={}) {
  const q=String(question || "");
  const selected=new Set();

  if(preferCorpus || explicitMode===ORCHESTRATOR_MODES.PASSIVE_CORPUS) selected.add("corpus");
  selected.add("mk");

  for(const [key,pattern] of Object.entries(ROUTE_PATTERNS)){
    if(pattern.test(q)) selected.add(key);
  }

  const crossBorder=selected.size>1 && !(selected.size===2 && selected.has("corpus") && selected.has("mk"));
  const mode=explicitMode
    || (preferCorpus ? ORCHESTRATOR_MODES.PASSIVE_CORPUS
      : crossBorder ? ORCHESTRATOR_MODES.COMPARATIVE
      : ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);

  return Object.freeze({
    mode,
    orchestrator:AGENT_ROLES.chief.id,
    agents:[...selected].map(key=>AGENT_ROLES[key].id),
    verifier:AGENT_ROLES.verify.id,
    rules:Object.freeze({
      corpusFirst:mode===ORCHESTRATOR_MODES.PASSIVE_CORPUS,
      preserveJurisdictionBoundaries:true,
      sourceFirst:true,
      humanGateRequiredForCurrentLawPromotion:true,
      externalResearchMustBeLabelled:true
    })
  });
}

export function orchestratorInstructions(plan) {
  const agentList=plan.agents.join(", ");
  return [
    "You are AI Advokat, the Chief Legal Orchestrator.",
    "Your task is legal research assistance, not autonomous legal representation.",
    `MODE: ${plan.mode}. SPECIALISTS: ${agentList}. VERIFIER: ${plan.verifier}.`,
    "Never merge jurisdictions or imply that comparative authority is controlling law.",
    "For AI Advokat native documents, corpus content and exact provenance come first. If the corpus does not support a proposition, say so.",
    "External research must be visibly labelled as external and must not be presented as authored/native AI Advokat material.",
    "For Macedonian law, never promote a version to current/verified without the Human Gate and controlling official source/version evidence.",
    "Every material legal proposition must be traceable to a supplied source or tool result."
  ].join("\n");
}

export function openAIOrchestratorConfigured(env) {
  return env?.OPENAI_ORCHESTRATOR_ENABLED==="true"
    && typeof env?.OPENAI_API_KEY==="string" && env.OPENAI_API_KEY.length>20
    && typeof env?.OPENAI_MODEL==="string" && env.OPENAI_MODEL.trim().length>0;
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

export async function runOpenAIOrchestrator(env, {plan,input,maxOutputTokens=1600}={}) {
  if(!openAIOrchestratorConfigured(env)){
    return {ok:false,error:"openai_orchestrator_not_configured"};
  }
  const model=env.OPENAI_MODEL.trim();
  const body={
    model,
    instructions:orchestratorInstructions(plan),
    input:[{role:"user",content:String(input || "")}],
    max_output_tokens:maxOutputTokens,
    store:false
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

  const text=extractOpenAIResponseText(payload);
  if(!text) return {ok:false,error:"openai_empty_response"};
  return {ok:true,text,model,responseId:payload?.id || null};
}
