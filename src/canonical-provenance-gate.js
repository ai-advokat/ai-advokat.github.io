// Canonical provenance release gate for AI Advokat.
// A legal source may enter provider context only when its identity, authority,
// locator, version/date/fingerprint and Human Gate state are explicit.
// Secondary/discovery materials may pass only in a non-authoritative role.

export const CANONICAL_PROVENANCE_GATE_VERSION="AI_ADVOCAT_CANONICAL_PROVENANCE_GATE_V1";

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

export function assessCanonicalProvenance(provenance){
  const p=provenance && typeof provenance==="object" ? provenance : {};
  const kind=String(p.kind||"");
  if(kind==="governance_notice"){
    return {ok:true,kind,missing:[],problems:[],gateVersion:CANONICAL_PROVENANCE_GATE_VERSION};
  }

  const missing=[];
  const problems=[];
  for(const field of ["kind","sourceIdentity","authorityClass","locator","releaseRole","humanReviewStatus"]){
    addMissing(missing,field,p[field]);
  }

  if(typeof p.legalAuthority!=="boolean") missing.push("legalAuthority");

  if(kind==="legal_article"){
    for(const field of ["instrumentKey","articleNumber","versionLabel","sourceIssueNumber","sourceIssueDate"]){
      addMissing(missing,field,p[field]);
    }
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
    addMissing(missing,"sourceSha256",p.sourceSha256,validSha);
  }else if(kind==="gazette_chunk"){
    for(const field of ["publicationName","issueNumber","issueDate","articleNumber"]){
      addMissing(missing,field,p[field]);
    }
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
    addMissing(missing,"textSha256",p.textSha256,validSha);
  }else if(kind==="case_law"){
    for(const field of ["caseIdentity","court","jurisdiction","decisionDate","authorityReviewStatus"]){
      addMissing(missing,field,p[field]);
    }
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
  }else if(kind==="guide" || kind==="fingerprint_verified_guide"){
    for(const field of ["recordId","title","verificationState","activationState"]){
      addMissing(missing,field,p[field]);
    }
    addMissing(missing,"fingerprint",p.fingerprint,validSha);
  }else if(kind==="echr_discovery"){
    for(const field of ["recordIdentity","listingPeriod","capturedOn"]){
      addMissing(missing,field,p[field]);
    }
    addMissing(missing,"sourceUrl",p.sourceUrl,validHttp);
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
  }
  if((kind==="guide" || kind==="fingerprint_verified_guide") && p.legalAuthority!==false){
    problems.push("guide_must_remain_secondary_non_authority");
  }
  if(kind==="echr_discovery" && (p.legalAuthority!==false || p.releaseRole!=="discovery_only")){
    problems.push("echr_index_must_remain_discovery_only");
  }

  return {
    ok:missing.length===0 && problems.length===0,
    kind,
    missing:[...new Set(missing)],
    problems:[...new Set(problems)],
    gateVersion:CANONICAL_PROVENANCE_GATE_VERSION
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
        provenanceGate:{ok:true,state:"release_notice",gateVersion:CANONICAL_PROVENANCE_GATE_VERSION}
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
      provenanceGate:{ok:true,state:"release",gateVersion:CANONICAL_PROVENANCE_GATE_VERSION}
    });
  }
  return {
    context:released,
    blocked,
    state:blocked.length ? (released.length ? "partial_release" : "blocked") : "verified",
    gateVersion:CANONICAL_PROVENANCE_GATE_VERSION
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
      "A missing source identity, locator, official URL/fingerprint, version/date or Human Gate state must be repaired in the corpus before authoritative reuse."
    ].join("\n"),
    provenance:{kind:"governance_notice"}
  };
}
