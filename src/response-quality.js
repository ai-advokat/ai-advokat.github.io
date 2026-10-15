// Final user-facing response quality helpers.
// Deterministic postflight only: no source expansion, no new legal reasoning.

const FORMAL_DRAFT_RE=/(?:тужб|жалб|приговор|поднесок|поднес|барање|договор|полномош|правно\s+мислење|tuzb|zalb|prigovor|podnes|baranje|dogovor|polnomos)/iu;

export function isFormalLegalDraftRequest(userText){
  return FORMAL_DRAFT_RE.test(String(userText||"").normalize("NFKC"));
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

export function finaliseFormalLegalDraft(text,{userText="",hasGovernedLegalContext=false}={}){
  const clean=cleanFormalDraftForExport(text);
  return replaceUngroundedArticleReferences(clean,{userText,hasGovernedLegalContext});
}
