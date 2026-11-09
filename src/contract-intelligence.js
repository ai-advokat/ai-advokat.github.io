// AI Advokat · AI CONTRACT v2
// Deterministic browser-safe contract review. No automatic legal validity finding, acceptance, signing or submission.
export const CONTRACT_INTELLIGENCE_VERSION="2.0.0";
export const DPRO_BASELINE_VERSION="DPRO-14R";

const CLAUSES=Object.freeze([
  ["termination","Раскинување / отказ",/(раскин|отказ|termination|terminate|cancellation|cancel)/iu],
  ["renewal","Обнова / продолжување",/(автоматск[ао]?\s+обнов|продолжувањ|renewal|auto.?renew)/iu],
  ["assignment","Отстапување / пренос",/(отстапувањ|пренос на (?:прав|договор)|assignment|assign)/iu],
  ["change_control","Промена на контрола",/(промена на контрол|change of control)/iu],
  ["governing_law","Меродавно право",/(меродавно право|применливо право|governing law|applicable law)/iu],
  ["jurisdiction","Надлежност / форум",/(надлежен суд|судска надлежност|jurisdiction|exclusive forum|competent court)/iu],
  ["confidentiality","Доверливост",/(доверливост|доверливи информации|confidentiality|confidential information)/iu],
  ["liability","Одговорност",/(ограничувањ[еа] на одговорност|одговорност за штета|limitation of liability|liability)/iu],
  ["indemnity","Обештетување / indemnity",/(обештетувањ|надомест на штета|indemnif|hold harmless)/iu],
  ["payment","Плаќање",/(плаќањ|надоместок|рок за плаќање|payment|fee|invoice)/iu],
  ["force_majeure","Виша сила",/(виша сила|force majeure)/iu],
  ["data_protection","Лични податоци",/(лични податоци|заштита на податоци|gdpr|data protection|personal data)/iu],
  ["non_compete","Неконкуренција",/(неконкуренц|забрана на конкуренц|non.?compete|noncompetition)/iu],
  ["ip","Интелектуална сопственост",/(интелектуална сопственост|авторски права|industrial property|intellectual property|copyright)/iu]
]);

export const DPRO_MODEL_PROFILES=Object.freeze([
  Object.freeze({id:"nda",label:"Доверливост (NDA)",findings:10,severity:Object.freeze({HIGH:2,MEDIUM:7,LOW:1})}),
  Object.freeze({id:"cooperation",label:"Деловна соработка",findings:14,severity:Object.freeze({HIGH:7,MEDIUM:6,LOW:1})}),
  Object.freeze({id:"services",label:"Вршење услуги",findings:8,severity:Object.freeze({HIGH:6,MEDIUM:2,LOW:0})}),
  Object.freeze({id:"lease",label:"Закуп (стан / деловен)",findings:10,severity:Object.freeze({HIGH:6,MEDIUM:4,LOW:0})}),
  Object.freeze({id:"loan",label:"Заем",findings:4,severity:Object.freeze({HIGH:3,MEDIUM:1,LOW:0})}),
  Object.freeze({id:"debt",label:"Регулирање долг",findings:4,severity:Object.freeze({HIGH:4,MEDIUM:0,LOW:0})})
]);

function clean(v,max=200000){
  if(typeof v!=="string") throw new TypeError("contract_text_required");
  const s=v.normalize("NFKC").trim();
  if(!s) throw new TypeError("contract_text_required");
  if(s.length>max) throw new TypeError("contract_text_too_long");
  return s;
}
function snippet(text,index,radius=150){
  return text.slice(Math.max(0,index-radius),Math.min(text.length,index+radius)).replace(/\s+/g," ").trim();
}
function profile(model){
  return DPRO_MODEL_PROFILES.find(x=>x.id===String(model||""))||null;
}
export function analyzeContractText({text,documentName="contract",model=""}={}){
  const body=clean(text);
  const hits=[];
  for(const [id,label,re] of CLAUSES){
    const m=re.exec(body);
    hits.push(Object.freeze({
      clauseId:id,label,
      found:Boolean(m),
      firstMatch:m?String(m[0]):null,
      locator:m?m.index:null,
      snippet:m?snippet(body,m.index):null,
      status:m?"detected_for_review":"not_detected_not_proof_of_absence"
    }));
  }
  const dpro=profile(model);
  return Object.freeze({
    version:CONTRACT_INTELLIGENCE_VERSION,
    baseline:DPRO_BASELINE_VERSION,
    documentName:String(documentName||"contract").slice(0,180),
    model:dpro?.id||null,
    reviewedCharacters:body.length,
    clauses:Object.freeze(hits),
    foundCount:hits.filter(x=>x.found).length,
    archivedDproRiskBaseline:dpro?Object.freeze({
      findings:dpro.findings,
      severity:dpro.severity,
      legalValidation:"HOLD",
      professionalSignoff:false,
      inference:"archive_baseline_not_live_legal_conclusion"
    }):null,
    humanGateRequired:true,
    legalEffectDetermined:false,
    negotiationAction:"forbidden",
    automaticSigning:false,
    automaticSubmission:false
  });
}
export function compareToPlaybook(analysis,{requiredClauses=[]}={}){
  if(!analysis||analysis.version!==CONTRACT_INTELLIGENCE_VERSION) throw new TypeError("contract_analysis_required");
  const req=[...new Set(requiredClauses.map(String))].filter(id=>CLAUSES.some(x=>x[0]===id));
  const missing=req.filter(id=>!analysis.clauses.find(c=>c.clauseId===id)?.found);
  return Object.freeze({
    requiredClauses:Object.freeze(req),
    missingOrNotDetected:Object.freeze(missing),
    readyForLawyerReview:true,
    automaticAcceptance:false,
    humanGateRequired:true,
    note:"Not detected is not proof of legal absence."
  });
}
export function buildContractReviewPackage(analysis,{requiredClauses=[]}={}){
  const playbook=compareToPlaybook(analysis,{requiredClauses});
  return Object.freeze({
    schema:"ai-advokat.ai-contract.review.v1",
    generatedAt:new Date().toISOString(),
    analysis,
    playbook,
    governance:Object.freeze({
      sourceFirst:true,
      humanGate:true,
      legalValidation:"HOLD",
      professionalSignoff:false,
      publicChatDocumentsForbidden:true
    })
  });
}
export const CONTRACT_CLAUSE_CATALOG=Object.freeze(CLAUSES.map(([id,label])=>Object.freeze({id,label})));
