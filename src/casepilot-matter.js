// AI Advokat CasePilot Matter Model v2.
// Pure domain model for source-linked case analysis.
// No persistence, filing, signing, external transmission, or professional unlock.

export const CASEPILOT_MATTER_VERSION="2.0.0";

export const CASEPILOT_MATTER_OBJECTS=Object.freeze([
  "documents",
  "timeline",
  "participants",
  "legal_issues",
  "claims",
  "evidence",
  "claim_evidence",
  "contradictions",
  "evidence_gaps",
  "procedural_risks",
  "hearing_questions",
  "ai_findings"
]);

export const CASEPILOT_FINDING_STATUSES=Object.freeze([
  "confirmed_from_source",
  "indication",
  "disputed",
  "missing",
  "professional_review_required"
]);

export const CASEPILOT_LAWYER_DECISIONS=Object.freeze([
  "accepted",
  "corrected",
  "rejected"
]);

function text(value,max=1200){
  if(typeof value!=="string") throw new TypeError("casepilot_text_required");
  const v=value.normalize("NFKC").trim();
  if(!v) throw new TypeError("casepilot_text_required");
  if(v.length>max) throw new TypeError("casepilot_text_too_long");
  return v;
}

function optionalText(value,max=1200){
  if(value===undefined||value===null||value==="") return null;
  return text(String(value),max);
}

function id(value){
  const v=text(String(value||""),120);
  if(!/^[A-Za-z0-9._:-]+$/.test(v)) throw new TypeError("casepilot_invalid_id");
  return v;
}

function sourceAnchor({sourceId,page,paragraph=null}={}){
  const sid=id(sourceId);
  if(!Number.isInteger(page)||page<1) throw new TypeError("casepilot_page_required");
  const para=paragraph===null||paragraph===undefined||paragraph==="" ? null : text(String(paragraph),80);
  return Object.freeze({sourceId:sid,page,paragraph:para});
}

function isoDate(value){
  if(value===undefined||value===null||value==="") return null;
  const v=String(value);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new TypeError("casepilot_invalid_date");
  return v;
}

function nowIso(value){
  const v=value?String(value):new Date().toISOString();
  if(Number.isNaN(Date.parse(v))) throw new TypeError("casepilot_invalid_timestamp");
  return v;
}

function freezeList(values=[]){
  if(!Array.isArray(values)) throw new TypeError("casepilot_array_required");
  return Object.freeze([...values]);
}

export function createMatter({matterId,title,legalArea=null,phase=null,perspective=null,version="0.1"}={}){
  return Object.freeze({
    version:CASEPILOT_MATTER_VERSION,
    matterId:id(matterId),
    title:text(title,240),
    legalArea:optionalText(legalArea,160),
    phase:optionalText(phase,120),
    perspective:optionalText(perspective,120),
    caseVersion:text(String(version),40),
    objects:Object.freeze(Object.fromEntries(CASEPILOT_MATTER_OBJECTS.map(k=>[k,Object.freeze([])]))),
    humanGate:Object.freeze({
      required:true,
      professionalUse:"locked",
      externalTransmission:"forbidden",
      filing:"forbidden",
      signature:"forbidden"
    })
  });
}

export function documentRecord({id:recordId,title,sha256,pageCount,sourceType="uploaded_source"}={}){
  if(typeof sha256!=="string"||!/^[a-f0-9]{64}$/i.test(sha256)) throw new TypeError("casepilot_sha256_required");
  if(!Number.isInteger(pageCount)||pageCount<1) throw new TypeError("casepilot_page_count_required");
  return Object.freeze({
    id:id(recordId),
    title:text(title,240),
    sha256:sha256.toLowerCase(),
    pageCount,
    sourceType:text(sourceType,80)
  });
}

export function timelineEvent({id:eventId,date=null,text:body,sourceId,page,paragraph=null,status="confirmed_from_source"}={}){
  if(!CASEPILOT_FINDING_STATUSES.includes(status)) throw new TypeError("casepilot_invalid_status");
  return Object.freeze({
    id:id(eventId),
    date:isoDate(date),
    text:text(body,1600),
    source:sourceAnchor({sourceId,page,paragraph}),
    status
  });
}

export function participant({id:participantId,name,role,sourceId,page,paragraph=null}={}){
  return Object.freeze({
    id:id(participantId),
    name:text(name,240),
    role:text(role,160),
    source:sourceAnchor({sourceId,page,paragraph})
  });
}

export function legalIssue({id:issueId,title,question,sourceIds=[]}={}){
  return Object.freeze({
    id:id(issueId),
    title:text(title,220),
    question:text(question,1200),
    sourceIds:freezeList(sourceIds.map(id))
  });
}

export function claim({id:claimId,text:body,sourceId,page,paragraph=null,status="professional_review_required"}={}){
  if(!CASEPILOT_FINDING_STATUSES.includes(status)) throw new TypeError("casepilot_invalid_status");
  return Object.freeze({
    id:id(claimId),
    text:text(body,1800),
    source:sourceAnchor({sourceId,page,paragraph}),
    status
  });
}

export function evidenceItem({id:evidenceId,title,sourceId,page,paragraph=null,evidenceType="documentary",notes=null}={}){
  return Object.freeze({
    id:id(evidenceId),
    title:text(title,300),
    evidenceType:text(evidenceType,120),
    source:sourceAnchor({sourceId,page,paragraph}),
    notes:optionalText(notes,1600)
  });
}

export function claimEvidenceLink({id:linkId,claimId,evidenceId,supportType="supports",weakness=null,counterevidenceIds=[]}={}){
  if(!["supports","contradicts","neutral","context"].includes(supportType)) throw new TypeError("casepilot_invalid_support_type");
  return Object.freeze({
    id:id(linkId),
    claimId:id(claimId),
    evidenceId:id(evidenceId),
    supportType,
    weakness:optionalText(weakness,1200),
    counterevidenceIds:freezeList(counterevidenceIds.map(id))
  });
}

export function contradiction({id:contradictionId,left,right,meaning=null,question=null}={}){
  const normalizeSide=(side)=>{
    if(!side||typeof side!=="object") throw new TypeError("casepilot_contradiction_side_required");
    return Object.freeze({
      text:text(side.text,1400),
      source:sourceAnchor(side)
    });
  };
  return Object.freeze({
    id:id(contradictionId),
    left:normalizeSide(left),
    right:normalizeSide(right),
    meaning:optionalText(meaning,1200),
    question:optionalText(question,1200),
    status:"disputed"
  });
}

export function evidenceGap({id:gapId,issue,whyMaterial,collectionPlan=null,status="missing"}={}){
  if(!["missing","professional_review_required"].includes(status)) throw new TypeError("casepilot_invalid_gap_status");
  return Object.freeze({
    id:id(gapId),
    issue:text(issue,1200),
    whyMaterial:text(whyMaterial,1600),
    collectionPlan:optionalText(collectionPlan,1600),
    status
  });
}

export function proceduralRisk({id:riskId,title,description,legalBasisSourceId=null,page=null,severity="medium",mitigation=null}={}){
  if(!["low","medium","high","critical"].includes(severity)) throw new TypeError("casepilot_invalid_risk_severity");
  const legalBasis=legalBasisSourceId ? sourceAnchor({sourceId:legalBasisSourceId,page}) : null;
  return Object.freeze({
    id:id(riskId),
    title:text(title,240),
    description:text(description,1800),
    legalBasis,
    severity,
    mitigation:optionalText(mitigation,1600),
    humanReviewRequired:true
  });
}

export function hearingQuestion({id:questionId,targetType,targetId,question,purpose,sourceId,page,paragraph=null}={}){
  if(!["witness","expert","client","opposing_party","court"].includes(targetType)) throw new TypeError("casepilot_invalid_target_type");
  return Object.freeze({
    id:id(questionId),
    targetType,
    targetId:id(targetId),
    question:text(question,1400),
    purpose:text(purpose,1200),
    source:sourceAnchor({sourceId,page,paragraph}),
    status:"working_draft"
  });
}

export function aiFinding({id:findingId,text:body,sources,status="professional_review_required"}={}){
  if(!CASEPILOT_FINDING_STATUSES.includes(status)) throw new TypeError("casepilot_invalid_status");
  if(!Array.isArray(sources)||!sources.length) throw new TypeError("casepilot_finding_source_required");
  return Object.freeze({
    id:id(findingId),
    text:text(body,2000),
    sources:Object.freeze(sources.map(sourceAnchor)),
    status,
    lawyerDecision:null,
    lawyer:null,
    decidedAt:null,
    lockedForProfessionalUse:true
  });
}

export function decideAIFinding(finding,{decision,lawyer,decidedAt,correctedText=null}={}){
  if(!finding||typeof finding!=="object") throw new TypeError("casepilot_finding_required");
  if(!CASEPILOT_LAWYER_DECISIONS.includes(decision)) throw new TypeError("casepilot_invalid_lawyer_decision");
  const corrected=decision==="corrected" ? text(correctedText,2000) : null;
  return Object.freeze({
    ...finding,
    lawyerDecision:decision,
    lawyer:text(lawyer,240),
    decidedAt:nowIso(decidedAt),
    correctedText:corrected,
    lockedForProfessionalUse:false
  });
}

export function addMatterObject(matter,collection,item){
  if(!matter||matter.version!==CASEPILOT_MATTER_VERSION) throw new TypeError("casepilot_matter_required");
  if(!CASEPILOT_MATTER_OBJECTS.includes(collection)) throw new TypeError("casepilot_invalid_collection");
  if(!item||typeof item!=="object") throw new TypeError("casepilot_item_required");
  const current=matter.objects[collection];
  if(current.some(x=>x.id===item.id)) throw new TypeError("casepilot_duplicate_object_id");
  return Object.freeze({
    ...matter,
    objects:Object.freeze({
      ...matter.objects,
      [collection]:Object.freeze([...current,item])
    })
  });
}

export function matterReadiness(matter){
  if(!matter||matter.version!==CASEPILOT_MATTER_VERSION) throw new TypeError("casepilot_matter_required");
  const docs=new Map(matter.objects.documents.map(d=>[d.id,d]));
  const problems=[];

  const checkAnchor=(anchor,label,idValue)=>{
    if(!anchor||!docs.has(anchor.sourceId)){
      problems.push({id:idValue,object:label,error:"source_not_registered"});
      return;
    }
    const doc=docs.get(anchor.sourceId);
    if(anchor.page>doc.pageCount) problems.push({id:idValue,object:label,error:"page_out_of_range"});
  };

  for(const event of matter.objects.timeline) checkAnchor(event.source,"timeline",event.id);
  for(const person of matter.objects.participants) checkAnchor(person.source,"participant",person.id);
  for(const c of matter.objects.claims) checkAnchor(c.source,"claim",c.id);
  for(const e of matter.objects.evidence) checkAnchor(e.source,"evidence",e.id);
  for(const x of matter.objects.contradictions){
    checkAnchor(x.left.source,"contradiction_left",x.id);
    checkAnchor(x.right.source,"contradiction_right",x.id);
  }
  for(const q of matter.objects.hearing_questions) checkAnchor(q.source,"hearing_question",q.id);
  for(const f of matter.objects.ai_findings){
    for(const a of f.sources) checkAnchor(a,"ai_finding",f.id);
  }
  for(const r of matter.objects.procedural_risks){
    if(r.legalBasis) checkAnchor(r.legalBasis,"procedural_risk",r.id);
  }

  const claimIds=new Set(matter.objects.claims.map(x=>x.id));
  const evidenceIds=new Set(matter.objects.evidence.map(x=>x.id));
  for(const link of matter.objects.claim_evidence){
    if(!claimIds.has(link.claimId)) problems.push({id:link.id,object:"claim_evidence",error:"claim_not_found"});
    if(!evidenceIds.has(link.evidenceId)) problems.push({id:link.id,object:"claim_evidence",error:"evidence_not_found"});
    for(const cid of link.counterevidenceIds){
      if(!evidenceIds.has(cid)) problems.push({id:link.id,object:"claim_evidence",error:"counterevidence_not_found"});
    }
  }

  const unreviewed=matter.objects.ai_findings.filter(f=>f.lockedForProfessionalUse!==false);
  return Object.freeze({
    sourceProblems:Object.freeze(problems),
    unreviewedAIFindings:unreviewed.length,
    professionalUseReady:problems.length===0 && unreviewed.length===0 && matter.humanGate.professionalUse!=="locked",
    humanGateRequired:true,
    reason:"Professional use remains locked until a separate governed Human Gate changes the workspace state."
  });
}
