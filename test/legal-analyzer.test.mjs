import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGAL_ANALYZER_VERSION,
  extractOfficialIdentifiers,
  extractLegalReferences,
  classifyLegalDocument,
  analyzeLegalDocument,
  buildReviewTable
} from "../src/legal-analyzer.js";

test("does not fabricate ECLI",()=>{
  const ids=extractOfficialIdentifiers("Основен суд Скопје, К.бр. 101/26");
  assert.equal(ids.generatedIdentifier,null);
  assert.equal(ids.ecli.length,0);
  assert.match(ids.referenceNumbers[0],/К\.бр\./i);
});

test("extracts literal ECLI only",()=>{
  const ids=extractOfficialIdentifiers("ECLI:MK:VS:2026:123.1");
  assert.deepEqual(ids.ecli,["ECLI:MK:VS:2026:123.1"]);
});

test("extracts article references",()=>{
  const refs=extractLegalReferences("Согласно член 26 став 2 и чл. 106 од Законот за општата управна постапка.");
  assert.ok(refs.articles.some(v=>v.includes("26")));
  assert.ok(refs.articles.some(v=>v.includes("106")));
});

test("classifies criminal material deterministically without confidence fiction",()=>{
  const c=classifyLegalDocument("Обвинетиот е гонет за кривично дело. Јавен обвинител предложи казна.");
  assert.equal(c.type,"criminal_judgment");
  assert.equal(c.statisticalConfidence,null);
});

test("analyzer keeps Human Gate locked",()=>{
  const a=analyzeLegalDocument({
    filename:"presuda.txt",
    text:"Врховен суд. К.бр. 101/26. Согласно член 26. На 10.10.2026 година судот донесе решение.",
    sourceVerification:"not_verified"
  });
  assert.equal(a.version,LEGAL_ANALYZER_VERSION);
  assert.equal(a.humanGate.required,true);
  assert.equal(a.humanGate.professionalUse,"locked_until_human_review");
  assert.equal(a.provenance.generatedOfficialIdentifier,false);
  assert.equal(a.reviewRow.completeness.statisticalConfidence,null);
});

test("review table is batch bounded",()=>{
  const table=buildReviewTable([
    {filename:"a.txt",text:"Управен суд. У.бр. 148/2024. член 26. 02.10.2024."},
    {filename:"b.txt",text:"Договорни страни склучуваат договор со рок од 15 дена."}
  ]);
  assert.equal(table.rows.length,2);
  assert.equal(table.humanGateRequired,true);
  assert.throws(
    ()=>buildReviewTable(Array.from({length:101},(_,i)=>({filename:String(i),text:"документ"}))),
    /batch_limit/
  );
});
