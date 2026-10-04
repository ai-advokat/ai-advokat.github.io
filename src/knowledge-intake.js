// AI Advokat — governed knowledge intake classification.
// Incoming author materials are read and classified before any mutation,
// publication, RAG ingestion or production-corpus promotion.

export const KNOWLEDGE_CLASSES = Object.freeze({
  INTERNAL_INSTRUCTION: "authoritative_internal_instruction",
  LEGAL_REFERENCE: "legal_reference_document",
  USER_GUIDE: "user_facing_guide",
  RESEARCH_WORKING: "research_working_material",
  UNCLASSIFIED: "unclassified_pending_review"
});

export const INTAKE_GATES = Object.freeze({
  contentMutation: "not_authorized",
  publicRelease: "not_authorized",
  ragEligibility: "not_authorized",
  productionCorpusWrite: "not_authorized",
  legalCorpusPromotion: "not_authorized"
});

export const KNOWLEDGE_INTAKE_POLICY = Object.freeze({
  policyId: "AI_ADVOKAT_KNOWLEDGE_INTAKE_POLICY_v1",
  doctrine: Object.freeze([
    "read_before_edit",
    "preserve_original",
    "classify_before_use",
    "source_identity_required",
    "authority_separate_from_authorship",
    "rag_requires_separate_human_gate",
    "fail_closed"
  ]),
  classes: KNOWLEDGE_CLASSES,
  defaultClass: KNOWLEDGE_CLASSES.UNCLASSIFIED,
  allowedAuthorityRoles: Object.freeze([
    "internal_operating_instruction",
    "primary_legal_source",
    "judicial_authority",
    "official_guidance",
    "authorial_analysis",
    "secondary_reference",
    "user_facing_education"
  ])
});

const ALLOWED_CLASSES=new Set(Object.values(KNOWLEDGE_CLASSES));

export function normalizeKnowledgeClassification(value){
  const v=String(value || "").trim();
  return ALLOWED_CLASSES.has(v) ? v : KNOWLEDGE_CLASSES.UNCLASSIFIED;
}

export function createKnowledgeIntakeRecord({
  id,
  title,
  sourceSha256,
  classification=KNOWLEDGE_CLASSES.UNCLASSIFIED,
  authorityRole=null,
  author="Zoran Stojankich",
  receivedAt=null,
  notes=null
}={}){
  const recordId=String(id || "").trim();
  const recordTitle=String(title || "").trim();
  const sha=String(sourceSha256 || "").trim().toLowerCase();

  if(!recordId) throw new TypeError("knowledge_intake_id_required");
  if(!recordTitle) throw new TypeError("knowledge_intake_title_required");
  if(!/^[0-9a-f]{64}$/.test(sha)) throw new TypeError("knowledge_intake_sha256_required");

  const cls=normalizeKnowledgeClassification(classification);
  const role=authorityRole==null ? null : String(authorityRole).trim();
  if(role && !KNOWLEDGE_INTAKE_POLICY.allowedAuthorityRoles.includes(role)){
    throw new TypeError("knowledge_intake_invalid_authority_role");
  }

  return Object.freeze({
    id:recordId,
    title:recordTitle,
    author:String(author || "Zoran Stojankich"),
    sourceSha256:sha,
    receivedAt:receivedAt ? String(receivedAt) : null,
    classification:cls,
    authorityRole:role,
    originalPreservation:Object.freeze({
      readOnlyOriginal:true,
      contentMutation:INTAKE_GATES.contentMutation
    }),
    gates:Object.freeze({...INTAKE_GATES}),
    usePolicy:Object.freeze({
      internalInstruction:cls===KNOWLEDGE_CLASSES.INTERNAL_INSTRUCTION
        ? "may_govern_agent_behavior_only_after_explicit_author_approval"
        : "not_applicable",
      legalAuthority:cls===KNOWLEDGE_CLASSES.LEGAL_REFERENCE
        ? "authority_must_be_independently_classified_and_verified"
        : "not_a_primary_law_claim",
      userFacing:cls===KNOWLEDGE_CLASSES.USER_GUIDE
        ? "secondary_authorial_material_human_review_required"
        : "not_applicable",
      modelFallback:"never_silently_replace_missing_native_support_with_general_model_knowledge"
    }),
    notes:notes==null ? null : String(notes)
  });
}

export function knowledgeCorpusAnswerPolicy({nativeSupport=false,externalResearchAuthorized=false}={}){
  if(nativeSupport){
    return Object.freeze({
      route:"native_corpus",
      label:"AI Advokat corpus",
      allowSynthesis:true,
      externalResearch:false
    });
  }
  if(externalResearchAuthorized){
    return Object.freeze({
      route:"external_research_separate",
      label:"External legal research",
      allowSynthesis:true,
      externalResearch:true
    });
  }
  return Object.freeze({
    route:"corpus_not_supported",
    label:"AI Advokat corpus",
    allowSynthesis:false,
    externalResearch:false,
    requiredMessage:"AI Advokat corpus does not confirm this proposition."
  });
}
