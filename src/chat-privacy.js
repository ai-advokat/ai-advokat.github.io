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


const LOCAL_REDACTION_RULES=Object.freeze([
  ["national_id_with_label",/(?:ЕМБГ|EMBG|матичен\s+број)\s*[:#-]?\s*(?:\d[\s./-]*){13}/giu,"личен идентификатор [МАСКИРАН]"],
  ["national_id_number",/(?<!\d)\d{13}(?!\d)/gu,"[МАСКИРАН ЛИЧЕН ИДЕНТИФИКАТОР]"],
  ["national_id_label",/(?:ЕМБГ|EMBG|матичен\s+број)/giu,"личен идентификатор"],
  ["identity_document",/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)\s*[:#-]?\s*[A-ZА-Я0-9/-]{3,30}/giu,"личен документ [МАСКИРАН БРОЈ]"],
  ["email",/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu,"[МАСКИРАНА Е-ПОШТА]"],
  ["phone",/(?<!\d)(?:\+?389|0)\s*7\d(?:[\s/-]*\d){6,7}(?!\d)/gu,"[МАСКИРАН ТЕЛЕФОН]"],
  ["street_address",/(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*\d+/giu,"[МАСКИРАНА АДРЕСА]"]
]);

export function redactConfidentialCasePrompt(value){
  const original=String(value??"").normalize("NFKC");
  let text=original;
  const redactions=[];
  for(const [reason,pattern,replacement] of LOCAL_REDACTION_RULES){
    pattern.lastIndex=0;
    if(pattern.test(text)){
      pattern.lastIndex=0;
      text=text.replace(pattern,replacement);
      redactions.push(reason);
    }
  }
  text=text.replace(/[ \t]{2,}/gu," ").trim();
  const post=detectConfidentialCasePrompt(text);
  return Object.freeze({
    text,
    changed:text!==original.trim(),
    redactions:Object.freeze([...new Set(redactions)]),
    safeToSend:!post.confidential,
    remainingReasons:post.reasons
  });
}
