// Final user-facing response quality helpers.
// Deterministic postflight only: no source expansion, no new legal reasoning.

const FORMAL_DRAFT_RE=/(?:опомена|opomena|ту[жѓ]б|жалб|приговор|поднесок|поднес|барање|договор|полномош|правно\s+мислење|tuzb|zalb|prigovor|podnes|baranje|dogovor|polnomos)/iu;

const CRIMINAL_EVENT_DRAFT_RE=/(?:кражб|разбојништ|измам|фалсифик|напад|закан|насил|убиств|поткуп|проневер|кривичн(?:о|а)\s+дел)/iu;
const CIVIL_REMEDY_DRAFT_RE=/(?:надомест|штет|исплат|враќањ|сопственост|долг|побарувањ|неосновано\s+збогатување)/iu;

export function hasProceduralInstrumentMismatch(userText){
  const text=String(userText||"").normalize("NFKC");
  const lawsuitRequested=/(?:ту[жѓ]б|tuzb)/iu.test(text);
  return lawsuitRequested
    && CRIMINAL_EVENT_DRAFT_RE.test(text)
    && !CIVIL_REMEDY_DRAFT_RE.test(text);
}

export function isFormalLegalDraftRequest(userText){
  return FORMAL_DRAFT_RE.test(String(userText||"").normalize("NFKC"));
}

export function requestedFormalDraftHeading(userText){
  const text=String(userText||"").normalize("NFKC").toLocaleLowerCase("mk");
  const candidates=[
    [/(?:опомена|opomena)(?:\s+пред\s+(?:поведување\s+)?(?:тужб|tuzb))?/u,"ОПОМЕНА ПРЕД ПОВЕДУВАЊЕ СУДСКА ПОСТАПКА"],
    [/(?:ту[жѓ]б|tuzb)/u,hasProceduralInstrumentMismatch(text)
      ? "РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА"
      : "ТУЖБА"],
    [/(?:жалб|zalb)/u,"ЖАЛБА"],
    [/(?:приговор|prigovor)/u,"ПРИГОВОР"],
    [/(?:поднесок|поднес|podnes)/u,"ПОДНЕСОК"],
    [/(?:барање|baranje)/u,"БАРАЊЕ"],
    [/(?:полномош|polnomos)/u,"ПОЛНОМОШНО"],
    [/правно\s+мислење/u,"ПРАВНО МИСЛЕЊЕ"],
    [/(?:договор|dogovor)/u,"ДОГОВОР"]
  ];
  for(const [pattern,label] of candidates){
    if(pattern.test(text)) return label;
  }
  return null;
}

export function ensureRequestedFormalDraftHeading(text,{userText=""}={}){
  const clean=String(text||"").trim();
  const heading=requestedFormalDraftHeading(userText);
  if(!heading || !clean) return clean;
  const firstLine=clean.split(/\n+/u).find(line=>String(line||"").trim())?.trim()||"";
  if(firstLine.toLocaleUpperCase("mk").startsWith(heading)) return clean;
  return heading+"\n\n"+clean;
}

function markdownTableRowToText(line){
  const cells=String(line||"").trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim()).filter(Boolean);
  if(!cells.length) return "";
  if(cells.length===1) return cells[0];
  if(cells.length===2) return cells[0]+": "+cells[1];
  return cells.join(" — ");
}

export function cleanFormalDraftForExport(text){
  const lines=String(text||"").normalize("NFKC").replace(/\r\n?/g,"\n").split("\n");
  const out=[];
  for(let line of lines){
    if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) continue;
    if(/^\s*\|?\s*:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)+\s*\|?\s*$/.test(line)) continue;
    if(/^\s*\|.*\|\s*$/.test(line)) line=markdownTableRowToText(line);
    line=line
      .replace(/^\s{0,3}#{1,6}\s*/,"")
      .replace(/^\s*>\s?/,"")
      .replace(/\*\*/g,"")
      .replace(/__/g,"")
      .replace(/[ \t]+$/g,"");
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

function normaliseArticleRef(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
}

export function replaceUngroundedArticleReferences(text,{userText="",hasGovernedLegalContext=false}={}){
  if(hasGovernedLegalContext) return String(text||"");
  const supplied=new Set(
    [...String(userText||"").matchAll(/(?:член|чл\.)\s*\d+[а-яА-Я-]*/giu)]
      .map(m=>normaliseArticleRef(m[0]))
  );
  return String(text||"").replace(/(?:член|чл\.)\s*\d+[а-яА-Я-]*/giu,match=>{
    if(supplied.has(normaliseArticleRef(match))) return match;
    return "[правна основа — да се провери во важечки официјален извор]";
  });
}

export function applyProceduralInstrumentSafety(text,{userText=""}={}){
  let clean=String(text||"").trim();
  if(!hasProceduralInstrumentMismatch(userText) || !clean) return clean;

  const heading="РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА";
  const note="Забелешка: Барањето опишува можен кривично-правен настан. Не се претпоставува дека „тужба“ е точниот процесен инструмент; видот на поднесокот мора да се провери според важечкиот закон и конкретните факти.";

  clean=clean.replace(/^\s*ТУЖБА(?:[^\n]*)?\s*(?:\n+|$)/iu,"").trim();
  clean=clean.replace(/^\s*TUZBA(?:[^\n]*)?\s*(?:\n+|$)/iu,"").trim();

  if(clean.toLocaleUpperCase("mk").startsWith(heading)){
    return clean.includes(note) ? clean : heading+"\n\n"+note+"\n\n"+clean.slice(heading.length).trim();
  }
  return heading+"\n\n"+note+(clean?"\n\n"+clean:"");
}

export function finaliseFormalLegalDraft(text,{userText="",hasGovernedLegalContext=false}={}){
  const clean=cleanFormalDraftForExport(text);
  const grounded=replaceUngroundedArticleReferences(clean,{userText,hasGovernedLegalContext});
  const instrumentSafe=applyProceduralInstrumentSafety(grounded,{userText});
  return ensureRequestedFormalDraftHeading(instrumentSafe,{userText});
}
