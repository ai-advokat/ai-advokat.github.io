// AI Advokat Case-Law Evidence Gates v1
// Canonicalises the unique review controls from the Zoran/Paragraf FAST/F0 archive.
// Evidence status is never authority status. Promotion remains Human-Gated.

export const CASE_LAW_EVIDENCE_GATES_VERSION="AI_ADVOCAT_CASE_LAW_EVIDENCE_GATES_V1";

const YES=new Set(["yes","true","1","да","approved","reviewed","verified","pass"]);
const NO=new Set(["no","false","0","не","pending","not_verified","not reviewed","hold","locked",""]);
const REVIEWED=new Set(["approved","reviewed"]);

function s(v){return String(v??"").normalize("NFKC").trim();}
function low(v){return s(v).toLocaleLowerCase("mk");}
function yes(v){return v===true || YES.has(low(v));}
function reviewed(v){return REVIEWED.has(low(v));}
function sha(v){return /^[a-f0-9]{64}$/i.test(s(v));}
function https(v){try{const u=new URL(s(v));return u.protocol==="https:";}catch{return false;}}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function arr(v){return Array.isArray(v)?v:[];}
function flagList(v){
  if(Array.isArray(v)) return Object.freeze(v.map(s).filter(Boolean));
  return Object.freeze(s(v).split(/[|;,]/).map(x=>x.trim()).filter(Boolean));
}

export function assessPublicationBoundary(record={}){
  const startPage=num(record.start_page??record.source_page_start??record.proposed_publication_unit_start_page??record.heading_page);
  const endPage=num(record.end_page??record.source_page_end??record.proposed_publication_unit_end_page);
  const startY=num(record.start_y??record.proposed_publication_unit_start_y_pt??record.heading_y_current_proposed_pt??record.heading_y);
  const endY=num(record.end_y??record.proposed_publication_unit_end_y_pt??record.end_y_current_proposed_pt??record.attribution_end_y);
  const sourceSha=s(record.source_sha256??record.source_pdf_sha256);
  const first=yes(record.start_boundary_independent_signoff??record.boundary_reviewer_1_approved??record.human_boundary_confirmed);
  const second=yes(record.end_boundary_independent_signoff??record.boundary_reviewer_2_approved);
  const attribution=yes(record.attribution_independent_signoff??record.attribution_verified);
  const completeUnit=yes(record.complete_unit_accepted??record.integral_decision_verified);
  const warnings=flagList(record.warning_flags??record.f02u_warning_flags??record.previous_flags);
  const disposition=s(record.warning_disposition??record.f02v_warning_disposition??record.specific_flag_disposition);
  const unresolvedWarning=warnings.length>0 && !/NO_PRIOR|EXPLAINED|RESOLVED|ACCEPTED/i.test(disposition);
  const locatorPresent=sha(sourceSha)&&startPage!==null&&endPage!==null&&startPage<=endPage;
  const coordinatesPresent=startY!==null&&endY!==null;
  const dualBoundaryVerified=first&&second;
  const ready=locatorPresent&&coordinatesPresent&&dualBoundaryVerified&&attribution&&completeUnit&&!unresolvedWarning;
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    locatorPresent,coordinatesPresent,dualBoundaryVerified,attributionVerified:attribution,
    completeUnitVerified:completeUnit,warnings,warningDisposition:disposition||null,
    unresolvedWarning,ready,
    status:ready?"BOUNDARY_VERIFIED":"BOUNDARY_REVIEW_REQUIRED",
    humanGateRequired:true
  });
}

export function assessTemporalArticleGate(record={}){
  const articleTextVerified=yes(record.article_text_verified??record.normative_text_verified);
  const authenticHistoricalLaw=yes(record.historical_authentic_gazette??record.historical_law_verified);
  const transitionalRulesVerified=yes(record.transitional_rules??record.transitional_rules_verified);
  const currentApplicabilityVerified=yes(record.current_applicability??record.temporal_applicability_verified);
  const contraryAuthorityChecked=yes(record.contrary_case_law??record.contrary_authority_checked);
  const legalReviewed=yes(record.legal_verified??record.legal_verification) || reviewed(record.legal_review_status);
  const citedArticles=s(record.domestic_articles??record.articles_in_source??record.potential_articles);
  const hasArticleClaims=Boolean(citedArticles);
  const historicalRequired=yes(record.historical_required) || /histor|стар|преод/i.test(s(record.temporal_status??record.limitation));
  const temporalReady=currentApplicabilityVerified && (!historicalRequired || (authenticHistoricalLaw&&transitionalRulesVerified));
  const articleReady=!hasArticleClaims || articleTextVerified;
  const ready=articleReady&&temporalReady&&contraryAuthorityChecked&&legalReviewed;
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    hasArticleClaims,articleTextVerified,historicalRequired,authenticHistoricalLaw,
    transitionalRulesVerified,currentApplicabilityVerified,contraryAuthorityChecked,
    legalReviewed,ready,
    status:ready?"LEGAL_TEMPORAL_VERIFIED":"HOLD_PENDING_ARTICLE_TEMPORAL_REVIEW",
    humanGateRequired:true
  });
}

export function assessSourceGate(record={}){
  const sourceUrl=s(record.source_url??record.registry_source_url);
  const sourceSha=s(record.source_sha256??record.source_pdf_sha256);
  const official=String(record.source_status||record.source_class||"").includes("official") || yes(record.official_source);
  const binding=yes(record.official_binding_verified);
  const remoteHash=yes(record.remote_content_hash_verified);
  const human=reviewed(record.human_review_status??record.binding_review_status);
  const ready=official&&https(sourceUrl)&&sha(sourceSha)&&binding&&remoteHash&&human;
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    officialSource:official,httpsSource:https(sourceUrl),sha256Present:sha(sourceSha),
    officialBindingVerified:binding,remoteHashVerified:remoteHash,humanReviewed:human,
    ready,status:ready?"SOURCE_BOUND_VERIFIED":"STAGED_NEEDS_SOURCE_MATCH",
    humanGateRequired:true
  });
}

export function assessEchrComparisonGate(record={}){
  const hasHudoc=https(record.hudocUrl??record.hudoc_url);
  const researched=/RESEARCHED_SOURCE_MATCH/i.test(s(record.comparisonStatus??record.comparison_status));
  const hudocMetadataVerified=yes(record.hudocMetadataVerified??record.hudoc_metadata_verified);
  const domesticTemporalVerified=yes(record.historicalDomesticLawVerified??record.historical_domestic_law_verified);
  const independentReview=yes(record.independentComparativeLegalReview??record.independent_comparative_legal_review);
  const humanVerified=yes(record.humanVerified??record.human_verified);
  const ready=hasHudoc&&researched&&hudocMetadataVerified&&domesticTemporalVerified&&independentReview&&humanVerified;
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    hasHudoc,researched,hudocMetadataVerified,domesticTemporalVerified,
    independentReview,humanVerified,ready,
    status:ready?"ECHR_COMPARISON_VERIFIED":"ECHR_RESEARCH_HOLD",
    authorityPromotion:false,humanGateRequired:true
  });
}

export function assessCanonicalCaseLawState(record={}){
  const source=assessSourceGate(record);
  const boundary=assessPublicationBoundary(record);
  const temporal=assessTemporalArticleGate(record);
  const authorityReview=reviewed(record.authority_review_status);
  const holdingVerified=yes(record.holding_verified) || reviewed(record.holding_review_status);
  const publicationApproved=yes(record.publication_approved);
  const humanGateApproved=yes(record.human_gate_approved);
  const reviewedAuthorityCandidate=source.ready&&boundary.ready&&temporal.ready&&authorityReview&&holdingVerified;
  const productionCitable=reviewedAuthorityCandidate&&publicationApproved&&humanGateApproved;
  let state="STAGED_NEEDS_SOURCE_MATCH";
  if(source.ready) state="SOURCE_BOUND_REVIEW_REQUIRED";
  if(source.ready&&boundary.ready) state="BOUNDARY_VERIFIED_LEGAL_REVIEW_REQUIRED";
  if(source.ready&&boundary.ready&&temporal.ready) state="LEGAL_TEMPORAL_VERIFIED_AUTHORITY_REVIEW_REQUIRED";
  if(reviewedAuthorityCandidate) state="REVIEWED_AUTHORITY_CANDIDATE";
  if(productionCitable) state="PRODUCTION_CITABLE_AUTHORITY";
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    state,source,boundary,temporal,
    authorityReviewApproved:authorityReview,holdingVerified,
    publicationApproved,humanGateApproved,
    reviewedAuthorityCandidate,productionCitable,
    discoveryOnly:!productionCitable,
    algorithmScoringAllowed:reviewedAuthorityCandidate,
    humanGateRequired:true
  });
}

export function caseLawGateSummary(records=[]){
  const rows=arr(records).map(assessCanonicalCaseLawState);
  const count=state=>rows.filter(x=>x.state===state).length;
  return Object.freeze({
    version:CASE_LAW_EVIDENCE_GATES_VERSION,
    total:rows.length,
    stagedNeedsSourceMatch:count("STAGED_NEEDS_SOURCE_MATCH"),
    sourceBoundReviewRequired:count("SOURCE_BOUND_REVIEW_REQUIRED"),
    boundaryVerifiedLegalReviewRequired:count("BOUNDARY_VERIFIED_LEGAL_REVIEW_REQUIRED"),
    legalTemporalVerifiedAuthorityReviewRequired:count("LEGAL_TEMPORAL_VERIFIED_AUTHORITY_REVIEW_REQUIRED"),
    reviewedAuthorityCandidates:count("REVIEWED_AUTHORITY_CANDIDATE"),
    productionCitable:count("PRODUCTION_CITABLE_AUTHORITY"),
    humanGateRequired:true
  });
}
