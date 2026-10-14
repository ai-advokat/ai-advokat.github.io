// Public-chat privacy routing for AI Advokat.
// Detects concrete confidential case material before any GPT/provider execution.
// It returns only coarse reason codes and never persists or echoes matched values.

const HARD_PATTERNS=Object.freeze([
  ["national_id_label",/(?:ЕМБГ|EMBG|матичен\s+број)/iu],
  ["national_id_number",/(?<!\d)\d{13}(?!\d)/u],
  ["identity_document",/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)/iu]
]);

const CASE_PATTERNS=Object.freeze([
  /\bпредмет\s*:/iu,
  /\bоставинск(?:а|ата|ата\s+постапка)?\b/iu,
  /\bтужб(?:а|ата|ата\s+е|ата\s+ја)\b/iu,
  /\bсудск(?:и|а)\s+предмет\b/iu,
  /\bимотен\s+лист\b/iu,
  /\bкатастарск(?:а|и|иот)\s+(?:парцела|план|лист|имот)/iu,
  /\bКП\s*\.?\s*\d+/iu,
  /\bИЛ\s*\.?\s*\d+/iu,
  /\bОВ\s*\.?\s*бр/iu
]);

const CONTACT_PATTERNS=Object.freeze([
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /(?<!\d)(?:\+?389|0)\s*7\d(?:[\s/-]*\d){6,7}(?!\d)/u,
  /\b(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*\d+/iu
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
