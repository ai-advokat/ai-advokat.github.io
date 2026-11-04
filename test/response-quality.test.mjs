import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  isFormalLegalDraftRequest,
  hasProceduralInstrumentMismatch,
  deterministicProceduralInstrumentFallback,
  applyProceduralInstrumentSafety,
  cleanFormalDraftForExport,
  replaceUngroundedArticleReferences,
  requestedFormalDraftHeading,
  ensureRequestedFormalDraftHeading,
  finaliseFormalLegalDraft
} from "../src/response-quality.js";

test("RQ1 formal legal draft requests are detected in Cyrillic and Latin transliteration",()=>{
  assert.equal(isFormalLegalDraftRequest("Изработи тужба за надомест на штета."),true);
  assert.equal(isFormalLegalDraftRequest("izraboti mi tuzba za nadomest na steta"),true);
  assert.equal(isFormalLegalDraftRequest("Објасни ми што е договор."),true);
  assert.equal(isFormalLegalDraftRequest("Какво е времето?"),false);
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


test("RQ14 formal drafts are excluded from the stripped-down FREE fast prompt",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/const fastFreePrompt=\(missionProfile===\"GENERAL_BYPASS\" \|\| missionProfile===\"L0_INFORMATIONAL\"\)\s*&& !formalDraftRequest;/);
  assert.match(worker,/allowProviderRepair:languageRequired/);
  assert.match(worker,/forceEditorialPass:languageRequired/);
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
