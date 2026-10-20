// AI Advokat international legal-intelligence classifiers.
// Deterministic metadata classification only. No rule here may convert discovery
// metadata, translations, summaries, submissions or confidential material into
// binding legal authority.

export const INTERNATIONAL_LEGAL_CLASSIFIER_VERSION="1.0.0";
export const INTERNATIONAL_LEGAL_CLASSIFIER_SCHEMA="AI_ADVOCAT_INTERNATIONAL_LEGAL_V1";

const MK_ALIASES=Object.freeze([
  "north macedonia",
  "republic of north macedonia",
  "republic of macedonia",
  "macedonia, former yugoslav republic of",
  "former yugoslav republic of macedonia",
  "the former yugoslav republic of macedonia",
  "северна македонија",
  "република северна македонија",
  "република македонија"
]);

function clean(value=""){
  return String(value||"").normalize("NFKC").replace(/\s+/g," ").trim();
}
function lower(value=""){return clean(value).toLocaleLowerCase("en");}

export function containsNorthMacedoniaAlias(value){
  const hay=lower(value);
  return MK_ALIASES.some(alias=>hay.includes(alias));
}

export function canonicalStateIdentity(value){
  return containsNorthMacedoniaAlias(value)
    ? Object.freeze({stateId:"MK",canonicalName:"Republic of North Macedonia",matched:true,sourceLabel:clean(value)})
    : Object.freeze({stateId:null,canonicalName:null,matched:false,sourceLabel:clean(value)});
}

export function classifyIcsidCaseNumber(value){
  const raw=clean(value);
  const normalized=raw.toUpperCase().replace(/\s+/g,"");
  let regime="unknown";
  let proceedingType="unknown";
  let article54ConventionEnforcement=false;

  if(/^ARB\(AF\)\/[0-9]{2,4}\/[0-9]+$/.test(normalized)){
    regime="additional_facility";
    proceedingType="arbitration";
  }else if(/^CONC\(AF\)\/[0-9]{2,4}\/[0-9]+$/.test(normalized)){
    regime="additional_facility";
    proceedingType="conciliation";
  }else if(/^ARB\/[0-9]{2,4}\/[0-9]+$/.test(normalized)){
    regime="icsid_convention";
    proceedingType="arbitration";
    article54ConventionEnforcement=true;
  }else if(/^CONC\/[0-9]{2,4}\/[0-9]+$/.test(normalized)){
    regime="icsid_convention";
    proceedingType="conciliation";
  }

  return Object.freeze({
    raw,
    normalized,
    regime,
    proceedingType,
    article54ConventionEnforcement,
    humanReviewRequired:regime==="unknown"
  });
}

export function classifyIcsidPublishedDocument(value){
  const title=clean(value);
  const v=lower(title);
  const types=[];

  if(/\baward\b/.test(v)) types.push("award");
  if(/dissenting opinion|dissent\b/.test(v)) types.push("dissenting_opinion");
  if(/decision on annulment/.test(v)) types.push("decision_on_annulment");
  else if(/\bdecision\b/.test(v)) types.push("decision");
  if(/procedural order/.test(v)) types.push("procedural_order");
  if(/article\s+1128\s+submission|non[- ]disputing.*submission|submission of (?:the )?[a-z]/.test(v)) types.push("non_disputing_party_submission");
  else if(/claimant.*(?:submission|brief|memorial)|respondent.*(?:submission|brief|memorial)|post[- ]?hearing brief|counter[- ]?memorial|memorial/.test(v)) types.push("party_submission");
  if(/interpretation/.test(v)) types.push("interpretation");
  if(/rectification/.test(v)) types.push("rectification");
  if(/supplementary decision/.test(v)) types.push("supplementary_decision");

  const unique=[...new Set(types)];
  return Object.freeze({
    title,
    documentTypes:Object.freeze(unique),
    primaryDocumentType:unique[0]||"unclassified_published_document",
    compoundDocument:unique.length>1,
    requiresDocumentSplit:unique.length>1,
    humanReviewRequired:unique.length===0 || unique.length>1
  });
}

export function icsidLegalEffect({regime="unknown",documentType="unclassified"}={}){
  if(documentType==="dissenting_opinion"){
    return Object.freeze({effect:"separate_opinion_non_binding",article54ConventionEnforcement:false,humanReviewRequired:false});
  }
  if(["party_submission","non_disputing_party_submission"].includes(documentType)){
    return Object.freeze({effect:"party_or_third_party_submission_not_tribunal_holding",article54ConventionEnforcement:false,humanReviewRequired:false});
  }
  if(documentType==="procedural_order"){
    return Object.freeze({effect:"procedural_tribunal_act",article54ConventionEnforcement:false,humanReviewRequired:true});
  }
  if(documentType==="award" && regime==="icsid_convention"){
    return Object.freeze({effect:"binding_icsid_convention_award",article54ConventionEnforcement:true,humanReviewRequired:true});
  }
  if(documentType==="award" && regime==="additional_facility"){
    return Object.freeze({effect:"additional_facility_arbitral_award",article54ConventionEnforcement:false,humanReviewRequired:true});
  }
  if(documentType==="decision_on_annulment" && regime==="icsid_convention"){
    return Object.freeze({effect:"icsid_convention_post_award_remedy_decision",article54ConventionEnforcement:true,humanReviewRequired:true});
  }
  return Object.freeze({effect:"legal_effect_review_required",article54ConventionEnforcement:false,humanReviewRequired:true});
}

export function classifyOhchrMechanism(value){
  const text=lower(typeof value==="string"?value:JSON.stringify(value||{}));
  if(/universal periodic review|\bupr\b|a\/hrc\/.+\/\d+/.test(text)) return "upr";
  if(/special rapporteur|working group|special procedures|country visit/.test(text)) return "special_procedures";
  if(/committee against torture|\bcat\//.test(text)) return "treaty_body_cat";
  if(/human rights committee|\bccpr\//.test(text)) return "treaty_body_ccpr";
  if(/committee on the elimination of discrimination against women|\bcedaw\//.test(text)) return "treaty_body_cedaw";
  if(/committee on the rights of the child|\bcrc\//.test(text)) return "treaty_body_crc";
  if(/committee on the rights of persons with disabilities|\bcrpd\//.test(text)) return "treaty_body_crpd";
  if(/committee on economic, social and cultural rights|\be\/c\.12\//.test(text)) return "treaty_body_cescr";
  if(/committee on the elimination of racial discrimination|\bcerd\//.test(text)) return "treaty_body_cerd";
  return "unclassified_ohchr_mechanism";
}

export function classifyInternationalDocument(textInput){
  const text=clean(textInput);
  const v=lower(text);
  const head=lower(text.slice(0,16000));

  let documentSubtype="unknown";
  let route="manual_review";
  let authorityClass="unresolved";
  let privacyRisk="normal";
  let sourceBindingRequired=true;

  const echr=/european court of human rights|европскиот суд за човекови права|hudoc/.test(v);
  const application=/application\s+(?:no\.?\s*)?\d{1,6}\s*\/\s*\d{2,4}|апликаци(?:ја|јата).*\d{1,6}\s*\/\s*\d{2,4}/.test(v);

  if(echr && application && /\bjudgment\b|\bпресуда\b/.test(v)){
    documentSubtype="echr_judgment";
    route="case_law";
    authorityClass="international_case_law";
  }else if(echr && application && /\bdecision\b|\bодлука\b/.test(v)){
    documentSubtype="echr_decision";
    route="case_law";
    authorityClass="international_case_law";
  }else if(/билтен/.test(v) && /врховен суд/.test(v) && /судск(?:а|ата) практик/.test(v)){
    documentSubtype="official_case_law_bulletin";
    route="review_only";
    authorityClass="official_case_law_publication";
  }else if(/регистар/.test(v) && /(?:гж|тсж)/.test(v) && /(?:тужбен|одлук)/.test(v)){
    documentSubtype="case_law_discovery_register";
    route="review_only";
    authorityClass="official_or_institutional_discovery_pending_source_binding";
  }else if(/месечен извештај/.test(v) && /човековите права|human rights/.test(v)){
    documentSubtype="human_rights_monitoring_report";
    route="review_only";
    authorityClass="secondary_non_binding";
    privacyRisk="elevated";
  }else if(/concluding observations|заклучни согледувања|завршни согледувања/.test(v) && /united nations|обединетите нации|committee/.test(v)){
    documentSubtype="ohchr_treaty_body_output";
    route="review_only";
    authorityClass="un_human_rights_mechanism_output";
  }else if(/icsid/.test(head) && /additional facility\s+rules and regulations/.test(head)){
    documentSubtype="icsid_additional_facility_rules";
    route="review_only";
    authorityClass="official_international_procedural_rules";
  }else if(/icsid/.test(head) && /mediation rules and regulations/.test(head)){
    documentSubtype="icsid_mediation_rules";
    route="review_only";
    authorityClass="official_international_procedural_rules";
  }else if(/icsid/.test(head) && /fact-finding\s+rules and regulations/.test(head)){
    documentSubtype="icsid_fact_finding_rules";
    route="review_only";
    authorityClass="official_international_procedural_rules";
  }else if(/icsid/.test(head) && (/convention,\s*regulations\s+and\s+rules/.test(head) || /convention on the settlement of investment disputes/.test(head))){
    documentSubtype="icsid_convention_or_rules";
    route="review_only";
    authorityClass="official_international_treaty_or_procedural_rules";
  }

  return Object.freeze({
    schemaVersion:INTERNATIONAL_LEGAL_CLASSIFIER_SCHEMA,
    classifierVersion:INTERNATIONAL_LEGAL_CLASSIFIER_VERSION,
    documentSubtype,
    route,
    authorityClass,
    privacyRisk,
    sourceBindingRequired,
    humanGateRequired:true,
    generatedOfficialIdentifier:false
  });
}
