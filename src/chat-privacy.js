// Browser- and Worker-safe privacy routing for AI Advokat.
// Kept behaviorally identical to assets/chat-privacy-browser.js.
// This file is intentionally self-contained because security test harnesses
// isolate src/ when loading the Worker, while legacy cached browsers may also
// request this exact public compatibility path.

const HARD_PATTERNS=Object.freeze([
  ["national_id_label",/(?:ЕМБГ|EMBG|матичен\s+број)/i],
  ["national_id_number",/(^|[^0-9])[0-9]{13}([^0-9]|$)/],
  ["identity_document",/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)/i]
]);

const CASE_PATTERNS=Object.freeze([
  /предмет\s*:/i,
  /оставинск/i,
  /тужб/i,
  /судск(?:и|а)\s+предмет/i,
  /имотен\s+лист/i,
  /катастарск(?:а|и|иот)\s+(?:парцела|план|лист|имот)/i,
  /КП\s*\.?\s*[0-9]+/i,
  /ИЛ\s*\.?\s*[0-9]+/i,
  /ОВ\s*\.?\s*бр/i
]);

const CONTACT_PATTERNS=Object.freeze([
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|[^0-9])(?:\+?389|0)\s*7[0-9](?:[\s/-]*[0-9]){6,7}(?:[^0-9]|$)/,
  /(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*[0-9]+/i
]);

export function detectConfidentialCasePrompt(value){
  const text=String(value??"").normalize("NFKC");
  if(!text.trim()) return Object.freeze({confidential:false,reasons:Object.freeze([]),score:0});
  const reasons=[]; let score=0; let caseSignals=0; let contactSignals=0;
  for(const [reason,pattern] of HARD_PATTERNS){ if(pattern.test(text)){reasons.push(reason);score+=4;} }
  for(const pattern of CASE_PATTERNS){ if(pattern.test(text)) caseSignals++; }
  if(caseSignals){ reasons.push("concrete_case_details"); score+=Math.min(4,caseSignals); }
  for(const pattern of CONTACT_PATTERNS){ if(pattern.test(text)) contactSignals++; }
  if(contactSignals){ reasons.push("personal_contact_details"); score+=Math.min(3,contactSignals*2); }
  const longNarrative=text.length>=1200;
  if(longNarrative&&caseSignals>=2){ reasons.push("long_case_narrative"); score+=2; }
  const hard=reasons.some(r=>["national_id_label","national_id_number","identity_document"].includes(r));
  const confidential=hard||(caseSignals>=2&&contactSignals>=1)||(longNarrative&&caseSignals>=3);
  return Object.freeze({confidential,reasons:Object.freeze([...new Set(reasons)]),score});
}

const REDACTION_RULES=Object.freeze([
  [/(?:ЕМБГ|EMBG|матичен\s+број)\s*[:#-]?\s*(?:[0-9][\s./-]*){13}/gi,"личен идентификатор [МАСКИРАН]"],
  [/(^|[^0-9])[0-9]{13}([^0-9]|$)/g,"$1[МАСКИРАН ЛИЧЕН ИДЕНТИФИКАТОР]$2"],
  [/(?:ЕМБГ|EMBG|матичен\s+број)/gi,"личен идентификатор"],
  [/(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)\s*[:#-]?\s*[A-ZА-Я0-9/-]{3,30}/gi,"личен документ [МАСКИРАН БРОЈ]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[МАСКИРАНА Е-ПОШТА]"],
  [/(^|[^0-9])(?:\+?389|0)\s*7[0-9](?:[\s/-]*[0-9]){6,7}([^0-9]|$)/g,"$1[МАСКИРАН ТЕЛЕФОН]$2"],
  [/(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*[0-9]+/gi,"[МАСКИРАНА АДРЕСА]"]
]);

export function redactConfidentialCasePrompt(value){
  const original=String(value??"").normalize("NFKC");
  let text=original; let changed=false;
  for(const [pattern,replacement] of REDACTION_RULES){
    pattern.lastIndex=0;
    if(pattern.test(text)){ pattern.lastIndex=0; text=text.replace(pattern,replacement); changed=true; }
  }
  text=text.replace(/[ \t]{2,}/g," ").trim();
  const post=detectConfidentialCasePrompt(text);
  return Object.freeze({text,changed:changed||text!==original.trim(),redactions:Object.freeze([]),safeToSend:!post.confidential,remainingReasons:post.reasons});
}
