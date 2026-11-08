// AI Advokat Contract Intelligence v1
// Deterministic, browser-safe clause spotting. It does not determine legal validity or negotiate autonomously.
export const CONTRACT_INTELLIGENCE_VERSION="1.0.0";

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
export function analyzeContractText({text,documentName="contract"}={}){
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
  return Object.freeze({
    version:CONTRACT_INTELLIGENCE_VERSION,
    documentName:String(documentName||"contract").slice(0,180),
    reviewedCharacters:body.length,
    clauses:Object.freeze(hits),
    foundCount:hits.filter(x=>x.found).length,
    humanGateRequired:true,
    legalEffectDetermined:false,
    negotiationAction:"forbidden"
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
    humanGateRequired:true
  });
}
export const CONTRACT_CLAUSE_CATALOG=Object.freeze(CLAUSES.map(([id,label])=>Object.freeze({id,label})));
