import test from "node:test";
import assert from "node:assert/strict";
import {
  isFormalLegalDraftRequest,
  cleanFormalDraftForExport,
  replaceUngroundedArticleReferences,
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

test("RQ5 governed legal context preserves sourced article references",()=>{
  const raw="Согласно член 34, следува проверка.";
  assert.equal(
    replaceUngroundedArticleReferences(raw,{userText:"Анализа",hasGovernedLegalContext:true}),
    raw
  );
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
