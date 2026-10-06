const VALID_GATES=new Set([
  "author_approval",
  "github_merge",
  "public_release",
  "rag_eligibility",
  "production_corpus_write",
  "current_law_verification",
  "corpus_promotion",
  "provider_activation",
  "production_schema_migration",
  "production_runtime_deploy"
]);

const VALID_STATES=new Set([
  "pending","approved","rejected","needs_revision","revoked"
]);

function nonEmpty(v){
  return typeof v==="string" && v.trim().length>0;
}

function validSha(v){
  return typeof v==="string" && /^[0-9a-f]{64}$/.test(v);
}

export function validateHumanGateDecision(record){
  const errors=[];
  if(!record || typeof record!=="object") return {valid:false,errors:["invalid_record"]};

  if(!nonEmpty(record.decision_id)) errors.push("missing_decision_id");
  if(!nonEmpty(record.subject_id)) errors.push("missing_subject_id");
  if(!VALID_GATES.has(record.gate_type)) errors.push("invalid_gate_type");
  if(!VALID_STATES.has(record.decision_state)) errors.push("invalid_decision_state");
  if(!nonEmpty(record.decided_at)) errors.push("missing_decided_at");
  if(!nonEmpty(record.decision_basis)) errors.push("missing_decision_basis");
  if(!nonEmpty(record.artifact_version)) errors.push("missing_artifact_version");

  const fp=record.artifact_fingerprint;
  if(!fp || typeof fp!=="object") {
    errors.push("missing_artifact_fingerprint");
  } else {
    const vals=Object.values(fp);
    if(vals.length===0 || !vals.every(validSha)) errors.push("invalid_artifact_fingerprint");
  }

  if(Array.isArray(record.implied_gates) && record.implied_gates.length>0){
    errors.push("gate_implication_not_allowed");
  }

  return {valid:errors.length===0,errors};
}

export function isGateApproved(records,{subject_id,gate_type,artifact_version,artifact_fingerprint}){
  if(!Array.isArray(records)) return false;

  const fpEntries=artifact_fingerprint && typeof artifact_fingerprint==="object"
    ? Object.entries(artifact_fingerprint)
    : [];

  const matchesFingerprint=(rec)=>{
    if(!rec.artifact_fingerprint || typeof rec.artifact_fingerprint!=="object") return false;
    if(fpEntries.length===0) return false;
    return fpEntries.every(([k,v])=>rec.artifact_fingerprint[k]===v);
  };

  const candidates=records.filter(rec=>
    rec.subject_id===subject_id &&
    rec.gate_type===gate_type &&
    rec.artifact_version===artifact_version &&
    matchesFingerprint(rec)
  );

  if(candidates.length===0) return false;

  const latest=candidates[candidates.length-1];
  const check=validateHumanGateDecision(latest);
  return check.valid && latest.decision_state==="approved";
}
