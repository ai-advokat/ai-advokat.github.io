function nonEmpty(v){ return typeof v==="string" && v.trim().length>0; }
function isSha(v){ return typeof v==="string" && /^[0-9a-f]{64}$/.test(v); }

export function validateAuditHistory(history){
  const errors=[];
  if(!history || typeof history!=="object") return {valid:false,errors:["invalid_history"]};
  if(!Array.isArray(history.subjects)) return {valid:false,errors:["missing_subjects"]};

  const ids=new Set();

  for(const subject of history.subjects){
    if(!nonEmpty(subject.subject_id)) errors.push("subject_missing_id");
    if(!Array.isArray(subject.events) || subject.events.length===0){
      errors.push(`subject:${subject.subject_id}:missing_events`);
      continue;
    }

    for(const event of subject.events){
      if(!nonEmpty(event.event_id)) errors.push(`subject:${subject.subject_id}:event_missing_id`);
      else if(ids.has(event.event_id)) errors.push(`duplicate_event_id:${event.event_id}`);
      else ids.add(event.event_id);

      if(!nonEmpty(event.event_type)) errors.push(`event:${event.event_id}:missing_type`);
      if(!nonEmpty(event.occurred_at)) errors.push(`event:${event.event_id}:missing_date`);
      if(!nonEmpty(event.resulting_state)) errors.push(`event:${event.event_id}:missing_resulting_state`);

      if(event.event_type==="corrected_candidate_fingerprinted"){
        const fp=event.artifact_fingerprint;
        if(!fp || !isSha(fp.docx_sha256) || !isSha(fp.pdf_sha256)){
          errors.push(`event:${event.event_id}:invalid_candidate_fingerprint`);
        }
      }

      if(event.event_type==="human_gate_decision"){
        if(!nonEmpty(event.decision_ledger_ref)) errors.push(`event:${event.event_id}:missing_ledger_ref`);
        if(!nonEmpty(event.gate_type)) errors.push(`event:${event.event_id}:missing_gate_type`);
        if(!nonEmpty(event.decision_state)) errors.push(`event:${event.event_id}:missing_decision_state`);
      }

      if(event.event_type==="public_release" && event.gate_type!=="public_release"){
        errors.push(`event:${event.event_id}:release_without_release_gate`);
      }
      if(event.event_type==="rag_eligibility_change" && event.gate_type!=="rag_eligibility"){
        errors.push(`event:${event.event_id}:rag_without_rag_gate`);
      }
      if(event.event_type==="production_corpus_write" && event.gate_type!=="production_corpus_write"){
        errors.push(`event:${event.event_id}:production_write_without_gate`);
      }
    }
  }

  return {valid:errors.length===0,errors};
}

export function reconstructSubjectState(subject){
  if(!subject || !Array.isArray(subject.events) || subject.events.length===0) return null;
  return subject.events[subject.events.length-1].resulting_state ?? null;
}
