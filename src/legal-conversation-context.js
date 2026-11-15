// Context-aware legal follow-up routing.
// Uses recent bounded conversation turns for retrieval/planning. Assistant text
// may carry an explicitly fictional working scenario, but is labelled as AI-generated
// hypothetical context and is never promoted to verified fact or legal authority.

const FOLLOW_UP_RE=/(?:токму\s+на\s+тие|тие\s+(?:податоци|предмети|пресуди|одлуки|извори)|нивните\s+(?:аргументи|докази|извори)|претходн(?:иот|ата|ото|ите)?|горенаведен(?:иот|ата|ото|ите)?|(?:овој|тој|целиот|истиот)\s+(?:предмет|случај|спор|документ|извор|став|исход)|(?:оваа|таа)\s+(?:пресуда|одлука|тужба|жалба|изјава|пракса|анализа)|(?:овие|тие)\s+(?:аргументи|докази)|(?:каков|кој)\s+е\s+(?:исходот|резултатот)|(?:шанси(?:те)?|процент(?:от)?)\s+за\s+успех|case\s+(?:prediction|outcome)\s+(?:for|of)\s+(?:this|that)|predict\s+(?:this|that))/iu;
const EXPLICIT_PRIOR_TURN_RE=/(?:во\s+претходн(?:иот|ата|ото|ите)?\s+(?:одговор|порака|разговор|анализа|објаснување)|претходн(?:иот|ата|ото|ите)?\s+(?:одговор|порака|разговор|анализа|објаснување)|како\s+што\s+(?:кажавме|кажав|спомнавме|спомнав)\s+(?:претходно|погоре)|продолжи\s+(?:со|ја|го)\s+(?:претходн(?:ата|иот|ото)?\s+)?(?:анализа|одговор|разговор)|врз\s+основа\s+на\s+претходн(?:иот|ата|ото)?\s+(?:одговор|разговор|анализа))/iu;
// Short ellipses usually depend on the preceding exchange even when they do
// not repeat the subject keyword. The provider must still reason over actual
// supplied history: these patterns only select contextual retrieval/planning.
const SHORT_DIALOGUE_FOLLOW_UP_RE=/^(?:(?:а|па|но|и|and|but)\s+)?(?:зошто(?:\s+тоа)?|како\s+(?:тоа|тогаш|понатаму)|што\s+(?:со\s+(?:ова|тоа|рокот|жалбата|доказите|изворите|пресудата)|ако|понатаму|следно)|а?ко\s+тоа|и\s+што\s+сега|тогаш\s+што|објасни\s+(?:го\s+тоа|подетално)|појасни\s+(?:го\s+тоа|подетално)|продолжи(?:\s+понатаму)?|не[,.]?\s*мислев\s+на|мислам\s+на|why\s+(?:is\s+that|so)|why[?!.]*$|how\s+so|what\s+(?:about|if|next)|and\s+(?:if|what)|could\s+you\s+elaborate|please\s+elaborate|i\s+meant|no[,.]?\s*i\s+meant)/iu;
// Macedonian Latin transcription is common on phones and must not silently
// discard the user's conversation topic.
const SHORT_MK_LATIN_FOLLOW_UP_RE=/^(?:(?:a|pa|no|i)\s+)?(?:zosto|shto\s+(?:so|ako|sledno)|sto\s+(?:so|ako|sledno)|kako\s+(?:toa|togas|togash)|a\s+ako|ako\s+toa|ne[,.]?\s*mislev\s+na|mislam\s+na|prodolzi|pojasni)/iu;

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
  return FOLLOW_UP_RE.test(q) || (q.length<=160 && (SHORT_DIALOGUE_FOLLOW_UP_RE.test(q) || SHORT_MK_LATIN_FOLLOW_UP_RE.test(q)));
}

// Routing may use previous AI text with an explicit unverified label. Legal
// agent selection is stricter: take only user-authored prior context so a
// hallucinated assistant scenario never silently activates a legal specialist.
export function buildLegalPlanningQuestion(question="",history=[]){
  const current=clean(question);
  if(!current || !isContextDependentLegalFollowUp(current)) return current;
  const userTurns=(Array.isArray(history)?history:[])
    .filter(row=>row?.role==="user")
    .map(row=>clean(row.text,1400))
    .filter(row=>row && row!==current)
    .slice(-8);
  if(!userTurns.length) return current;
  const anchor=[...userTurns].reverse().find(row=>!isContextDependentLegalFollowUp(row))
    || userTurns[userTurns.length-1];
  return [
    "PRIOR USER TOPIC (unverified, for agent routing only):",
    anchor,
    "CURRENT FOLLOW-UP:",
    current
  ].join("\n").slice(0,2400);
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

export const __test=Object.freeze({FOLLOW_UP_RE,EXPLICIT_PRIOR_TURN_RE,STANDALONE_DETAIL_THRESHOLD,SHORT_DIALOGUE_FOLLOW_UP_RE,clean});
