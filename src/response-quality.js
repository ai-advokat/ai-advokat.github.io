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

export function deterministicProceduralInstrumentFallback({userText=""}={}){
  if(!hasProceduralInstrumentMismatch(userText)) return null;
  const heading="РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА";
  return [
    heading,
    "",
    "Забелешка: Барањето опишува можен кривично-правен настан. Не се претпоставува дека „тужба“ е точниот процесен инструмент. Пред поднесување, овластен правен професионалец треба да ги провери видот на поднесокот, надлежниот орган и важечката правна основа.",
    "",
    "РАБОТЕН ПРИМЕР СО ИЗМИСЛЕНИ ПОДАТОЦИ",
    "",
    "Подносител: [ИЗМИСЛЕНО ИМЕ И ПРЕЗИМЕ]",
    "Адреса: [ИЗМИСЛЕНА АДРЕСА]",
    "Контакт: [ИЗМИСЛЕН КОНТАКТ]",
    "Надлежен орган: [ДА СЕ УТВРДИ ПО ПРОФЕСИОНАЛНА ПРОВЕРКА]",
    "",
    "Предмет: Известување за настан и доставување фактички податоци",
    "",
    "Опис на настанот",
    "На [ИЗМИСЛЕН ДАТУМ], во [ИЗМИСЛЕНО МЕСТО], подносителот забележал дека велосипедот опишан подолу недостасува. Според работниот пример, велосипедот бил одземен без согласност на подносителот. Сторителот е [НЕПОЗНАТ / ИЗМИСЛЕНО ЛИЦЕ].",
    "",
    "Податоци за велосипедот",
    "Марка и модел: [ИЗМИСЛЕНИ ПОДАТОЦИ]",
    "Боја: [ИЗМИСЛЕНА БОЈА]",
    "Сериски број: [ИЗМИСЛЕН БРОЈ]",
    "Други особености: [ОПИС]",
    "",
    "Можни прилози и докази",
    "1. Фотографија од велосипедот.",
    "2. Документ или друг доказ за сопственост, ако постои.",
    "3. Снимка од видеонадзор, ако е законски достапна.",
    "4. Податоци за сведоци, ако постојат.",
    "",
    "Цел на работниот поднесок",
    "Надлежниот орган да го евидентира пријавениот настан и да постапи во рамките на своите законски надлежности, откако ќе се утврди точниот процесен инструмент.",
    "",
    "ЧОВЕЧКА ПРОВЕРКА",
    "Пред потпишување или поднесување мора да се проверат точниот вид на поднесокот, надлежноста, важечката правна основа, роковите и фактичките податоци. Овој текст е работен пример и не претставува конечен правен поднесок."
  ].join("\n");
}

function isGenericCivilDamagesDraftRequest(userText){
  const text=String(userText||"").normalize("NFKC").toLocaleLowerCase("mk");
  return /(?:ту[жѓ]б|tuzb)/iu.test(text)
    && /надомест/iu.test(text)
    && /штет/iu.test(text)
    && !hasProceduralInstrumentMismatch(text);
}

export function formalDraftAuthoritySafety(text,{userText="",hasGovernedLegalContext=false}={}){
  if(hasGovernedLegalContext) return {ok:true,problems:[]};
  const value=String(text||"").normalize("NFKC");
  const q=String(userText||"").normalize("NFKC").toLocaleLowerCase("mk");
  const problems=[];

  if(isGenericCivilDamagesDraftRequest(userText)){
    if(/(?:суд\s+за\s+кривич|кривичен\s+суд|државн(?:иот|и)?\s+обвинител|јавн(?:иот|и)?\s+обвинител)/iu.test(value)){
      problems.push("civil_draft_criminal_role_or_court");
    }
  }

  const generatedSpecificCourt=/(?:основен|апелационен|врховен|уставен)\s+(?:граѓански\s+|кривичен\s+)?суд(?:\s+во\s+[\p{L}-]+)?/iu.exec(value)?.[0]||"";
  if(generatedSpecificCourt && !q.includes(generatedSpecificCourt.toLocaleLowerCase("mk"))){
    problems.push("unsourced_specific_court");
  }

  if(/\b(?:еоод|eood)\b/iu.test(value) && !/\b(?:еоод|eood)\b/iu.test(q)){
    problems.push("generated_foreign_company_form");
  }

  return {ok:problems.length===0,problems:[...new Set(problems)]};
}

export function deterministicCivilDamagesFallback({userText=""}={}){
  if(!isGenericCivilDamagesDraftRequest(userText)) return null;
  return [
    "ТУЖБА ЗА НАДОМЕСТ НА ШТЕТА",
    "",
    "До: [НАДЛЕЖЕН СУД — ДА СЕ УТВРДИ ПО ПРОФЕСИОНАЛНА ПРОВЕРКА]",
    "",
    "Тужител: [ИЗМИСЛЕНО ИМЕ И ПРЕЗИМЕ / НАЗИВ]",
    "Адреса / седиште: [ИЗМИСЛЕН ПОДАТОК]",
    "",
    "Тужен: [ИЗМИСЛЕНО ИМЕ И ПРЕЗИМЕ / НАЗИВ]",
    "Адреса / седиште: [ИЗМИСЛЕН ПОДАТОК]",
    "",
    "Предмет: Надомест на штета",
    "Вредност на спорот: [ИЗНОС — ДА СЕ УТВРДИ]",
    "",
    "ФАКТИЧКА ОСНОВА",
    "На [ИЗМИСЛЕН ДАТУМ], во [ИЗМИСЛЕНО МЕСТО], настанал настан од кој, според работниот пример, тужителот претрпел штета. Точниот опис на дејствијата, причинската врска, видот и висината на штетата треба да се внесат според доказите во конкретниот предмет.",
    "",
    "ДОКАЗИ",
    "1. [ДОКУМЕНТ / ДОГОВОР / СМЕТКА — АКО ПОСТОИ]",
    "2. [ФОТОГРАФИИ / СНИМКИ — АКО СЕ ЗАКОНСКИ ДОСТАПНИ]",
    "3. [СВЕДОК — АКО ПОСТОИ]",
    "4. [СТРУЧЕН НАОД ИЛИ ДРУГ ДОКАЗ — АКО Е РЕЛЕВАНТЕН]",
    "",
    "ТУЖБЕНО БАРАЊЕ — РАБОТЕН ПРИМЕР",
    "Се предлага, по професионална проверка на надлежноста, правната основа и доказите, тужениот да биде задолжен да му исплати на тужителот [ИЗНОС] денари на име надомест на штета. Евентуалната камата, трошоците и точната формулација на барањето се внесуваат само по проверка на важечкиот закон и конкретниот предмет.",
    "",
    "Место и датум: [ДА СЕ ВНЕСАТ]",
    "Потпис: [ДА СЕ ВНЕСЕ]",
    "",
    "ЧОВЕЧКА ПРОВЕРКА",
    "Пред поднесување мора да се проверат надлежниот суд, процесната дозволеност, роковите, правната основа, доказите, висината на побарувањето, каматата и судските трошоци. Овој текст е работен пример со неутрални податоци и не претставува конечен правен поднесок."
  ].join("\n");
}

export function deterministicFormalDraftFallback({userText=""}={}){
  return deterministicProceduralInstrumentFallback({userText})
    || deterministicCivilDamagesFallback({userText})
    || null;
}

export function finaliseFormalLegalDraft(text,{userText="",hasGovernedLegalContext=false}={}){
  const clean=cleanFormalDraftForExport(text);
  const grounded=replaceUngroundedArticleReferences(clean,{userText,hasGovernedLegalContext});
  const instrumentSafe=applyProceduralInstrumentSafety(grounded,{userText});
  return ensureRequestedFormalDraftHeading(instrumentSafe,{userText});
}
