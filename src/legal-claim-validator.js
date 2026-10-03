export const AUTHORITY = Object.freeze({
  A1: "primary_binding_law",
  A2: "judicial_authority",
  A3: "official_guidance",
  A4: "authorial_analysis",
  A5: "secondary_reference",
  A6: "ai_synthesis"
});

const CURRENT_LAW_CAPABLE = new Set(["A1","A2","A3"]);
const VALID_VERIFICATION = new Set([
  "verified_current",
  "verified_historical",
  "pending_verification",
  "conflicted",
  "superseded"
]);

function nonEmpty(value){
  return typeof value === "string" && value.trim().length > 0;
}

export function validateLegalClaim(claim){
  const reasons=[];
  const warnings=[];

  if(!claim || typeof claim!=="object"){
    return {decision:"reject",current_law_capable:false,reasons:["invalid_claim_object"],warnings};
  }

  const authority=claim.authority_class;
  if(!Object.hasOwn(AUTHORITY,authority)) reasons.push("missing_or_invalid_authority_class");
  if(!nonEmpty(claim.source_identity)) reasons.push("missing_source_identity");
  if(!VALID_VERIFICATION.has(claim.verification_state)) reasons.push("missing_or_invalid_verification_state");
  if(!nonEmpty(claim.provenance)) reasons.push("missing_provenance");

  const wantsCurrentLaw=claim.claim_type==="current_law";
  const isHighRisk=claim.risk==="high" || claim.risk==="critical";

  if(wantsCurrentLaw && authority==="A6") reasons.push("current_law_supported_only_by_ai_synthesis");
  if(wantsCurrentLaw && ["A4","A5"].includes(authority)) reasons.push("commentary_cannot_establish_current_law");

  if(wantsCurrentLaw && !nonEmpty(claim.version_or_date)){
    reasons.push("missing_version_or_date_for_current_law");
  }

  if(wantsCurrentLaw && isHighRisk && !nonEmpty(claim.locator)){
    warnings.push("missing_precise_locator");
  }

  if(claim.verification_state==="superseded" && wantsCurrentLaw) reasons.push("superseded_source_presented_as_current");
  if(claim.verification_state==="verified_historical" && wantsCurrentLaw) reasons.push("historical_source_presented_as_current");
  if(claim.verification_state==="pending_verification" && wantsCurrentLaw) reasons.push("current_law_not_verified");
  if(claim.locator_status==="invented") reasons.push("invented_locator");

  if(claim.binding_label===true && ["A3","A4","A5","A6"].includes(authority)){
    reasons.push("non_binding_source_mislabelled_as_binding");
  }

  if(reasons.length){
    const hardReject = reasons.some(r => [
      "invalid_claim_object",
      "missing_or_invalid_authority_class",
      "missing_source_identity",
      "missing_provenance",
      "current_law_supported_only_by_ai_synthesis",
      "invented_locator"
    ].includes(r));
    return {
      decision: hardReject ? "reject" : "downgrade",
      current_law_capable:false,
      reasons,
      warnings
    };
  }

  const current_law_capable =
    wantsCurrentLaw &&
    CURRENT_LAW_CAPABLE.has(authority) &&
    claim.verification_state==="verified_current";

  return {
    decision:"accept",
    current_law_capable,
    reasons:[],
    warnings
  };
}

export function authorityLabel(code){
  return AUTHORITY[code] ?? null;
}
