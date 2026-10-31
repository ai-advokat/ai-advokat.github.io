// Context-aware legal follow-up routing.
// Uses recent bounded conversation turns for retrieval/planning. Assistant text
// may carry an explicitly fictional working scenario, but is labelled as AI-generated
// hypothetical context and is never promoted to verified fact or legal authority.

const FOLLOW_UP_RE=/(?:\bовој\b|\bова\b|\bоваа\b|\bтој\b|\bтаа\b|\bтоа\b|претходн|горенаведен|предмет|случај|спорн(?:ата|ото|иот)?\s+(?:изјава|тврдење|објава)|предикциј|прогноз|исход|шанси|веројатност|процент\s+на\s+успех|case\s+(?:prediction|outcome)|predict)/iu;

function clean(value,max=4000){
  return String(value||"").normalize("NFKC").replace(/\s+/gu," ").trim().slice(0,max);
}

export function isContextDependentLegalFollowUp(question=""){
  const q=clean(question);
  return Boolean(q && FOLLOW_UP_RE.test(q));
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

export const __test=Object.freeze({FOLLOW_UP_RE,clean});
