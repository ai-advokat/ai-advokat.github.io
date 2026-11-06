import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ZKP_JUDGMENT_TAXONOMY_VERSION,
  ZKP_JUDGMENT_TAXONOMY_ARTICLES,
  isZkpJudgmentTaxonomyRequest,
  formatZkpJudgmentTaxonomyAnswer
} from "../src/zkp-judgment-taxonomy.js";

test("ZKP judgment taxonomy request detection is bounded",()=>{
  assert.equal(ZKP_JUDGMENT_TAXONOMY_VERSION,"AI_ADVOCAT_ZKP_JUDGMENT_TAXONOMY_V1");
  assert.deepEqual([...ZKP_JUDGMENT_TAXONOMY_ARTICLES],["401","402","403","404"]);
  assert.equal(isZkpJudgmentTaxonomyRequest("Кои се законските видови пресуди во ЗКП?"),true);
  assert.equal(isZkpJudgmentTaxonomyRequest("Што е притвор?"),false);
});

test("source-first formatter preserves exact statutory judgment names",()=>{
  const articles=[
    {articleNumber:"401",heading:"Видови пресуди"},
    {articleNumber:"402",heading:"Одбивателна пресуда"},
    {articleNumber:"403",heading:"Ослободителна пресуда"},
    {articleNumber:"404",heading:"Осудителна пресуда"}
  ];
  const out=formatZkpJudgmentTaxonomyAnswer({title:"Закон за кривичната постапка"},articles);
  assert.match(out,/Одбивателна пресуда — член 402/);
  assert.match(out,/Ослободителна пресуда — член 403/);
  assert.match(out,/Осудителна пресуда — член 404/);
  assert.match(out,/членови 401–404/);
});

test("formatter fails closed when statutory heading evidence is incomplete",()=>{
  const articles=[
    {articleNumber:"401",heading:"Видови пресуди"},
    {articleNumber:"402",heading:"Одбивателна пресуда"},
    {articleNumber:"403",heading:"Ослободителна пресуда"}
  ];
  assert.equal(formatZkpJudgmentTaxonomyAnswer({title:"ЗКП"},articles),null);
});

test("shared runtime explicitly retrieves 401-404 before deterministic fallback",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/ZKP_JUDGMENT_TAXONOMY_ARTICLES/);
  assert.match(worker,/instrumentKey==="mk:zkp" && isZkpJudgmentTaxonomyRequest\(q\)/);
  assert.match(worker,/formatZkpJudgmentTaxonomyAnswer\(instrument,articles\)/);
});
