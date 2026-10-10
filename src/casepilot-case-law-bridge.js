// AI Advokat CasePilot governed case-law bridge v1.
// Converts already-reviewed official case-law records into CasePilot research cards.
// It does not alter case-law authority, invent citations, or infer a client-favourable
// role from outcome alone.

export const CASEPILOT_CASE_LAW_BRIDGE_VERSION="1.0.0";
export const CASEPILOT_CASE_LAW_ROLES=Object.freeze([
  "supporting",
  "adverse",
  "distinguishing",
  "neutral"
]);

function clean(value,max=1400){
  if(value===undefined||value===null) return null;
  const v=String(value).normalize("NFKC").trim();
  return v ? v.slice(0,max) : null;
}

function reviewed(value){
  return ["approved","reviewed"].includes(String(value||"").toLowerCase());
}

function normalizeRole(value){
  const v=String(value||"neutral").toLowerCase();
  return CASEPILOT_CASE_LAW_ROLES.includes(v) ? v : "neutral";
}

export function caseLawRecordEligible(record){
  if(!record||typeof record!=="object") return false;
  if(String(record.source_status||"")!=="official") return false;
  if(!reviewed(record.human_review_status)) return false;
  if(!reviewed(record.authority_review_status)) return false;
  const url=record.source_url||record.registry_source_url;
  return typeof url==="string" && /^https:///i.test(url);
}

export function toCasePilotAuthorityCard(record,{role=null,roleReason=null}={}){
  if(!caseLawRecordEligible(record)) throw new TypeError("casepilot_case_law_not_eligible");
  const sourceUrl=record.source_url||record.registry_source_url;
  const normalizedRole=role===null ? normalizeRole(record.outcome_side) : normalizeRole(role);
  return Object.freeze({
    id:"CASELAW-"+String(record.id),
    caseLawId:Number(record.id),
    caseTitle:clean(record.case_title,320),
    court:clean(record.court,240),
    caseNumber:clean(record.case_number,120),
    jurisdiction:clean(record.jurisdiction,40),
    courtLevel:clean(record.court_level,80),
    decisionType:clean(record.decision_type,80),
    decisionDate:clean(record.decision_date,40),
    finalityStatus:clean(record.finality_status,80),
    precedentialWeight:clean(record.precedential_weight,80),
    role:normalizedRole,
    roleReason:clean(roleReason,1200),
    legalIssues:clean(record.legal_issue_keys,1600),
    domesticArticles:clean(record.domestic_articles,900),
    conventionArticles:clean(record.convention_articles,900),
    holding:clean(record.reviewed_holdings,1800),
    outcomeSummary:clean(record.outcome_summary,1200),
    reasoningSummary:clean(record.reasoning_summary,1800),
    sourceUrl,
    humanReviewStatus:String(record.human_review_status),
    authorityReviewStatus:String(record.authority_review_status),
    sourceClass:"official_reviewed_case_law",
    humanGateRequired:true
  });
}

export function buildCaseLawComparison(records,{roleAssignments={}}={}){
  if(!Array.isArray(records)) throw new TypeError("casepilot_case_law_array_required");
  const cards=[];
  const rejected=[];
  for(const record of records){
    if(!caseLawRecordEligible(record)){
      rejected.push(Object.freeze({
        caseLawId:record?.id??null,
        reason:"not_official_and_dual_reviewed"
      }));
      continue;
    }
    const assignment=roleAssignments[String(record.id)]||null;
    cards.push(toCasePilotAuthorityCard(record,{
      // A reviewed outcome is not a lawyer's issue-specific role classification.
      // Until an explicit assignment exists, every authority remains neutral.
      role:assignment?.role??"neutral",
      roleReason:assignment?.reason??null
    }));
  }

  const byRole=Object.fromEntries(CASEPILOT_CASE_LAW_ROLES.map(role=>[
    role,
    Object.freeze(cards.filter(card=>card.role===role))
  ]));

  return Object.freeze({
    version:CASEPILOT_CASE_LAW_BRIDGE_VERSION,
    cards:Object.freeze(cards),
    byRole:Object.freeze(byRole),
    rejected:Object.freeze(rejected),
    safeguards:Object.freeze({
      officialSourcesOnly:true,
      dualHumanReviewRequired:true,
      favourableOutcomeDoesNotImplySupportingRole:true,
      adverseAuthorityMustNotBeHidden:true,
      humanGateRequired:true
    })
  });
}
