import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isFormalLegalDraftRequest,
  hasProceduralInstrumentMismatch,
  deterministicProceduralInstrumentFallback,
  deterministicFictionalPublicFalseInformationDraftFallback,
  deterministicFormalDraftCapacityFallback,
  shouldUseDeterministicFormalDraftRecovery,
  applyProceduralInstrumentSafety,
  cleanFormalDraftForExport,
  replaceUngroundedArticleReferences,
  requestedFormalDraftHeading,
  ensureRequestedFormalDraftHeading,
  finaliseFormalLegalDraft
} from "../src/response-quality.js";
import {macedonianDeliveryVerdict} from "../src/macedonian-language-guard.js";

test("RQ1 formal legal draft requests are detected in Cyrillic and Latin transliteration",()=>{
  assert.equal(isFormalLegalDraftRequest("Изработи тужба за надомест на штета."),true);
  assert.equal(isFormalLegalDraftRequest("izraboti mi tuzba za nadomest na steta"),true);
  assert.equal(isFormalLegalDraftRequest("Објасни ми што е договор."),false);
  assert.equal(isFormalLegalDraftRequest("Какво е времето?"),false);
});



test("RQ1b analytical prompts that mention legal instruments are not misclassified as full-document drafting",()=>{
  const stress15="Во 2023 година тужбата на А против Б за 600.000 денари била отфрлена како недозволена, без расправа по основаноста. Во 2026 година А повторно поднесува тужба за истиот износ, но со дополнителни факти и исправи. Б приговара правосилно пресудена работа; истовремено се води друга парница меѓу странките за дел од истиот правен однос. Разграничи отфрлање на тужба од одбивање на тужбено барање, формална и материјална правосилност, идентитет на спор и литиспенденција. Објасни кои акти и диспозитиви мора да се прочитаат пред да се даде заклучок. Изработи краток нацрт на аргументација за приговорот и за спротивната страна. Не тврди дека постои res judicata само поради ист износ.";
  assert.equal(isFormalLegalDraftRequest(stress15),false);

  const mixed=[
    "Анализирај отказ, доставување и рокови. Понуди редослед на дејствија и нацрт на соодветен приговор/тужба.",
    "Анализирај ги недозволените докази и подготви краток нацрт за издвојување/оспорување на доказ.",
    "Направи двострана анализа на притворот. Состави нацрт на аргументирано барање за укинување или замена на притворот.",
    "Анализирај ги жалбените основи. Изработи структура на жалба и конкретни доказни предлози.",
    "Разграничи CMR-одговорност и понуди двострана анализа и англиски нацрт на професионален одговор.",
    "Анализирај што мора да содржи одговорот на тужба. Пред да составиш нацрт, потврди кого застапуваш."
  ];
  for(const q of mixed) assert.equal(isFormalLegalDraftRequest(q),false,q);
});

test("RQ1c direct document requests remain eligible for formal drafting",()=>{
  for(const q of [
    "Изработи тужба за надомест на штета.",
    "Подготви жалба против решението.",
    "Направи ми приговор.",
    "Факти: Доверител: А. Должник: Б. Главен долг 150.000 денари. Подготви работен нацрт за судска наплата.",
    "Дали тужба за развод можеш да ми ја изработиш со измислени податоци?",
    "тужба"
  ]) assert.equal(isFormalLegalDraftRequest(q),true,q);
});

test("RQ1d structured facts plus Bарам pre-suit notice is a formal draft mandate",()=>{
  const q=[
    "Факти:",
    "Доверител: Правно лице А.",
    "Должник: Правно лице Б.",
    "Основа: Договор за услуги.",
    "Главен долг: 150.000 денари.",
    "Рок за плаќање според договорот: 15.09.2026 година.",
    "Долгот не е платен.",
    "Барам:",
    "Формално и правно соодветна опомена пред тужба.",
    "Јасен опис на побарувањето.",
    "Релевантна правна основа со проверени законски одредби.",
    "Правна и јазична проверка на документот."
  ].join("\n");
  assert.equal(isFormalLegalDraftRequest(q),true);
  assert.equal(requestedFormalDraftHeading(q),"ОПОМЕНА ПРЕД ПОВЕДУВАЊЕ СУДСКА ПОСТАПКА");
});

test("RQ2 formal draft cleanup removes raw Markdown but preserves legal text",()=>{
  const raw=[
    "**ТУЖБА ЗА НАДОМЕСТ НА ШТЕТА**",
    "---",
    "### Тужител",
    "**Име:** Димитар Јованов",
    "",
    "| Поле | Податок |",
    "|---|---|",
    "| Износ | 50.000 денари |",
    "",
    "> Човечка проверка е потребна."
  ].join("\n");
  const clean=cleanFormalDraftForExport(raw);
  assert.match(clean,/ТУЖБА ЗА НАДОМЕСТ НА ШТЕТА/);
  assert.match(clean,/Тужител/);
  assert.match(clean,/Име: Димитар Јованов/);
  assert.match(clean,/Износ: 50\.000 денари/);
  assert.match(clean,/Човечка проверка е потребна/);
  assert.doesNotMatch(clean,/\*\*|^#{1,6}\s|^\s*\|.*\|\s*$|^---$/m);
});

test("RQ3 ungrounded article numbers are removed when no governed law context exists",()=>{
  const raw="Правната основа е член 34 и член 62 од закон.";
  const clean=replaceUngroundedArticleReferences(raw,{
    userText:"Изработи тужба со измислени податоци.",
    hasGovernedLegalContext:false
  });
  assert.doesNotMatch(clean,/\bчлен\s+(?:34|62)\b/u);
  assert.match(clean,/правна основа — да се провери во важечки официјален извор/);
});

test("RQ4 article reference explicitly supplied by the user is preserved",()=>{
  const raw="Провери член 34 и член 99.";
  const clean=replaceUngroundedArticleReferences(raw,{
    userText:"Користи го член 34 што ти го дадов.",
    hasGovernedLegalContext:false
  });
  assert.match(clean,/член 34/);
  assert.doesNotMatch(clean,/член 99/);
});

test("RQ5 generic governed context does not authorise an unlisted concrete article number",()=>{
  const raw="Согласно член 34, следува проверка.";
  const clean=replaceUngroundedArticleReferences(raw,{
    userText:"Анализа",
    hasGovernedLegalContext:true,
    governedArticleNumbers:[]
  });
  assert.doesNotMatch(clean,/член 34/u);
  assert.match(clean,/правна основа — да се провери/u);
});

test("RQ5b exact governed article allow-list preserves only verified article numbers",()=>{
  const raw="Согласно член 34 и член 415, следува проверка.";
  const clean=replaceUngroundedArticleReferences(raw,{
    userText:"Анализа",
    hasGovernedLegalContext:true,
    governedArticleNumbers:["34"]
  });
  assert.match(clean,/член 34/u);
  assert.doesNotMatch(clean,/член 415/u);
});

test("RQ6 final formal draft is export-ready and authority-safe",()=>{
  const raw="### **ТУЖБА**\n\nПравна основа: член 77.";
  const final=finaliseFormalLegalDraft(raw,{
    userText:"Изработи тужба со измислени податоци.",
    hasGovernedLegalContext:false
  });
  assert.match(final,/ТУЖБА/);
  assert.doesNotMatch(final,/###|\*\*|член 77/);
});


test("RQ7 requested formal document type is deterministically restored as the first heading",()=>{
  assert.equal(requestedFormalDraftHeading("Изработи тужба за надомест на штета."),"ТУЖБА");
  assert.equal(requestedFormalDraftHeading("Подготви жалба против решението."),"ЖАЛБА");
  const fixed=ensureRequestedFormalDraftHeading("До Основен граѓански суд\nТужител: [ИМЕ]",{
    userText:"Изработи тужба за надомест на штета, со измислени податоци."
  });
  assert.match(fixed,/^ТУЖБА\n\n/u);
  const already=ensureRequestedFormalDraftHeading("ТУЖБА\n\nДо судот",{
    userText:"Изработи тужба."
  });
  assert.equal(already,"ТУЖБА\n\nДо судот");
});

test("RQ8 finaliser never returns a requested lawsuit without a lawsuit heading",()=>{
  const final=finaliseFormalLegalDraft("Суд за граѓански правни односи\nТужител: [ИМЕ]\nТужен: [ИМЕ]",{
    userText:"Изработи тужба за надомест на штета, со измислени податоци.",
    hasGovernedLegalContext:false
  });
  assert.match(final,/^ТУЖБА\n\n/u);
  assert.match(final,/Тужител:/u);
});


test("RQ9 pre-litigation notice is classified before the embedded lawsuit word",()=>{
  const userText="Да те замолам да ми направиш опомена пред тужба за развод, со измислени имиња.";
  assert.equal(isFormalLegalDraftRequest(userText),true);
  assert.equal(
    requestedFormalDraftHeading(userText),
    "ОПОМЕНА ПРЕД ПОВЕДУВАЊЕ СУДСКА ПОСТАПКА"
  );
  const final=finaliseFormalLegalDraft(
    "Еве пример за опомена пред тужба за развод.\nИспраќач: Иван Ивановски\nДо: Марија Петровска",
    {userText,hasGovernedLegalContext:false}
  );
  assert.match(final,/^ОПОМЕНА ПРЕД ПОВЕДУВАЊЕ СУДСКА ПОСТАПКА\n\n/u);
  assert.doesNotMatch(final,/^ТУЖБА\n/mu);
});


test("RQ10 obvious typo Туѓба is still detected as a formal legal draft request",()=>{
  assert.equal(isFormalLegalDraftRequest("Направи ми Туѓба за кражба на велосипед."),true);
});

test("RQ11 criminal-event wording does not force a civil lawsuit heading",()=>{
  const q="Направи ми Туѓба за кражба на велосипед.";
  assert.equal(hasProceduralInstrumentMismatch(q),true);
  assert.equal(
    requestedFormalDraftHeading(q),
    "РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА"
  );
  const final=finaliseFormalLegalDraft(
    "ТУЖБА\n\nОпис на настанот: велосипедот е одземен од непознато лице.",
    {userText:q,hasGovernedLegalContext:false}
  );
  assert.match(final,/^РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА/u);
  assert.match(final,/точниот процесен инструмент/u);
  assert.doesNotMatch(final,/^ТУЖБА\b/mu);
});

test("RQ12 civil-remedy wording keeps a lawsuit request eligible for civil drafting",()=>{
  const q="Изработи тужба за надомест на штета поради измама.";
  assert.equal(hasProceduralInstrumentMismatch(q),false);
  assert.equal(requestedFormalDraftHeading(q),"ТУЖБА");
});

test("RQ13 procedural safety strips an unsafe forced lawsuit heading",()=>{
  const q="Направи тужба за кражба.";
  const out=applyProceduralInstrumentSafety("ТУЖБА\n\nДо надлежен орган", {userText:q});
  assert.match(out,/^РАБОТЕН НАЦРТ/u);
  assert.doesNotMatch(out,/^ТУЖБА\b/mu);
});


test("RQ14 formal drafts keep the full prompt and use the editor only after the deterministic language gate fails",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/const fastFreePrompt=\(missionProfile==="GENERAL_BYPASS" \|\| missionProfile==="L0_INFORMATIONAL"\)\s*&& !formalDraftRequest;/);
  assert.match(worker,/allowProviderRepair:languageRequired/);
  assert.match(worker,/forceEditorialPass:false/);
  assert.match(worker,/const editorRequired=forceEditorialPass \|\| releaseVerdict\.verdict!=="RELEASE"/);
  assert.match(worker,/mandatory_language_editor_failed/);
  assert.match(worker,/deterministicProceduralInstrumentFallback/);
  assert.match(worker,/deterministicLanguageFallbackUsed/);
});


test("RQ15 Macedonian legal drafting uses an independent fail-closed language editor",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/resolveMacedonianLanguageEditorModel/);
  assert.match(worker,/model:editorModel/);
  assert.match(worker,/mandatory_language_editor_failed/);
  assert.match(worker,/hardBlock:true/);
});


test("RQ16 ambiguous criminal draft has a deterministic clean Macedonian fallback",()=>{
  const q="Направи ми Туѓба за кражба на велосипед, со измислени податоци.";
  const out=deterministicProceduralInstrumentFallback({userText:q});
  assert.match(out,/^РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА/u);
  assert.match(out,/РАБОТЕН ПРИМЕР СО ИЗМИСЛЕНИ ПОДАТОЦИ/u);
  assert.match(out,/Надлежен орган: \[ДА СЕ УТВРДИ ПО ПРОФЕСИОНАЛНА ПРОВЕРКА\]/u);
  assert.doesNotMatch(out,/^ТУЖБА\b/mu);
  assert.doesNotMatch(out,/\bчлен\s+\d+/iu);
});


test("RQ17 criminal-event draft strips invented article even when other governed context exists",()=>{
  const q="Изработи ми тужба за кражба на автомобил. Не измислувај членови.";
  const final=finaliseFormalLegalDraft(
    "ТУЖБА\n\nСогласно член 415 од ЗКП, подносителот бара постапување.",
    {
      userText:q,
      hasGovernedLegalContext:true,
      governedArticleNumbers:["12"]
    }
  );
  assert.match(final,/^РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА/u);
  assert.doesNotMatch(final,/член 415/u);
  assert.match(final,/правна основа — да се провери/u);
});

test("RQ18 observed malformed Macedonian drafting artefacts are deterministically polished",()=>{
  const raw=[
    "Развој на бракот",
    "",
    "Странката предлага бракот да се развије поради страстно сотварување.",
    "",
    "Зајавка: должникот да погоди долгот.",
    "",
    "Далечински подносител: [ИМЕ]"
  ].join("\n");
  const clean=cleanFormalDraftForExport(raw);
  assert.match(clean,/Развод на бракот/u);
  assert.match(clean,/да се разведе/u);
  assert.match(clean,/брачна заедница/u);
  assert.match(clean,/Барање:/u);
  assert.match(clean,/да го намири долгот/u);
  assert.match(clean,/Подносител:/u);
  assert.doesNotMatch(clean,/развије|сотварување|зајавка|далечински подносител|погоди долгот/iu);
});

test("RQ19 immediately duplicated boilerplate paragraphs collapse to one copy",()=>{
  const clean=cleanFormalDraftForExport("ЧОВЕЧКА ПРОВЕРКА\n\nЧОВЕЧКА ПРОВЕРКА\n\nТекст.");
  assert.equal((clean.match(/ЧОВЕЧКА ПРОВЕРКА/gu)||[]).length,1);
});


test("RQ20 capacity-timeout fallback produces a useful authority-safe civil draft",()=>{
  const q="Изработи тужба за надомест на штета, со измислени податоци.";
  const out=deterministicFormalDraftCapacityFallback({userText:q});
  assert.match(out,/^ТУЖБА/u);
  assert.match(out,/РАБОТЕН ПРИМЕР — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА/u);
  assert.match(out,/надомест на штета/u);
  assert.match(out,/ЧОВЕЧКА ПРОВЕРКА/u);
  assert.doesNotMatch(out,/\bчлен\s+\d+/iu);
  assert.match(out,/ДА СЕ ПРОВЕРИ ВО ВАЖЕЧКИ ОФИЦИЈАЛЕН ИЗВОР/u);
});

test("RQ21 capacity-timeout fallback preserves procedural-instrument safety",()=>{
  const q="Направи ми Туѓба за кражба на велосипед, со измислени податоци.";
  const out=deterministicFormalDraftCapacityFallback({userText:q});
  assert.match(out,/^РАБОТЕН НАЦРТ · ПРОЦЕСЕН ИНСТРУМЕНТ ЗА ПРОВЕРКА/u);
  assert.doesNotMatch(out,/^ТУЖБА\b/mu);
  assert.match(out,/ЧОВЕЧКА ПРОВЕРКА/u);
});


test("RQ22 detention capacity fallback preserves the statutory decision form",()=>{
  const q="Изработи жалба против притвор и наведи поддржувачка и спротивна судска практика и точниот вид на судска одлука.";
  const out=deterministicFormalDraftCapacityFallback({userText:q});
  assert.match(out,/решение, а не пресуда/iu);
  assert.match(out,/жалба против решението за притвор/iu);
  assert.match(out,/определува, продолжува или укинува притвор/iu);
  assert.match(out,/поддржувачка и спротивна судска практика/iu);
  assert.match(out,/не се именува автоматски без проверени официјални судски извори/iu);
  assert.doesNotMatch(out,/пресуда за (?:определување|продолжување|укинување)(?: на)? притвор/iu);
  assert.match(out,/ЧОВЕЧКА ПРОВЕРКА/iu);
});

test("RQ23 deterministic debt fallback preserves the user-supplied principal",()=>{
  const q="Факти: доверител Правно лице А, должник Правно лице Б, договор за услуги, главен долг 150.000 денари, рокот е поминат. Подготви работен нацрт за судска наплата без да измислуваш надлежност, рокови или членови.";
  const out=deterministicFormalDraftCapacityFallback({userText:q});
  assert.match(out,/150\.000 денари/iu);
  assert.match(out,/судска наплата/iu);
  assert.match(out,/ЧОВЕЧКА ПРОВЕРКА/iu);
  assert.doesNotMatch(out,/\bчлен\s+\d+/iu);
});

test("RQ24 incomplete formal draft triggers deterministic recovery",()=>{
  const q="Факти: доверител Правно лице А, должник Правно лице Б, главен долг 150.000 денари. Подготви работен нацрт за судска наплата.";
  const truncated="РАБОТЕН НАЦРТ ЗА СУДСКА НАПЛАТА\n\n1. СУД/ОРГАН\n[ДА СЕ ПРОВЕРИ]\n\n2. СТРАНИ\nДоверител: Правно лице А\nДолжник: Правно лице Б\n\n3. ПО";
  assert.equal(shouldUseDeterministicFormalDraftRecovery(truncated,{userText:q}),true);
});

test("RQ25 complete formal draft that preserves supplied amount does not trigger recovery",()=>{
  const q="Подготви работен нацрт за судска наплата на главен долг 150.000 денари.";
  const complete=[
    "РАБОТЕН НАЦРТ ЗА СУДСКА НАПЛАТА",
    "Доверител: Правно лице А",
    "Должник: Правно лице Б",
    "Главен долг: 150.000 денари.",
    "Фактичка основа: Обврската и доспеаноста треба да се потврдат со приложените докази.",
    "Докази: договор, фактура и комуникација ако постојат.",
    "Правна основа: [ДА СЕ ПРОВЕРИ ВО ВАЖЕЧКИ ОФИЦИЈАЛЕН ИЗВОР].",
    "Предлог: точниот petitum да се формулира по проверка на надлежноста и процесните услови.",
    "ЧОВЕЧКА ПРОВЕРКА: пред поднесување да се проверат фактите, доказите, роковите и важечкото право."
  ].join("\n\n");
  assert.equal(shouldUseDeterministicFormalDraftRecovery(complete,{userText:q}),false);
});

test("RQ26 short explanatory contract answer is not misclassified as a recovery draft",()=>{
  assert.equal(
    shouldUseDeterministicFormalDraftRecovery("Договор е согласност меѓу страни што создава права и обврски.",{
      userText:"Објасни ми што е договор."
    }),
    false
  );
});



test("RQ27 R3 complex legal analysis prompts from the central audit never enter formal-document recovery",()=>{
  const prompts=[
    "На 3 септември 2026 година е поднесена тужба за надоместок на штета. Првото рочиште е закажано за 5 февруари 2027 година. Анализирај го правото меродавно за поднесувањето на тужбата, доставата, доказните предлози и рочиштето.",
    "Татко починал во 2025 година и во катастар останал запишан како сопственик. Разграничи стекнување наследство, катастарски упис, активна легитимација и правен интерес. Предложи процесна стратегија за двете страни.",
    "Работник добил отказ во август 2026 година. Анализирај кој датум е релевантен за доставување и рокови. Понуди редослед на дејствија и нацрт на соодветен приговор/тужба.",
    "Доверител започнал извршување врз основа на нотарска исправа. Разграничи заверка на потпис, нотарски акт, извршна исправа и извршност. Дади одделни препораки за должникот и доверителот."
  ];
  for(const q of prompts) assert.equal(isFormalLegalDraftRequest(q),false,q);
});

test("RQ28 exact Sasho fictional public-false-information lawsuit request never needs a bare language-block response",()=>{
  const q="Да те замолам да ми направиш Тужба за лиферување на лажни информации во јавност, со измислени имиња, однапред многу ти благодарам ,Сашо";
  assert.equal(isFormalLegalDraftRequest(q),true);
  const draft=deterministicFictionalPublicFalseInformationDraftFallback({userText:q});
  assert.ok(draft);
  assert.match(draft,/^ТУЖБА(?:\n|$)/u);
  assert.match(draft,/РАБОТЕН ПРИМЕР СО ЦЕЛОСНО ИЗМИСЛЕНИ ПОДАТОЦИ/u);
  assert.match(draft,/Александар Јованов/u);
  assert.match(draft,/Марко Петров/u);
  assert.match(draft,/јавно објавени невистинити фактички тврдења/iu);
  assert.match(draft,/ЧОВЕЧКА ПРОВЕРКА/u);
  assert.doesNotMatch(draft,/\bчлен\s+\d+/iu);
  assert.doesNotMatch(draft,/РАБОТЕН ПРИМЕР — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА/u);
  assert.doesNotMatch(draft,/ДО: \[НАДЛЕЖЕН СУД \/ ОРГАН — ДА СЕ ПРОВЕРИ\]/u);
  const verdict=macedonianDeliveryVerdict(draft,{userText:q});
  assert.equal(verdict.deliver,true,JSON.stringify(verdict,null,2));
});

test("RQ29 fictional public-false-information recovery stays narrowly scoped",()=>{
  assert.equal(deterministicFictionalPublicFalseInformationDraftFallback({
    userText:"Анализирај дали јавно објавена информација е точна."
  }),null);
  assert.equal(deterministicFictionalPublicFalseInformationDraftFallback({
    userText:"Направи тужба за долг со измислени имиња."
  }),null);
});

