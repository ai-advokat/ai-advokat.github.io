// One act identity for the editor and working exports. Never relabel a
// contradictory pleading or mutate the exact bytes of a saved revision.
const ACTS=Object.freeze({
  response:Object.freeze({title:"Одговор на жалба",heading:"ОДГОВОР НА ЖАЛБА"}),
  appeal:Object.freeze({title:"Жалба",heading:"ЖАЛБА"})
});

export function caseDraftAct(draftType){
  return typeof draftType==="string" && Object.hasOwn(ACTS,draftType) ? ACTS[draftType] : null;
}

// Direct response requests must outrank the generic appeal keyword.
export function isDirectAppealResponseRequest(userText){
  const text=String(userText??"").normalize("NFKC").trim();
  return /^(?:одговор\s+на\s+жалба|odgovor\s+na\s+zalba)[.!?]?$/iu.test(text) ||
    /(?:^|[.!?\n]\s*)(?:те\s+молам\s+)?(?:подготви(?:те)?|изработи(?:те)?|напиши(?:те)?|состави(?:те)?|направи(?:те)?|изготви|podgotvi|izraboti|napishi|sostavi|napravi|izgotvi)\s+(?:(?:ми|mi)\s+)?(?:(?:работен|целосен|примерен|формален|raboten|celosen|primeren|formalen)\s+){0,2}(?:одговор\s+на\s+жалба|odgovor\s+na\s+zalba)(?=$|[^\p{L}\p{N}])/iu.test(text);
}

function headingType(line){
  const value=line.normalize("NFKC").trim().replace(/^#{1,6}\s+/u,"").replace(/^(\*\*|__)(.*?)\1$/u,"$2").trim().replace(/[.:]$/u,"").trim();
  const upper=value.toLocaleUpperCase("mk").replace(/\s+/gu," ");
  for(const [type,act] of Object.entries(ACTS)){
    if(upper===act.heading) return type;
    // Extended uppercase or Markdown headings, not ordinary narrative prose.
    if((value===value.toLocaleUpperCase("mk") || /^\s*(?:#{1,6}\s+|\*\*|__)/u.test(line)) &&
        (upper.startsWith(act.heading+" ") || upper.startsWith(act.heading+":"))) return type;
  }
  return null;
}

export function checkCaseDraftAct(text,draftType,{addMissing=false}={}){
  const value=typeof text==="string"?text:"";
  const act=caseDraftAct(draftType);
  if(!act) return {ok:true,text:value};
  if(!value.trim()) return {ok:false,error:"case_draft_instrument_heading_required",text:value};
  // Opening heading zone includes the court header and working-draft banner.
  const headings=value.split(/\r\n?|\n/u).filter(line=>line.trim()).slice(0,12).map(headingType).filter(Boolean);
  if(headings.some(type=>type!==draftType)) return {ok:false,error:"case_draft_instrument_mismatch",text:value};
  if(!headings.includes(draftType)){
    if(!addMissing) return {ok:false,error:"case_draft_instrument_heading_required",text:value};
    return {ok:true,text:act.heading+"\n\n"+value};
  }
  return {ok:true,text:value};
}

export function caseDraftExportContent(draftType,text){
  const check=checkCaseDraftAct(text,draftType);
  if(!check.ok) throw new Error(check.error);
  return {title:caseDraftAct(draftType)?.title||"Работен правен поднесок",
    sections:[{title:"Текст на поднесокот",items:[{text:check.text}]}]};
}
