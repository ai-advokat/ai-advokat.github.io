// AI Advokat official-source binder.
// This module validates source identity against governed registries and a local
// SHA-256 fingerprint. It never claims remote-content equality and never
// promotes a record to reviewed/authoritative status without Human Gate.

export const OFFICIAL_SOURCE_BINDER_VERSION = "1.0.0";
export const OFFICIAL_SOURCE_BINDING_SCHEMA = "AI_ADVOCAT_SOURCE_BINDING_V1";

const OFFICIAL_AUTHORITY_STATUSES=new Set([
  "primary_official",
  "court_official",
  "official_supporting",
  "official_legislative_history",
  "international_court_official",
  "eu_official",
  "official_foreign_comparative"
]);

const OFFICIAL_CASE_AUTHORITY_CLASSES=new Set([
  "constitutional_review",
  "highest_domestic_case_law",
  "domestic_case_law",
  "convention_case_law",
  "eu_case_law_reference",
  "international_court_case_law",
  "comparative_human_rights_case_law",
  "international_criminal_case_law",
  "official_domestic_echr_reference"
]);

function parseHttpsUrl(value){
  let url;
  try{url=new URL(String(value||""));}catch{throw new TypeError("source_binding_url_invalid");}
  if(url.protocol!=="https:") throw new TypeError("source_binding_https_required");
  return url;
}

function normalizeSha(value){
  const hash=String(value||"").trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(hash)) throw new TypeError("source_binding_sha256_invalid");
  return hash;
}

function sourceUrlFor(source){
  return source?.canonical_url || source?.url || null;
}

function hostRule(source){
  const raw=sourceUrlFor(source);
  if(!raw) return null;
  let url;
  try{url=new URL(raw);}catch{return null;}
  return {
    source,
    host:url.hostname.toLowerCase(),
    pathPrefix:url.pathname && url.pathname!=="/" ? url.pathname : null
  };
}

function specificity(rule){
  return (rule.host?.length||0)+(rule.pathPrefix?.length||0);
}

function matchesRule(url,rule){
  const host=url.hostname.toLowerCase();
  if(!(host===rule.host || host.endsWith("."+rule.host))) return false;
  if(rule.pathPrefix && !url.pathname.startsWith(rule.pathPrefix)) return false;
  return true;
}

export function combineGovernedSourceRegistries(...registries){
  const out=[];
  const seen=new Set();
  for(const registry of registries){
    const sources=Array.isArray(registry)?registry:Array.isArray(registry?.sources)?registry.sources:[];
    for(const source of sources){
      const key=String(source?.id||"")+"|"+String(sourceUrlFor(source)||"");
      if(!sourceUrlFor(source)||seen.has(key)) continue;
      seen.add(key);
      out.push(source);
    }
  }
  return Object.freeze(out);
}

function sourcePolicy(source){
  const authorityStatus=source?.authority_status||null;
  const authorityClass=source?.authority_class||null;
  const access=source?.access||source?.public_access_status||null;
  const officialByStatus=OFFICIAL_AUTHORITY_STATUSES.has(authorityStatus);
  const officialByCaseClass=OFFICIAL_CASE_AUTHORITY_CLASSES.has(authorityClass);
  const officialByAccess=access==="official_public" || access==="official_public_legacy";
  const secondary=/secondary/i.test(String(authorityStatus||"")) ||
    /secondary/i.test(String(authorityClass||"")) ||
    access==="commercial_secondary";
  return {
    authorityStatus,
    authorityClass,
    access,
    official:!secondary && (officialByStatus||officialByCaseClass||officialByAccess),
    secondary
  };
}

function routeCompatibility(route,source,policy){
  if(route==="legal_instrument"){
    const compatible=new Set([
      "primary_official",
      "official_supporting",
      "official_legislative_history",
      "eu_official",
      "official_foreign_comparative"
    ]);
    return compatible.has(policy.authorityStatus);
  }
  if(route==="case_law"){
    return policy.authorityStatus==="court_official" ||
      policy.authorityStatus==="international_court_official" ||
      policy.authorityStatus==="eu_official" ||
      OFFICIAL_CASE_AUTHORITY_CLASSES.has(policy.authorityClass);
  }
  return false;
}

export function bindOfficialSource({
  sourceUrl,
  sourceSha256,
  route,
  registrySources=[]
}={}){
  const url=parseHttpsUrl(sourceUrl);
  const hash=normalizeSha(sourceSha256);
  if(!["legal_instrument","case_law"].includes(route)){
    throw new TypeError("source_binding_route_invalid");
  }

  const rules=(Array.isArray(registrySources)?registrySources:[])
    .map(hostRule)
    .filter(Boolean)
    .sort((a,b)=>specificity(b)-specificity(a));

  const matchedRule=rules.find(rule=>matchesRule(url,rule))||null;
  if(!matchedRule){
    return Object.freeze({
      schemaVersion:OFFICIAL_SOURCE_BINDING_SCHEMA,
      binderVersion:OFFICIAL_SOURCE_BINDER_VERSION,
      route,
      sourceUrl:url.href,
      sourceSha256:hash,
      sourceId:null,
      registryMatched:false,
      officialOriginCandidate:false,
      routeCompatible:false,
      metadataStagingEligible:false,
      bulkIngestEligible:false,
      rightsReviewRequired:true,
      remoteContentHashVerified:false,
      officialBindingVerified:false,
      humanGateRequired:true,
      status:"unrecognized_source_origin",
      reasons:Object.freeze(["source_not_found_in_governed_registry"])
    });
  }

  const source=matchedRule.source;
  const policy=sourcePolicy(source);
  const compatible=routeCompatibility(route,source,policy);
  const reuseStatus=source?.reuse_status||null;
  const ingestStatus=source?.ingest_status||source?.ingest||null;
  const automatedBulkIngest=source?.automated_bulk_ingest===true;
  const rightsReviewRequired=!automatedBulkIngest ||
    ["terms_review_required","mixed_rights","record_level_license_required","restricted"].includes(reuseStatus);
  const primaryBindingRequired=Boolean(source?.official_binding_required_before_gpt_case_law_context) ||
    Boolean(source?.hudoc_binding_required) ||
    /secondary/i.test(String(policy.authorityClass||""));

  const metadataStagingEligible=policy.official && compatible && !primaryBindingRequired;
  const reasons=[];
  if(!policy.official) reasons.push(policy.secondary?"secondary_source_not_official_origin":"source_not_official_for_binding");
  if(!compatible) reasons.push("source_not_compatible_with_document_route");
  if(primaryBindingRequired) reasons.push("primary_origin_binding_still_required");
  if(rightsReviewRequired) reasons.push("reuse_or_bulk_rights_require_separate_review");

  return Object.freeze({
    schemaVersion:OFFICIAL_SOURCE_BINDING_SCHEMA,
    binderVersion:OFFICIAL_SOURCE_BINDER_VERSION,
    route,
    sourceUrl:url.href,
    sourceSha256:hash,
    sourceId:source?.id||null,
    sourceName:source?.name||source?.official_name||null,
    jurisdiction:source?.jurisdiction||null,
    authorityStatus:policy.authorityStatus,
    authorityClass:policy.authorityClass,
    accessStatus:policy.access,
    reuseStatus,
    ingestStatus,
    registryMatched:true,
    officialOriginCandidate:policy.official,
    routeCompatible:compatible,
    metadataStagingEligible,
    bulkIngestEligible:metadataStagingEligible && automatedBulkIngest,
    rightsReviewRequired,
    primaryBindingRequired,
    remoteContentHashVerified:false,
    officialBindingVerified:false,
    humanGateRequired:true,
    status:metadataStagingEligible?"official_origin_registry_match_pending_human_gate":"binding_incomplete",
    reasons:Object.freeze(reasons),
    rule:"Registry and host/path matching plus local SHA-256 prove provenance inputs only; they do not prove that remote bytes equal the local file and do not confer reviewed legal authority."
  });
}
