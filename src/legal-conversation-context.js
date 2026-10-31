// Context-aware legal follow-up routing.
// Uses recent USER turns only for retrieval/planning. Assistant text is never
// promoted into factual routing context or legal authority.

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

  const recentUsers=(Array.isArray(history)?history:[])
    .filter(item=>item?.role==="user")
    .map(item=>clean(item?.text,1800))
    .filter(Boolean)
    .filter(text=>text!==current)
    .slice(-4);

  if(!recentUsers.length) return current;

  return [
    "RECENT USER LEGAL CONTEXT (routing/retrieval only; user-provided claims, not verified law):",
    ...recentUsers.map((text,index)=>`[${index+1}] ${text}`),
    "CURRENT FOLLOW-UP:",
    current
  ].join("\n").slice(0,8000);
}

export const __test=Object.freeze({FOLLOW_UP_RE,clean});
