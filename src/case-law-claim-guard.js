export const CASE_LAW_CLAIM_GUARD_VERSION="AI_ADVOCAT_CASE_LAW_CLAIM_GUARD_V1";

const REVIEWED_STATUSES=new Set(["approved","reviewed"]);
const OFFICIAL_COURT_AUTHORITY=new Set([
  "court_official",
  "international_court_official",
  "eu_official",
  "official_foreign_comparative"
]);

function norm(value){
  return String(value||"")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[‐‑‒–—]/g,"-")
    .replace(/\bv\./g,"v")
    .replace(/[^\p{L}\p{N}/.-]+/gu," ")
    .replace(/\s+/g," ")
    .trim();
}

function uniqueClaims(items){
  const seen=new Set();
  const out=[];
  for(const item of items){
    const key=item.type+":"+norm(item.value);
    if(!item.value || seen.has(key)) continue;
    seen.add(key);
    out.push(Object.freeze(item));
  }
  return out;
}

export function extractSpecificJudicialClaims(text){
  const value=String(text||"").normalize("NFKC");
  const claims=[];

  // Prefixed domestic/regional court file numbers, e.g. KOKЖ-50/25.
  const prefixed=/\b([A-ZА-ЯЃЅЈЉЊЌЏ]{2,12}[-.]?\d{1,6}\/\d{2,4})\b/gu;
  for(const match of value.matchAll(prefixed)){
    claims.push({type:"case_number",value:match[1],evidence:match[0]});
  }

  // Bare number/year identifiers are case claims only when introduced as a case/judgment number.
  const bare=/(?:бр\.?|број|предмет|case\s+no\.?|application\s+no\.?)\s*[:.]?\s*(\d{1,6}\/\d{2,4})(?!\/\d)/giu;
  for(const match of value.matchAll(bare)){
    claims.push({type:"case_number",value:match[1],evidence:match[0]});
  }

  // Named adversarial cases, e.g. Kovács v. Hungary. This is intentionally
  // conservative: a specific named case must be source-backed before release.
  const named=/\b([A-ZÀ-ÖØ-ÞА-ЯЃЅЈЉЊЌЏ][\p{L}.’'\-]{1,80})\s+v\.?\s+([A-ZÀ-ÖØ-ÞА-ЯЃЅЈЉЊЌЏ][\p{L}.’'\-]{1,80})\b/gu;
  for(const match of value.matchAll(named)){
    claims.push({type:"named_case",value:match[1]+" v "+match[2],evidence:match[0]});
  }

  return Object.freeze(uniqueClaims(claims));
}

function reviewedSourceText(source){
  if(!source || source.officialBindingVerified!==true) return "";
  if(!REVIEWED_STATUSES.has(String(source.humanReviewStatus||"").toLowerCase())) return "";
  if(!REVIEWED_STATUSES.has(String(source.authorityReviewStatus||"").toLowerCase())) return "";
  return [
    source.title,
    source.caseTitle,
    source.caseNumber,
    source.court,
    source.url
  ].filter(Boolean).join(" ");
}

function officialWebSourceText(source){
  if(!source || source.researchRole!=="REGISTERED_OFFICIAL_RESEARCH") return "";
  if(!OFFICIAL_COURT_AUTHORITY.has(String(source.authorityStatus||""))) return "";
  return [source.title,source.url].filter(Boolean).join(" ");
}

export function assessSpecificCaseLawClaims(text,{
  reviewedCaseLawSources=[],
  webSources=[]
}={}){
  const claims=extractSpecificJudicialClaims(text);
  if(!claims.length){
    return Object.freeze({
      ok:true,
      version:CASE_LAW_CLAIM_GUARD_VERSION,
      claims:Object.freeze([]),
      unsupported:Object.freeze([]),
      reviewedAuthorityCount:0,
      officialWebAuthorityCount:0
    });
  }

  const reviewedTexts=(Array.isArray(reviewedCaseLawSources)?reviewedCaseLawSources:[])
    .map(reviewedSourceText)
    .filter(Boolean);
  const officialWebTexts=(Array.isArray(webSources)?webSources:[])
    .map(officialWebSourceText)
    .filter(Boolean);
  const support=norm([...reviewedTexts,...officialWebTexts].join(" || "));

  const unsupported=claims.filter(claim=>!support.includes(norm(claim.value)));

  return Object.freeze({
    ok:unsupported.length===0,
    version:CASE_LAW_CLAIM_GUARD_VERSION,
    claims,
    unsupported:Object.freeze(unsupported.slice(0,12)),
    reviewedAuthorityCount:reviewedTexts.length,
    officialWebAuthorityCount:officialWebTexts.length
  });
}
