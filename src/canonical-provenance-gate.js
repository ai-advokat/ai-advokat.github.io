// Canonical provenance release gate for AI Advokat.
// No legal or quasi-legal material may enter provider context without explicit
// identity, authority, locator, release role and Human Gate state.
// Primary/current-law authority additionally requires official provenance.

export const CANONICAL_PROVENANCE_GATE_VERSION="AI_ADVOCAT_CANONICAL_PROVENANCE_GATE_V2";
export const CANONICAL_METADATA_STANDARD_VERSION="AI_ADVOCAT_CANONICAL_LEGAL_METADATA_V2";

const SHA256=/^[0-9a-f]{64}$/i;
const REVIEWED=new Set(["reviewed","approved"]);

function present(value){
  return value!==null && value!==undefined && String(value).trim()!=="";
}
function validSha(value){ return SHA256.test(String(value||"")); }
function validHttp(value){
  try{
    const url=new URL(String(value||""));
    return url.protocol==="https:" || url.protocol==="http:";
  }catch{return false;}
}
function addMissing(missing,field,value,validator=present){
  if(!validator(value)) missing.push(field);
}
function requireFields(missing,p,fields){
  for(const field of fields) addMissing(missing,field,p[field]);
}
function requireOfficialFingerprint(missing,p,{shaField="sourceSha256"}={}){
  addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
  addMissing(missing,shaField,p[shaField],validSha);
}

export const CANONICAL_METADATA_REQUIRED_FIELDS=Object.freeze({
  common:["kind","sourceIdentity","authorityClass","locator","releaseRole","humanReviewStatus","legalAuthority"],
  official_source_record:["sourceUrl","jurisdiction","accessStatus","reuseStatus","ingestStatus","rightsCheckedOn"],
  legal_instrument:["instrumentKey","title","instrumentType","jurisdiction","sourceUrl","sourceSha256","versionLabel"],
  gazette_issue:["publicationName","issueNumber","issueDate","sourceUrl","sourceSha256"],
  legal_act:["title","actType","issuer","issueNumber","issueDate","sourceUrl","sourceSha256"],
  legal_article:["instrumentKey","articleNumber","versionLabel","sourceIssueNumber","sourceIssueDate","sourceUrl","sourceSha256"],
  gazette_chunk:["publicationName","issueNumber","issueDate","articleNumber","sourceUrl","textSha256"],
  case_law:["caseIdentity","court","jurisdiction","decisionDate","sourceUrl","authorityReviewStatus"],
  guide:["recordId","title","verificationState","activationState","fingerprint"],
  echr_discovery:["recordIdentity","listingPeriod","capturedOn","sourceUrl"],
  authorial_publication:["title","author","publicationState","publicationDate","sourceUrl"]
});

export function assessCanonicalProvenance(provenance){
  const p=provenance && typeof provenance==="object" ? provenance : {};
  const kind=String(p.kind||"");
  if(kind==="governance_notice"){
    return {ok:true,kind,missing:[],problems:[],gateVersion:CANONICAL_PROVENANCE_GATE_VERSION,metadataStandardVersion:CANONICAL_METADATA_STANDARD_VERSION};
  }

  const missing=[];
  const problems=[];
  requireFields(missing,p,["kind","sourceIdentity","authorityClass","locator","releaseRole","humanReviewStatus"]);
  if(typeof p.legalAuthority!=="boolean") missing.push("legalAuthority");

  if(kind==="official_source_record"){
    requireFields(missing,p,["jurisdiction","accessStatus","reuseStatus","ingestStatus","rightsCheckedOn"]);
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
  }else if(kind==="legal_instrument"){
    requireFields(missing,p,["instrumentKey","title","instrumentType","jurisdiction","versionLabel"]);
    requireOfficialFingerprint(missing,p);
  }else if(kind==="gazette_issue"){
    requireFields(missing,p,["publicationName","issueNumber","issueDate"]);
    requireOfficialFingerprint(missing,p);
  }else if(kind==="legal_act" || kind==="bylaw" || kind==="rulebook" || kind==="regulation"){
    requireFields(missing,p,["title","actType","issuer","issueNumber","issueDate"]);
    requireOfficialFingerprint(missing,p);
  }else if(kind==="legal_article"){
    requireFields(missing,p,["instrumentKey","articleNumber","versionLabel","sourceIssueNumber","sourceIssueDate"]);
    requireOfficialFingerprint(missing,p);
  }else if(kind==="gazette_chunk"){
    requireFields(missing,p,["publicationName","issueNumber","issueDate","articleNumber"]);
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
    addMissing(missing,"textSha256",p.textSha256,validSha);
  }else if(kind==="case_law"){
    requireFields(missing,p,["caseIdentity","court","jurisdiction","decisionDate","authorityReviewStatus"]);
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
  }else if(kind==="guide" || kind==="fingerprint_verified_guide"){
    requireFields(missing,p,["recordId","title","verificationState","activationState"]);
    addMissing(missing,"fingerprint",p.fingerprint,validSha);
  }else if(kind==="echr_discovery"){
    requireFields(missing,p,["recordIdentity","listingPeriod","capturedOn"]);
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
  }else if(kind==="authorial_publication"){
    requireFields(missing,p,["title","author","publicationState","publicationDate"]);
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
    if(String(p.publicationState)==="published" && !present(p.persistentIdentifier)){
      problems.push("published_authorial_work_requires_persistent_identifier");
    }
  }else{
    problems.push("unsupported_provenance_kind");
  }

  if(p.legalAuthority===true && !REVIEWED.has(String(p.humanReviewStatus||""))){
    problems.push("legal_authority_requires_reviewed_human_gate");
  }
  if(kind==="case_law" && !REVIEWED.has(String(p.authorityReviewStatus||""))){
    problems.push("case_law_authority_requires_reviewed_human_gate");
  }
  if(p.currentLawClaim===true){
    if(String(p.humanReviewStatus||"")!=="approved") problems.push("current_law_requires_approved_human_gate");
    if(p.versionHumanReviewStatus!==undefined && String(p.versionHumanReviewStatus||"")!=="approved"){
      problems.push("current_law_requires_approved_version_gate");
    }
    if(["legal_act","bylaw","rulebook","regulation","legal_instrument"].includes(kind)){
      if(!present(p.effectiveDate) && !present(p.applicationDate)){
        problems.push("current_law_act_requires_effective_or_application_date");
      }
    }
  }
  if((kind==="guide" || kind==="fingerprint_verified_guide") && p.legalAuthority!==false){
    problems.push("guide_must_remain_secondary_non_authority");
  }
  if(kind==="authorial_publication" && p.legalAuthority!==false){
    problems.push("authorial_publication_must_remain_secondary_non_authority");
  }
  if(kind==="echr_discovery" && (p.legalAuthority!==false || p.releaseRole!=="discovery_only")){
    problems.push("echr_index_must_remain_discovery_only");
  }
  if(kind==="official_source_record" && p.releaseRole!=="source_registry"){
    problems.push("official_source_record_must_remain_source_registry");
  }

  return {
    ok:missing.length===0 && problems.length===0,
    kind,
    missing:[...new Set(missing)],
    problems:[...new Set(problems)],
    gateVersion:CANONICAL_PROVENANCE_GATE_VERSION,
    metadataStandardVersion:CANONICAL_METADATA_STANDARD_VERSION
  };
}

export function enforceCanonicalContextProvenance(items){
  const released=[];
  const blocked=[];
  for(const raw of Array.isArray(items)?items:[]){
    if(!raw || typeof raw!=="object") continue;
    if(raw.contextRole==="governance_notice"){
      released.push({
        ...raw,
        provenanceGate:{ok:true,state:"release_notice",gateVersion:CANONICAL_PROVENANCE_GATE_VERSION,metadataStandardVersion:CANONICAL_METADATA_STANDARD_VERSION}
      });
      continue;
    }
    const assessment=assessCanonicalProvenance(raw.provenance);
    if(!assessment.ok){
      blocked.push({
        source:String(raw.source||"unknown"),
        locator:String(raw.locator||""),
        kind:assessment.kind||null,
        missing:assessment.missing,
        problems:assessment.problems
      });
      continue;
    }
    released.push({
      ...raw,
      provenanceGate:{ok:true,state:"release",gateVersion:CANONICAL_PROVENANCE_GATE_VERSION,metadataStandardVersion:CANONICAL_METADATA_STANDARD_VERSION}
    });
  }
  return {
    context:released,
    blocked,
    state:blocked.length ? (released.length ? "partial_release" : "blocked") : "verified",
    gateVersion:CANONICAL_PROVENANCE_GATE_VERSION,
    metadataStandardVersion:CANONICAL_METADATA_STANDARD_VERSION
  };
}

export function provenanceBlockNotice(blocked){
  const count=Array.isArray(blocked)?blocked.length:0;
  if(!count) return null;
  return {
    contextRole:"governance_notice",
    source:"AI Advokat Canonical Provenance Gate",
    locator:"runtime source release",
    version:CANONICAL_PROVENANCE_GATE_VERSION,
    text:[
      "CANONICAL_PROVENANCE_GATE_BLOCKED: "+count+" source record(s) were excluded before AI synthesis.",
      "Do not infer or reconstruct the blocked legal authority from model memory.",
      "A missing source identity, locator, official URL/fingerprint, version/date or Human Gate state must be repaired in the corpus before authoritative reuse.",
      "This applies equally to laws, Official Gazette issues, bylaws/rulebooks, article-level norms, case law, guides and secondary publications."
    ].join("\n"),
    provenance:{kind:"governance_notice"}
  };
}
