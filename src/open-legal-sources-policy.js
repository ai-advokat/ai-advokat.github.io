// AI Advokat — runtime Open Legal Sources policy.
// Generated from the governed registry fields that are safe and necessary at runtime.
// The JSON registry remains the human-readable source of truth; regression tests enforce alignment.
//
// Core doctrine: PUBLIC != REUSABLE.
// Runtime web research may cite public material, but it never turns public access into
// permission for bulk copying, corpus promotion, republication or current-law status.

export const OPEN_LEGAL_SOURCE_POLICY_VERSION="1.0.0";
export const OPEN_LEGAL_SOURCE_REGISTRY_ID="AI_ADVOKAT_OPEN_LEGAL_SOURCES_REGISTRY_2026";
export const OPEN_LEGAL_SOURCE_REGISTRY_PATH="/data/open-legal-sources-registry-2026.json";

const SOURCE_ROWS=[
  {
    "id": "mk-official-gazette",
    "name": "Службен весник на Република Северна Македонија",
    "canonicalUrl": "https://slvesnik.com.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "primary_official",
    "publicAccessStatus": "public_partial",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "public_retrieval_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": "publication_provenance_primary"
  },
  {
    "id": "mk-ldbis",
    "name": "LDBIS / ЛДБИС — База на закони, други прописи и акти",
    "canonicalUrl": "https://ldbis.pravda.gov.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "primary_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": "version_status_and_public_legal_text"
  },
  {
    "id": "mk-ener",
    "name": "ЕНЕР — Единствен национален електронски регистар на прописи",
    "canonicalUrl": "https://ener.gov.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "official_supporting",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "public_retrieval_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": "supporting_only"
  },
  {
    "id": "mk-sobranie",
    "name": "Собрание на Република Северна Македонија",
    "canonicalUrl": "https://www.sobranie.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "official_legislative_history",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": "legislative_history_not_current_law_by_itself"
  },
  {
    "id": "mk-constitutional-court",
    "name": "Уставен суд на Република Северна Македонија",
    "canonicalUrl": "https://ustavensud.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "court_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "mk-supreme-court",
    "name": "Врховен суд на Република Северна Македонија",
    "canonicalUrl": "https://www.vrhoven.sud.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "court_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "mk-judicial-portal",
    "name": "Судски портал на Република Северна Македонија",
    "canonicalUrl": "https://www.sud.mk/",
    "jurisdiction": "MK",
    "authorityStatus": "court_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "mk-ministry-justice",
    "name": "Министерство за правда — регулатива и правосудни ресурси",
    "canonicalUrl": "https://www.pravda.gov.mk/mk-MK/regulativa",
    "jurisdiction": "MK",
    "authorityStatus": "official_supporting",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "echr-hudoc",
    "name": "European Court of Human Rights — HUDOC",
    "canonicalUrl": "https://hudoc.echr.coe.int/",
    "jurisdiction": "ECHR",
    "authorityStatus": "international_court_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "mixed_rights",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "eu-eurlex",
    "name": "EUR-Lex",
    "canonicalUrl": "https://eur-lex.europa.eu/",
    "jurisdiction": "EU",
    "authorityStatus": "eu_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "verified_reuse_allowed",
    "ingestStatus": "fulltext_and_metadata_allowed_with_conditions",
    "automatedBulkIngest": true,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "eu-curia",
    "name": "Court of Justice of the European Union — CURIA / InfoCuria",
    "canonicalUrl": "https://curia.europa.eu/",
    "jurisdiction": "EU",
    "authorityStatus": "eu_official",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "crossref",
    "name": "Crossref metadata",
    "canonicalUrl": "https://www.crossref.org/",
    "jurisdiction": "GLOBAL",
    "authorityStatus": "open_scholarly_metadata",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "metadata_reuse_verified",
    "ingestStatus": "metadata_only",
    "automatedBulkIngest": true,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "zenodo",
    "name": "Zenodo",
    "canonicalUrl": "https://zenodo.org/",
    "jurisdiction": "GLOBAL",
    "authorityStatus": "open_repository",
    "publicAccessStatus": "record_level",
    "reuseStatus": "record_level_license_required",
    "ingestStatus": "metadata_allowed_fulltext_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "rs-pravno-informacioni-sistem",
    "name": "Правно-информациони систем Републике Србије",
    "canonicalUrl": "https://pravno-informacioni-sistem.rs/",
    "jurisdiction": "RS",
    "authorityStatus": "official_foreign_comparative",
    "publicAccessStatus": "public_partial",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "public_retrieval_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  },
  {
    "id": "si-pisrs",
    "name": "Pravni informacijski sistem Republike Slovenije — PISRS",
    "canonicalUrl": "https://pisrs.si/",
    "jurisdiction": "SI",
    "authorityStatus": "official_foreign_comparative",
    "publicAccessStatus": "public_confirmed",
    "reuseStatus": "terms_review_required",
    "ingestStatus": "public_retrieval_conditional",
    "automatedBulkIngest": false,
    "humanReviewStatus": "reviewed",
    "currentLawRole": null
  }
];

const DEEP_FREEZE=(value)=>{
  if(!value || typeof value!=="object" || Object.isFrozen(value))return value;
  Object.freeze(value);
  for(const item of Object.values(value))DEEP_FREEZE(item);
  return value;
};

export const OPEN_LEGAL_SOURCES=DEEP_FREEZE(SOURCE_ROWS.map(source=>({
  ...source,
  host:new URL(source.canonicalUrl).hostname.toLowerCase().replace(/^www\./,"")
})));

const BY_ID=new Map(OPEN_LEGAL_SOURCES.map(source=>[source.id,source]));

export const SOURCE_AGENT_BOUNDARIES=DEEP_FREEZE({
  chief_legal_orchestrator:["MK","EU","ECHR","RS","SI","HR","BA","ME","GLOBAL"],
  macedonian_law:["MK"],
  eu_law:["EU"],
  echr_law:["ECHR"],
  regional_comparative:["RS","SI","HR","BA","ME"],
  international_law:["GLOBAL"],
  common_law:[],
  general_gpt_assistant:[],
  ai_advokat_knowledge:[],
  verification_citation:["MK","EU","ECHR","RS","SI","HR","BA","ME","GLOBAL"]
});

const OFFICIAL_AUTHORITY_CLASSES=new Set([
  "primary_official",
  "court_official",
  "official_supporting",
  "official_legislative_history",
  "international_court_official",
  "eu_official",
  "official_foreign_comparative"
]);

const VERIFIED_REUSE=new Set(["verified_reuse_allowed","metadata_reuse_verified"]);

function hostname(value){
  try{return new URL(String(value||"")).hostname.toLowerCase().replace(/^www\./,"");}
  catch{return"";}
}

export function openLegalSourceById(id){
  return BY_ID.get(String(id||""))||null;
}

export function classifyOpenLegalSource(url){
  const host=hostname(url);
  if(!host)return null;
  for(const source of OPEN_LEGAL_SOURCES){
    if(host===source.host || host.endsWith("."+source.host))return source;
  }
  return null;
}

export function isRegisteredOfficialLegalSource(url){
  const source=classifyOpenLegalSource(url);
  return Boolean(source && OFFICIAL_AUTHORITY_CLASSES.has(source.authorityStatus));
}

export function sourceAllowedForAgent(sourceOrUrl,agentId){
  const source=typeof sourceOrUrl==="string" ? classifyOpenLegalSource(sourceOrUrl) : sourceOrUrl;
  if(!source)return false;
  if(agentId==="chief_legal_orchestrator" || agentId==="verification_citation")return true;
  const allowed=SOURCE_AGENT_BOUNDARIES[String(agentId||"")]||[];
  return allowed.includes(source.jurisdiction);
}

export function sourceResearchRole(sourceOrUrl,agentId){
  const source=typeof sourceOrUrl==="string" ? classifyOpenLegalSource(sourceOrUrl) : sourceOrUrl;
  if(!source)return "UNREGISTERED_EXTERNAL_DISCOVERY";
  if(!sourceAllowedForAgent(source,agentId))return "REGISTERED_OUTSIDE_AGENT_BOUNDARY";
  if(source.ingestStatus==="metadata_only" || source.authorityStatus==="open_scholarly_metadata")return "REGISTERED_METADATA_ONLY";
  if(source.authorityStatus==="open_repository")return "REGISTERED_RECORD_LEVEL_LICENSE";
  if(OFFICIAL_AUTHORITY_CLASSES.has(source.authorityStatus))return "REGISTERED_OFFICIAL_RESEARCH";
  return "REGISTERED_SUPPORTING_RESEARCH";
}

export function rightsGateForSource(sourceOrUrl,{operation="research_citation",recordLicense=null}={}){
  const source=typeof sourceOrUrl==="string" ? classifyOpenLegalSource(sourceOrUrl) : sourceOrUrl;
  if(!source){
    return Object.freeze({
      registered:false,
      allowed:operation==="research_citation",
      decision:operation==="research_citation" ? "DISCOVERY_ONLY" : "BLOCKED_UNREGISTERED_SOURCE",
      humanReviewRequired:true
    });
  }

  if(operation==="research_citation"){
    return Object.freeze({
      registered:true,
      allowed:true,
      decision:"CITATION_RESEARCH_ALLOWED",
      sourceId:source.id,
      reuseStatus:source.reuseStatus,
      ingestStatus:source.ingestStatus,
      humanReviewRequired:true
    });
  }

  if(operation==="metadata_ingest"){
    const allowed=source.ingestStatus==="metadata_only"
      || source.ingestStatus==="metadata_allowed_fulltext_conditional"
      || source.ingestStatus==="fulltext_and_metadata_allowed_with_conditions";
    return Object.freeze({
      registered:true,
      allowed,
      decision:allowed ? "METADATA_INGEST_ALLOWED_WITH_PROVENANCE" : "BLOCKED_METADATA_INGEST",
      sourceId:source.id,
      reuseStatus:source.reuseStatus,
      humanReviewRequired:source.humanReviewStatus!=="reviewed"
    });
  }

  if(operation==="fulltext_ingest"){
    let allowed=source.ingestStatus==="fulltext_and_metadata_allowed_with_conditions"
      && source.automatedBulkIngest===true
      && source.reuseStatus==="verified_reuse_allowed";
    let decision=allowed ? "FULLTEXT_INGEST_ALLOWED_WITH_SOURCE_CONDITIONS" : "BLOCKED_FULLTEXT_INGEST";
    if(source.reuseStatus==="record_level_license_required"){
      allowed=Boolean(recordLicense);
      decision=allowed ? "FULLTEXT_RECORD_LICENSE_REVIEW_REQUIRED" : "BLOCKED_RECORD_LICENSE_REQUIRED";
    }
    return Object.freeze({
      registered:true,
      allowed,
      decision,
      sourceId:source.id,
      reuseStatus:source.reuseStatus,
      humanReviewRequired:true
    });
  }

  if(operation==="corpus_promotion"){
    return Object.freeze({
      registered:true,
      allowed:false,
      decision:"BLOCKED_PENDING_CORPUS_HUMAN_GATE",
      sourceId:source.id,
      humanReviewRequired:true
    });
  }

  return Object.freeze({
    registered:true,
    allowed:false,
    decision:"BLOCKED_UNKNOWN_OPERATION",
    sourceId:source.id,
    humanReviewRequired:true
  });
}

export function annotateExternalSources(sources,{agentId="chief_legal_orchestrator"}={}){
  const out=[];
  const seen=new Set();
  for(const item of Array.isArray(sources)?sources:[]){
    const url=String(item?.url||"").trim();
    if(!/^https?:\/\//i.test(url) || seen.has(url))continue;
    seen.add(url);
    const policy=classifyOpenLegalSource(url);
    const role=sourceResearchRole(policy,agentId);
    out.push(Object.freeze({
      url,
      title:String(item?.title||url).trim().slice(0,240),
      openLegalSourceId:policy?.id||null,
      jurisdiction:policy?.jurisdiction||null,
      authorityStatus:policy?.authorityStatus||"unregistered_external",
      reuseStatus:policy?.reuseStatus||"unverified",
      ingestStatus:policy?.ingestStatus||"not_authorized",
      registered:Boolean(policy),
      agentBoundaryAllowed:policy ? sourceAllowedForAgent(policy,agentId) : false,
      researchRole:role
    }));
    if(out.length>=20)break;
  }
  return Object.freeze(out);
}

export function policySourcesForAgent(agentId){
  const allowed=SOURCE_AGENT_BOUNDARIES[String(agentId||"")]||[];
  if(agentId==="chief_legal_orchestrator" || agentId==="verification_citation")return OPEN_LEGAL_SOURCES;
  return Object.freeze(OPEN_LEGAL_SOURCES.filter(source=>allowed.includes(source.jurisdiction)));
}

export function sourcePolicyPrompt(agentId){
  if(agentId==="ai_advokat_knowledge"){
    return "OPEN LEGAL SOURCES POLICY: native corpus only; external web research is not authorised inside the Knowledge Agent.";
  }
  const sources=policySourcesForAgent(agentId);
  const preferred=sources
    .filter(source=>OFFICIAL_AUTHORITY_CLASSES.has(source.authorityStatus))
    .map(source=>source.name+" <"+source.canonicalUrl+">")
    .slice(0,10)
    .join("; ");
  return [
    "OPEN LEGAL SOURCES POLICY "+OPEN_LEGAL_SOURCE_POLICY_VERSION+": PUBLIC != REUSABLE.",
    preferred ? "PREFERRED REGISTERED SOURCES FOR THIS BOUNDARY: "+preferred+"." : "No registered official source is pre-approved for this specialist boundary; use external results only as discovery unless independently verified.",
    "For legal research, prefer registered originating/official sources inside your jurisdiction boundary.",
    "An unregistered web result may assist discovery but cannot by itself establish controlling law or current-law status.",
    "Reuse/ingest permissions are separate from citation research: never infer bulk-copy, corpus-promotion or republication permission from public access.",
    "Crossref is metadata-only. Zenodo full text is record-licence controlled. Non-official ECHR translations may carry separate rights.",
    "Foreign comparative authority must remain labelled comparative and never become Macedonian controlling law."
  ].join("\n");
}

export function publicOpenLegalSourceDirectory(){
  return Object.freeze(OPEN_LEGAL_SOURCES.map(source=>Object.freeze({
    id:source.id,
    title:source.name,
    url:source.canonicalUrl,
    jurisdiction:source.jurisdiction,
    authorityStatus:source.authorityStatus,
    publicAccessStatus:source.publicAccessStatus,
    reuseStatus:source.reuseStatus,
    ingestStatus:source.ingestStatus,
    automatedBulkIngest:source.automatedBulkIngest,
    humanReviewStatus:source.humanReviewStatus,
    runtimeResearchRole:sourceResearchRole(source,"chief_legal_orchestrator")
  })));
}

export function openLegalSourcePolicySummary(){
  const all=OPEN_LEGAL_SOURCES;
  return Object.freeze({
    version:OPEN_LEGAL_SOURCE_POLICY_VERSION,
    registryId:OPEN_LEGAL_SOURCE_REGISTRY_ID,
    registryPath:OPEN_LEGAL_SOURCE_REGISTRY_PATH,
    sourceCount:all.length,
    officialSourceCount:all.filter(s=>OFFICIAL_AUTHORITY_CLASSES.has(s.authorityStatus)).length,
    automatedBulkIngestCount:all.filter(s=>s.automatedBulkIngest).length,
    verifiedReuseCount:all.filter(s=>VERIFIED_REUSE.has(s.reuseStatus)).length,
    doctrine:"PUBLIC != REUSABLE",
    corpusPromotion:"separate_human_gate"
  });
}
