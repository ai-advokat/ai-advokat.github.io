// Context-aware legal follow-up routing.
// Uses recent bounded conversation turns for retrieval/planning. Assistant text
// may carry an explicitly fictional working scenario, but is labelled as AI-generated
// hypothetical context and is never promoted to verified fact or legal authority.

const FOLLOW_UP_RE=/(?:токму\s+на\s+тие|тие\s+(?:податоци|предмети|пресуди|одлуки|извори)|нивните\s+(?:аргументи|докази|извори)|претходн(?:иот|ата|ото|ите)?|горенаведен(?:иот|ата|ото|ите)?|(?:овој|тој|целиот|истиот)\s+(?:предмет|случај|спор|документ|извор|став|исход)|(?:оваа|таа)\s+(?:пресуда|одлука|тужба|жалба|изјава|пракса|анализа)|(?:овие|тие)\s+(?:аргументи|докази)|(?:каков|кој)\s+е\s+(?:исходот|резултатот)|(?:шанси(?:те)?|процент(?:от)?)\s+за\s+успех|case\s+(?:prediction|outcome)\s+(?:for|of)\s+(?:this|that)|predict\s+(?:this|that))/iu;
const EXPLICIT_PRIOR_TURN_RE=/(?:токму\s+на\s+тие|претходн(?:иот|ата|ото|ите)?|горенаведен(?:иот|ата|ото|ите)?|во\s+претходн(?:иот|ата|ото)\s+(?:одговор|порака|разговор)|како\s+што\s+(?:кажавме|кажав|спомнавме|спомнав)|продолжи\s+(?:со|ја|го)|врз\s+основа\s+на\s+претходн)/iu;
const STANDALONE_DETAIL_THRESHOLD=320;

function clean(value,max=4000){
  return String(value||"").normalize("NFKC").replace(/\s+/gu," ").trim().slice(0,max);
}

export function isContextDependentLegalFollowUp(question=""){
  const q=clean(question);
  if(!q) return false;
  if(EXPLICIT_PRIOR_TURN_RE.test(q)) return true;
  // Long fact-complete legal prompts may contain intra-message anaphora
  // ("оваа одлука", "овој спор"). Do not import prior turns unless the
  // user explicitly points back to earlier conversation context.
  if(q.length>=STANDALONE_DETAIL_THRESHOLD) return false;
  return FOLLOW_UP_RE.test(q);
}

export function buildLegalRoutingQuery(question="",history=[]){
  const current=clean(question);
  if(!current || !isContextDependentLegalFollowUp(current)) return current;

  const recent=(Array.isArray(history)?history:[])
    .map(item=>({
      role:item?.role==="assistant" ? "assistant" : item?.role==="user" ? "user" : null,
      text:clean(item?.text,item?.role==="assistant"?2200:1800)
    }))
    .filter(item=>item.role && item.text)
    .filter(item=>item.text!==current)
    .slice(-8);

  if(!recent.length) return current;

  const rows=recent.map((item,index)=>{
    const label=item.role==="user"
      ? "USER-PROVIDED CONTEXT — unverified claim"
      : "PRIOR AI WORKING CONTEXT — may contain a fictional/hypothetical scenario; not verified fact or legal authority";
    return `[${index+1}] ${label}: ${item.text}`;
  });

  return [
    "RECENT LEGAL CONVERSATION CONTEXT (routing/retrieval only):",
    ...rows,
    "CURRENT FOLLOW-UP:",
    current
  ].join("\n").slice(0,12000);
}

export const __test=Object.freeze({FOLLOW_UP_RE,EXPLICIT_PRIOR_TURN_RE,STANDALONE_DETAIL_THRESHOLD,clean});
