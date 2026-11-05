// Final user-facing response quality helpers.
// Deterministic postflight only: no source expansion, no new legal reasoning.

const FORMAL_DRAFT_RE=/(?:работен\s+нацрт|судск(?:а|о)\s+наплат|опомена|opomena|ту[жѓ]б|жалб|приговор|поднесок|поднес|барање|договор|полномош|правно\s+мислење|tuzb|zalb|prigovor|podnes|baranje|dogovor|polnomos)/iu;

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
    [/(?:судск(?:а|о)\s+наплат|наплат[аеи]\s+(?:на\s+)?(?:долг|побарувањ))/u,"РАБОТЕН НАЦРТ ЗА СУДСКА НАПЛАТА"],
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
  let clean=out.join("\n").replace(/\n{3,}/g,"\n\n").trim();

  // Deterministic cleanup for malformed drafting artefacts observed in live
  // Macedonian legal generations. These are language/style repairs only and do
  // not add legal authority, facts, deadlines or jurisdiction.
  clean=clean
    .replace(/Развој на бракот/gu,"Развод на бракот")
    .replace(/развије/giu,"разведе")
    .replace(/страстно сотварување/giu,"брачна заедница")
    .replace(/зајавка/giu,match=>/^[А-ШЃЅЈЉЊЌЏ]/u.test(match)?"Барање":"барање")
    .replace(/далечински подносител/giu,match=>/^[А-ШЃЅЈЉЊЌЏ]/u.test(match)?"Подносител":"подносител")
    .replace(/да погоди долгот/giu,"да го намири долгот")
    .replace(/погоди долгот/giu,"го намири долгот");

  // Collapse immediately repeated boilerplate paragraphs without changing
  // substantive non-adjacent legal text.
  const paragraphs=clean.split(/\n{2,}/u);
  const deduped=[];
  for(const paragraph of paragraphs){
    const current=String(paragraph||"").trim();
    if(!current) continue;
    const previous=deduped.at(-1)||"";
    if(current===previous) continue;
    deduped.push(current);
  }
  return deduped.join("\n\n").trim();
}

function normaliseArticleRef(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
}

export function replaceUngroundedArticleReferences(text,{
  userText="",
  hasGovernedLegalContext=false,
  governedArticleNumbers=[]
}={}){
  const supplied=new Set(
    [...String(userText||"").matchAll(/(?:член|чл\.)\s*\d+[а-яА-Я-]*/giu)]
      .map(m=>normaliseArticleRef(m[0]))
  );
  const governed=new Set(
    (Array.isArray(governedArticleNumbers)?governedArticleNumbers:[])
      .map(value=>String(value||"").normalize("NFKC").trim())
      .filter(Boolean)
      .map(value=>normaliseArticleRef("член "+value))
  );
  return String(text||"").replace(/(?:член|чл\.)\s*\d+[а-яА-Я-]*/giu,match=>{
    const normalized=normaliseArticleRef(match);
    if(supplied.has(normalized) || governed.has(normalized)) return match;
    // Generic corpus presence is not sufficient authority for a concrete article
    // number. A generated article survives only when the exact number is grounded
    // in the user request or in the governed article allow-list.
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


export function deterministicFormalDraftCapacityFallback({userText=""}={}){
  const input=String(userText||"").normalize("NFKC");
  if(!isFormalLegalDraftRequest(input)) return null;
  if(hasProceduralInstrumentMismatch(input)) return deterministicProceduralInstrumentFallback({userText:input});

  const heading=requestedFormalDraftHeading(input)||"РАБОТЕН ПРАВЕН НАЦРТ";
  const damages=/(?:надомест|штет)/iu.test(input);
  const divorce=/(?:развод|брак)/iu.test(input);
  const debt=/(?:судск(?:а|о)\s+наплат|долг|доверител|должник|побарувањ)/iu.test(input);
  const principal=String(input.match(/(?:^|[^\p{L}\p{N}])(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?\s*денар(?:и)?)(?=$|[^\p{L}\p{N}])/iu)?.[1]||"").trim();
  const creditor=String(input.match(/Доверител\s*:\s*([^.\n]+)/iu)?.[1]||"").trim();
  const debtor=String(input.match(/Должник\s*:\s*([^.\n]+)/iu)?.[1]||"").trim();
  const basis=String(input.match(/Основа\s*:\s*([^.\n]+)/iu)?.[1]||"").trim();
  const dueDateMissing=/(?:рок(?:от)?\s+за\s+плаќање[^.\n]*(?:не\s+е\s+наведен|не\s+е\s+даден|недостасува))/iu.test(input);
  const subject=divorce
    ? "Предмет: Работен нацрт за постапка во врска со развод на брак"
    : damages
      ? "Предмет: Работен нацрт за барање за надомест на штета"
      : debt
        ? "Предмет: Работен нацрт за судска наплата на договорен долг"
        : "Предмет: Работен правен поднесок";

  const specialisedSections=divorce
    ? [
        "Податоци за бракот",
        "Бракот е склучен на [ДАТУМ] во [МЕСТО] и е запишан во матичната книга на венчаните под [БРОЈ / ГОДИНА — ДА СЕ ПОПОЛНИ].",
        "Последно заедничко живеалиште: [АДРЕСА / МЕСТО — ДА СЕ ПОПОЛНИ].",
        "",
        "Фактичка основа за развод",
        "1. [ОПИШЕТЕ КОГА И КАКО НАСТАНАЛЕ НАРУШУВАЊАТА НА БРАЧНИТЕ ОДНОСИ.]",
        "2. [НАВЕДЕТЕ ДАЛИ И ОД КОГА БРАЧНИТЕ ДРУГАРИ ЖИВЕАТ ОДДЕЛНО.]",
        "3. [НАВЕДЕТЕ ДАЛИ ИМАЛО ОБИДИ ЗА НАДМИНУВАЊЕ НА ПРОБЛЕМИТЕ И КАКОВ БИЛ ИСХОДОТ.]",
        "",
        "Заеднички малолетни деца",
        "[АКО НЕМА: наведете дека брачните другари немаат заеднички малолетни деца.]",
        "[АКО ИМА: наведете име/иницијали, возраст, со кого живеат, фактичка грижа, школување, здравствени потреби и расположливи податоци за трошоците.]",
        "",
        "Предлог за судска одлука",
        "1. Да се разведе бракот меѓу странките, по проверка на точните матични податоци и процесните услови.",
        "2. [АКО ИМА МАЛОЛЕТНИ ДЕЦА: формулирајте предлог за грижа, живеење, лични односи и издршка само по професионална проверка на фактите и важечкото право.]",
        "3. [ТРОШОЦИ НА ПОСТАПКАТА — ДА СЕ ФОРМУЛИРААТ ПО ПРОВЕРКА.]",
        ""
      ]
    : debt
      ? [
          "Опис на побарувањето",
          "Доверителот го заснова побарувањето на: "+(basis||"[ДОГОВОР / ФАКТУРА / ДРУГА ОСНОВА — ДА СЕ ПОПОЛНИ]")+".",
          "Главнина: "+(principal||"[ИЗНОС — ДА СЕ ПОПОЛНИ]")+".",
          dueDateMissing
            ? "Доспеаност: рокот за плаќање не е наведен во барањето. Не смее да се претпостави; мора да се утврди од договорот, фактурата, опомената или друг доказ."
            : "Доспеаност: [ДАТУМ / УСЛОВ ЗА ДОСПЕАНОСТ — ДА СЕ ПРОВЕРИ].",
          "",
          "Фактички наводи",
          "1. [ОПИШЕТЕ КОГА И КАКО Е СКЛУЧЕН ДОГОВОРОТ / НАСТАНАТА ОБВРСКАТА.]",
          "2. [ОПИШЕТЕ ШТО Е ИСПОЛНЕТО ОД СТРАНА НА ДОВЕРИТЕЛОТ И СО КОИ ДОКАЗИ СЕ ПОТВРДУВА.]",
          "3. [ОПИШЕТЕ ШТО НЕ Е ПЛАТЕНО / ИСПОЛНЕТО ОД ДОЛЖНИКОТ.]",
          "4. [НАВЕДЕТЕ ДАЛИ Е ИСПРАТЕНА ОПОМЕНА ИЛИ ДРУГА КОМУНИКАЦИЈА, САМО АКО ПОСТОИ.]",
          "",
          "Предлог за судска заштита",
          "1. Да се задолжи должникот да ја плати главнината од "+(principal||"[ИЗНОС]")+" — само ако износот е потврден со доказите.",
          "2. [КАМАТА / СПОРЕДНИ ПОБАРУВАЊА — ДА НЕ СЕ ФОРМУЛИРААТ БЕЗ ПРОВЕРЕНА ПРАВНА ОСНОВА И ПОЧЕТЕН ДАТУМ.]",
          "3. [ТРОШОЦИ НА ПОСТАПКАТА — ДА СЕ ФОРМУЛИРААТ ПО ПРОВЕРКА.]",
          ""
        ]
      : [];

  return [
    heading,
    "",
    "РАБОТЕН ПРИМЕР — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА",
    "Овој текст е резервен структурен нацрт создаден затоа што автоматизираната обработка не заврши успешно. Не утврдува важечки закон, конкретен член, рок, надлежност, такса, задолжителен прилог или правен ефект.",
    "",
    "ДО: [НАДЛЕЖЕН СУД / ОРГАН — ДА СЕ ПРОВЕРИ]",
    "Подносител / тужител: "+(creditor||"[ИМЕ / НАЗИВ]"),
    "Адреса: [АДРЕСА]",
    "Спротивна страна: "+(debtor||"[ИМЕ / НАЗИВ]"),
    "Адреса: [АДРЕСА]",
    "",
    subject,
    "",
    ...specialisedSections,
    ...(debt ? [
      "Кориснички наведени факти",
      "Доверител: "+(creditor||"[ДА СЕ ПОПОЛНИ]"),
      "Должник: "+(debtor||"[ДА СЕ ПОПОЛНИ]"),
      "Основа: "+(basis||"[ДА СЕ ПОПОЛНИ]"),
      "Главен долг: "+(principal||"[ДА СЕ ПОПОЛНИ]"),
      dueDateMissing
        ? "Рок за плаќање: НЕ Е НАВЕДЕН — да се утврди и провери пред поднесување."
        : "Рок за плаќање: [ДА СЕ УТВРДИ И ПРОВЕРИ]",
      ""
    ] : []),
    "Фактичка основа",
    debt && principal
      ? "1. Корисникот наведе главен долг од "+principal+"."
      : "1. [ОПИШЕТЕ ГИ РЕЛЕВАНТНИТЕ ФАКТИ ПО ХРОНОЛОШКИ РЕД.]",
    debt && basis
      ? "2. Наведената основа е: "+basis+"."
      : "2. [НАВЕДЕТЕ ГИ ДАТУМИТЕ, НАСТАНИТЕ И ОДНОСОТ МЕЃУ СТРАНИТЕ.]",
    dueDateMissing
      ? "3. Рокот за плаќање не е наведен во барањето и не смее да се претпостави; мора да се утврди од договорот, фактурата, опомената или друг релевантен документ."
      : "3. [ОДДЕЛЕТЕ ГО ОНА ШТО Е НЕСПОРНО ОД ОНА ШТО ТРЕБА ДА СЕ ДОКАЖУВА.]",
    "",
    "Докази",
    "1. [ДОКУМЕНТ / ДОГОВОР / ИЗВЕШТАЈ / ИЗВОД — АКО ПОСТОИ.]",
    "2. [СВЕДОК — АКО Е РЕЛЕВАНТЕН.]",
    "3. [ДРУГ ДОКАЗ — ДА СЕ ПРОВЕРИ ДОПУШТЕНОСТА И РЕЛЕВАНТНОСТА.]",
    "",
    "Правна основа",
    "[ДА СЕ ПРОВЕРИ ВО ВАЖЕЧКИ ОФИЦИЈАЛЕН ИЗВОР ПРЕД ПРОФЕСИОНАЛНА УПОТРЕБА.]",
    "",
    "Предлог / барање",
    "[ФОРМУЛИРАЈТЕ ГО ТОЧНОТО БАРАЊЕ ПО ПРОВЕРКА НА НАДЛЕЖНОСТА, ПРАВНАТА ОСНОВА И ПРОЦЕСНИТЕ УСЛОВИ.]",
    "",
    "Место и датум: [МЕСТО, ДАТУМ]",
    "Потпис: [ПОТПИС]",
    "",
    "ЧОВЕЧКА ПРОВЕРКА",
    "Пред потпишување, поднесување или испраќање, правен професионалец мора да ги провери фактите, надлежноста, важечкиот закон, точните членови, роковите, доказите, прилозите, таксите и правниот лек. Овој резервен текст не е конечен правен поднесок."
  ].join("\n");
}

export function finaliseFormalLegalDraft(text,{
  userText="",
  hasGovernedLegalContext=false,
  governedArticleNumbers=[]
}={}){
  const clean=cleanFormalDraftForExport(text);
  const grounded=replaceUngroundedArticleReferences(clean,{
    userText,
    hasGovernedLegalContext,
    governedArticleNumbers
  });
  const instrumentSafe=applyProceduralInstrumentSafety(grounded,{userText});
  return ensureRequestedFormalDraftHeading(instrumentSafe,{userText});
}
