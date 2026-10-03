const VALID_VERIFICATION=new Set(["verified_current","verified_historical","pending_verification","conflicted","superseded"]);

function nonEmpty(v){
  return typeof v==="string" && v.trim().length>0;
}

export function validateResponseProvenance(response){
  const errors=[];
  const warnings=[];

  if(!response || typeof response!=="object"){
    return {decision:"reject",errors:["invalid_response_object"],warnings};
  }

  if(!nonEmpty(response.response_id)) errors.push("missing_response_id");
  if(!nonEmpty(response.generated_at)) errors.push("missing_generated_at");
  if(!Array.isArray(response.claims)) errors.push("missing_claims_array");

  const claims=Array.isArray(response.claims)?response.claims:[];
  let hasMixed=false;
  let allVerified=true;

  for(const claim of claims){
    const cid=nonEmpty(claim?.claim_id)?claim.claim_id:"unknown";

    if(!nonEmpty(claim?.text)) errors.push(`claim:${cid}:missing_text`);
    if(!nonEmpty(claim?.authority_class)) errors.push(`claim:${cid}:missing_authority_class`);
    if(!nonEmpty(claim?.source_identity)) errors.push(`claim:${cid}:missing_source_identity`);
    if(!VALID_VERIFICATION.has(claim?.verification_state)) errors.push(`claim:${cid}:missing_or_invalid_verification_state`);
    if(!nonEmpty(claim?.provenance)) errors.push(`claim:${cid}:missing_provenance`);
    if(!nonEmpty(claim?.response_label)) errors.push(`claim:${cid}:missing_response_label`);

    if(claim?.authority_class==="A6" && claim?.claim_type==="current_law"){
      errors.push(`claim:${cid}:ai_synthesis_cannot_support_current_law`);
    }

    if(claim?.claim_type==="current_law"){
      if(claim?.verification_state!=="verified_current"){
        errors.push(`claim:${cid}:current_law_not_verified_current`);
      }
      if(!nonEmpty(claim?.source_version_or_date)){
        errors.push(`claim:${cid}:missing_version_or_date`);
      }
      if(["high","critical"].includes(claim?.risk) && !nonEmpty(claim?.locator)){
        warnings.push(`claim:${cid}:missing_precise_locator`);
      }
      if(claim?.verification_state==="superseded"){
        errors.push(`claim:${cid}:superseded_source_used_as_current`);
      }
    }

    if(claim?.verification_state!=="verified_current"){
      allVerified=false;
      hasMixed=true;
    }
  }

  const hc=response.human_control;
  if(!hc || typeof hc!=="object"){
    errors.push("missing_human_control");
  }else{
    if(typeof hc.human_review_required!=="boolean") errors.push("invalid_human_review_required");
    if(!["not_reviewed","reviewed","approved","rejected","needs_revision"].includes(hc.human_review_state)){
      errors.push("invalid_human_review_state");
    }
    if(!["not_authorized","internal_only","authorized_for_release"].includes(hc.release_decision)){
      errors.push("invalid_release_decision");
    }
    if(hc.release_decision==="authorized_for_release" && hc.human_review_state!=="approved"){
      errors.push("release_without_human_approval");
    }
  }

  if(response.overall_verification_state==="verified" && !allVerified){
    errors.push("mixed_or_unverified_claims_hidden_by_verified_overall_state");
  }

  if(response.overall_verification_state==="mixed" && !hasMixed && claims.length>0){
    warnings.push("overall_state_mixed_but_all_claims_verified");
  }

  return {
    decision:errors.length?"reject":"accept",
    errors,
    warnings,
    releasable:
      errors.length===0 &&
      hc?.human_review_state==="approved" &&
      hc?.release_decision==="authorized_for_release"
  };
}
