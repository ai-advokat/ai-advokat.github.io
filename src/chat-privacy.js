// Public-chat privacy routing for AI Advokat.
// Detects concrete confidential case material before any GPT/provider execution.
// It returns only coarse reason codes and never persists or echoes matched values.

const HARD_PATTERNS=Object.freeze([
  ["national_id_label",/(?:ЕМБГ|EMBG|матичен\s+број)/iu],
  ["national_id_number",/(?<!\d)\d{13}(?!\d)/u],
  ["identity_document",/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)/iu]
]);

const CASE_PATTERNS=Object.freeze([
  /предмет\s*:/iu,
  /оставинск[\p{L}-]*/iu,
  /тужб[\p{L}-]*/iu,
  /судск(?:и|а)\s+предмет/iu,
  /имотен\s+лист/iu,
  /катастарск(?:а|и|иот)\s+(?:парцела|план|лист|имот)/iu,
  /КП\s*\.?\s*\d+/iu,
  /ИЛ\s*\.?\s*\d+/iu,
  /ОВ\s*\.?\s*бр/iu
]);

const CONTACT_PATTERNS=Object.freeze([
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /(?<!\d)(?:\+?389|0)\s*7\d(?:[\s/-]*\d){6,7}(?!\d)/u,
  /(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*\d+/iu
]);

export function detectConfidentialCasePrompt(value){
  const text=String(value??"").normalize("NFKC");
  if(!text.trim()) return Object.freeze({confidential:false,reasons:Object.freeze([]),score:0});

  const reasons=[];
  let score=0;

  for(const [reason,pattern] of HARD_PATTERNS){
    if(pattern.test(text)){reasons.push(reason);score+=4;}
  }

  let caseSignals=0;
  for(const pattern of CASE_PATTERNS){
    if(pattern.test(text)) caseSignals++;
  }
  if(caseSignals){
    reasons.push("concrete_case_details");
    score+=Math.min(4,caseSignals);
  }

  let contactSignals=0;
  for(const pattern of CONTACT_PATTERNS){
    if(pattern.test(text)) contactSignals++;
  }
  if(contactSignals){
    reasons.push("personal_contact_details");
    score+=Math.min(3,contactSignals*2);
  }

  const longNarrative=text.length>=1200;
  if(longNarrative && caseSignals>=2){
    reasons.push("long_case_narrative");
    score+=2;
  }

  const hard=reasons.some(r=>["national_id_label","national_id_number","identity_document"].includes(r));
  const confidential=hard || (caseSignals>=2 && contactSignals>=1) || (longNarrative && caseSignals>=3);

  return Object.freeze({
    confidential,
    reasons:Object.freeze([...new Set(reasons)]),
    score
  });
}


/**
 * Stronger document-body detector used only after trusted server-side text
 * extraction. It looks for actual values, not merely template words, so
 * professional guides are not blocked just because they mention "пасош" or
 * "матичен број" as concepts.
 */
export function detectConfidentialDocumentText(value){
  const text=String(value??"").normalize("NFKC");
  if(!text.trim()) return Object.freeze({confidential:false,reasons:Object.freeze([]),score:0});

  const reasons=[];
  const actualValuePatterns=Object.freeze([
    ["national_id_number",/(?<!\d)\d{13}(?!\d)/u],
    ["email_address",/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu],
    ["phone_number",/(?<!\d)(?:\+?389|0)\s*7\d(?:[\s/-]*\d){6,7}(?!\d)/u],
    ["postal_address",/(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*\d+/iu],
    ["identity_document_number",/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)\s*[:#-]?\s*[A-ZА-ЯЃЌЉЊЏЅЈ0-9]{5,20}/iu],
    ["bank_account",/(?:трансакциск[ао]\s+сметк[ааи]|IBAN)\s*[:#-]?\s*[A-Z]{0,2}\d[\d\s-]{10,32}/iu]
  ]);

  for(const [reason,pattern] of actualValuePatterns){
    if(pattern.test(text)) reasons.push(reason);
  }

  const namedCase=/\b(?:К|П|У|КП|КОК)\.?\s*бр\.?\s*\d{1,8}\s*\/\s*\d{2,4}/iu.test(text);
  const personLabel=/(?:обвинет(?:иот|ата)?|тужител(?:от|ката)?|тужен(?:иот|ата)?|оштетен(?:иот|ата)?|барател(?:от|ката)?)\s*[:\-]\s*[\p{L}][\p{L}\s.'-]{3,80}/iu.test(text);
  if(namedCase && personLabel) reasons.push("named_case_record");

  return Object.freeze({
    confidential:reasons.length>0,
    reasons:Object.freeze([...new Set(reasons)]),
    score:reasons.length
  });
}
