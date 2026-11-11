import { assessCanonicalCaseLawState } from "./case-law-evidence-gates.js";

export const CASE_LAW_CLAIM_GUARD_VERSION="AI_ADVOCAT_CASE_LAW_CLAIM_GUARD_V1_2_FAIL_SOFT";

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
  const prefixed=/(?<![\p{L}\p{N}])([A-ZА-ЯЃЅЈЉЊЌЏ]{2,12}[-.]?\d{1,6}\/\d{2,4})(?![\p{L}\p{N}/])/gu;
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
  const named=/(?<!\p{L})([A-ZÀ-ÖØ-ÞА-ЯЃЅЈЉЊЌЏ][\p{L}.’'\-]{1,80})\s+v\.?\s+([A-ZÀ-ÖØ-ÞА-ЯЃЅЈЉЊЌЏ][\p{L}.’'\-]{1,80})(?!\p{L})/gu;
  for(const match of value.matchAll(named)){
    claims.push({type:"named_case",value:match[1]+" v "+match[2],evidence:match[0]});
  }

  return Object.freeze(uniqueClaims(claims));
}

function reviewedSourceText(source){
  if(!source) return "";
  const hasEvidenceGateFields=[
    "remoteContentHashVerified","remote_content_hash_verified","publicationApproved","publication_approved",
    "humanGateApproved","human_gate_approved","holdingVerified","holding_verified"
  ].some(k=>Object.prototype.hasOwnProperty.call(source,k)) || source.evidenceGate || source.evidence_gate;
  if(hasEvidenceGateFields){
    const gate=source.evidenceGate||source.evidence_gate||assessCanonicalCaseLawState({
      ...source,
      source_url:source.url||source.sourceUrl||source.source_url,
      source_sha256:source.sourceSha256||source.source_sha256,
      source_status:source.sourceStatus||source.source_status,
      official_binding_verified:source.officialBindingVerified??source.official_binding_verified,
      remote_content_hash_verified:source.remoteContentHashVerified??source.remote_content_hash_verified,
      human_review_status:source.humanReviewStatus||source.human_review_status,
      authority_review_status:source.authorityReviewStatus||source.authority_review_status,
      publication_approved:source.publicationApproved??source.publication_approved,
      human_gate_approved:source.humanGateApproved??source.human_gate_approved,
      holding_verified:source.holdingVerified??source.holding_verified
    });
    if(gate.productionCitable!==true) return "";
  }else{
    if(source.officialBindingVerified!==true) return "";
    if(!REVIEWED_STATUSES.has(String(source.humanReviewStatus||"").toLowerCase())) return "";
    if(!REVIEWED_STATUSES.has(String(source.authorityReviewStatus||"").toLowerCase())) return "";
  }
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


const CASE_LAW_REDACTION_NOTICE="Судска практика · ПРОВЕРКА: конкретната пресуда, бројот на предметот или именуваниот судски случај е изоставен затоа што точниот идентитет и правниот став не се потврдени во проверен официјален извор на судска практика. Остатокот од анализата останува работен материјал под Human Gate.";

export function redactUnsupportedSpecificCaseLawClaims(text,gate){
  const source=String(text||"").replace(/\r\n?/g,"\n");
  const unsupported=Array.isArray(gate?.unsupported)?gate.unsupported:[];
  if(!source || !unsupported.length){
    return Object.freeze({text:source,changed:false,redacted:Object.freeze([])});
  }

  const needles=unsupported.flatMap(item=>[
    String(item?.evidence||"").trim(),
    String(item?.value||"").trim()
  ]).filter(Boolean);

  if(!needles.length){
    return Object.freeze({text:source,changed:false,redacted:Object.freeze([])});
  }

  const lowerNeedles=needles.map(value=>value.toLocaleLowerCase("mk"));
  const redacted=[];
  let previousWasNotice=false;
  const output=[];

  for(const line of source.split("\n")){
    const lower=line.toLocaleLowerCase("mk");
    const hit=lowerNeedles.some(needle=>needle && lower.includes(needle));
    if(!hit){
      output.push(line);
      previousWasNotice=false;
      continue;
    }

    for(const item of unsupported){
      const evidence=String(item?.evidence||"").toLocaleLowerCase("mk");
      const value=String(item?.value||"").toLocaleLowerCase("mk");
      if((evidence && lower.includes(evidence)) || (value && lower.includes(value))){
        redacted.push(Object.freeze({
          type:String(item?.type||"unknown").slice(0,80),
          value:String(item?.value||"").slice(0,180)
        }));
      }
    }

    if(previousWasNotice) continue;
    const prefix=line.match(/^\s*(?:[-*•]\s*)?/)?.[0]||"";
    output.push(prefix+CASE_LAW_REDACTION_NOTICE);
    previousWasNotice=true;
  }

  return Object.freeze({
    text:output.join("\n").trim(),
    changed:redacted.length>0,
    redacted:Object.freeze(redacted.slice(0,12))
  });
}
