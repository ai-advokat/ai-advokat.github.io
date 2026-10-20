import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDocumentForIngest,
  buildDocumentRouteBatch
} from "../src/document-ingest-router.js";

test("routes a Macedonian law with standalone article structure to the legal-text pipeline",()=>{
  const text=`
ЗАКОН ЗА ТЕСТ
Службен весник на Република Северна Македонија бр. 1/2026

Член 1
Овој закон ја уредува тестната материја.

Член 2
Поимите во овој закон го имаат следното значење.

Член 3
Надлежниот орган постапува согласно закон.
`;
  const r=classifyDocumentForIngest(text);
  assert.equal(r.route,"legal_instrument");
  assert.equal(r.autoRouteAllowed,true);
  assert.equal(r.downstream.id,"mk_legal_text_pipeline");
  assert.match(r.downstream.parser,/parse-mk-legal-text/);
  assert.equal(r.deterministicRoutingScore.statisticalConfidence,null);
});

test("routes a court judgment to the case-law metadata pipeline",()=>{
  const text=`
ОСНОВЕН КРИВИЧЕН СУД СКОПЈЕ
К.бр. 101/2026
ПРЕСУДА
Обвинетиот се огласува за виновен.
ОБРАЗЛОЖЕНИЕ
Судот одлучи по изведените докази.
`;
  const r=classifyDocumentForIngest(text);
  assert.equal(r.route,"case_law");
  assert.equal(r.autoRouteAllowed,true);
  assert.equal(r.downstream.id,"case_law_metadata_pipeline");
});

test("an amending law with case citations remains a legal instrument when article structure dominates",()=>{
  const text=`
ЗАКОН ЗА ИЗМЕНУВАЊЕ И ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА ТЕСТ
Член 1
Во член 5 зборовите се заменуваат.
Член 2
Членот 8 се менува.
Член 3
Овој закон влегува во сила осмиот ден.
Во образложението се споменува У.бр.5/2025 на Уставен суд.
`;
  const r=classifyDocumentForIngest(text);
  assert.equal(r.route,"legal_instrument");
});

test("conflicting strong law and case-law structures fail closed to manual review",()=>{
  const text=`
ОСНОВЕН СУД СКОПЈЕ
К.бр. 10/2026
ПРЕСУДА
ЗАКОН ЗА ТЕСТ
Член 1
Текст.
Член 2
Текст.
Член 3
Текст.
Член 4
Текст.
Член 5
Текст.
ОБРАЗЛОЖЕНИЕ
СЕ ОДБИВА барањето.
`;
  const r=classifyDocumentForIngest(text);
  assert.equal(r.route,"manual_review");
  assert.equal(r.autoRouteAllowed,false);
  assert.match(r.reason,/conflict|insufficient/);
});

test("contracts and submissions stay review-only instead of entering a corpus pipeline",()=>{
  const r=classifyDocumentForIngest("ДОГОВОРНИ СТРАНИ склучуваат договор. Предмет на договорот е услуга.");
  assert.equal(r.route,"review_only");
  assert.equal(r.autoRouteAllowed,false);
  assert.equal(r.downstream.id,"legal_analyzer_review");
});

test("mixed batch stays bounded and preserves per-record routing",()=>{
  const batch=buildDocumentRouteBatch([
    {filename:"law.txt",text:"ЗАКОН ЗА ТЕСТ\nЧлен 1\nТекст.\nЧлен 2\nТекст.\nЧлен 3\nТекст."},
    {filename:"case.txt",text:"Врховен суд\nРев.бр. 5/2026\nПРЕСУДА\nСЕ ОДБИВА жалбата.\nОБРАЗЛОЖЕНИЕ"}
  ]);
  assert.equal(batch.recordCount,2);
  assert.equal(batch.records[0].route,"legal_instrument");
  assert.equal(batch.records[1].route,"case_law");
  assert.equal(batch.humanGateRequired,true);
  assert.throws(
    ()=>buildDocumentRouteBatch(Array.from({length:501},(_,i)=>({filename:String(i),text:"текст"}))),
    /batch_limit/
  );
});
