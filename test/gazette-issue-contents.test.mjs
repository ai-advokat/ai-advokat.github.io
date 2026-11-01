import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  gazetteActTypeLabel,
  formatGazetteIssueContents
} from "../src/gazette-issue-contents.js";

const worker=fs.readFileSync("src/index.js","utf8");
const workflow=fs.readFileSync(".github/workflows/gazette-act-index-2009-2016-production.yml","utf8");
const activation=JSON.parse(fs.readFileSync(".github/activation/gazette-act-index-2009-2016-production-request.json","utf8"));
const sqlBuilder=fs.readFileSync("scripts/gazette_act_index_sql.py","utf8");

test("GIC1 act types cover laws, decisions, rulebooks and remaining official register classes",()=>{
  assert.equal(gazetteActTypeLabel("law"),"Закон");
  assert.equal(gazetteActTypeLabel("decision"),"Одлука");
  assert.equal(gazetteActTypeLabel("rulebook"),"Правилник");
  assert.equal(gazetteActTypeLabel("decree"),"Уредба");
  assert.equal(gazetteActTypeLabel("resolution"),"Решение");
  assert.equal(gazetteActTypeLabel("correction"),"Исправка");
  assert.equal(gazetteActTypeLabel("announcement"),"Објава");
  assert.equal(gazetteActTypeLabel("other"),"Друго");
});

test("GIC2 formatter lists every act in issue order with type, issuer and page",()=>{
  const acts=[
    {actTypeLabel:"Закон",title:"Закон А",actNumber:null,issuer:"Собрание",pageStart:1,pageEnd:4,humanReviewStatus:"pending"},
    {actTypeLabel:"Одлука",title:"Одлука Б",actNumber:"12",issuer:"Влада",pageStart:5,pageEnd:5,humanReviewStatus:"pending"},
    {actTypeLabel:"Правилник",title:"Правилник В",actNumber:null,issuer:"Министерство",pageStart:6,pageEnd:8,humanReviewStatus:"pending"}
  ];
  const text=formatGazetteIssueContents({state:"matched",total:acts.length,allReviewed:false,acts});
  assert.match(text,/Вкупно индексирани акти: 3/);
  assert.match(text,/Закон: 1/);
  assert.match(text,/Одлука: 1/);
  assert.match(text,/Правилник: 1/);
  assert.ok(text.indexOf("1. [Закон] Закон А") < text.indexOf("2. [Одлука] Одлука Б"));
  assert.ok(text.indexOf("2. [Одлука] Одлука Б") < text.indexOf("3. [Правилник] Правилник В"));
  assert.match(text,/стр. 1-4/);
  assert.match(text,/доносител: Влада/);
  assert.match(text,/Human Gate сè уште не е финализиран/);
  assert.match(text,/не автоматска|не е автоматско/);
});

test("GIC3 missing act index fails closed instead of inventing issue contents",()=>{
  const text=formatGazetteIssueContents({state:"not_indexed",total:0,acts:[]});
  assert.match(text,/нема активиран act-level индекс/);
  assert.match(text,/не наведува закони, одлуки, правилници или други акти без изворна потврда/);
});

test("GIC4 Worker exposes deterministic issue-contents endpoint and chat payload",()=>{
  assert.match(worker,/findGazetteIssueContents/);
  assert.match(worker,/formatGazetteIssueContents/);
  assert.match(worker,/\/api\/gazette-issue-contents/);
  assert.match(worker,/gazetteIssueContents:/);
  assert.match(worker,/current-law проверка/);
});

test("GIC5 production activation promotes metadata only and keeps legal authority closed",()=>{
  assert.equal(activation.activation_authorized,true);
  assert.deepEqual(activation.years,[2009,2016]);
  assert.equal(activation.act_index_metadata_promotion_authorized,true);
  assert.equal(activation.full_text_promotion_authorized,false);
  assert.equal(activation.current_law_promotion_authorized,false);
  assert.equal(activation.human_review_status_on_ingest,"pending");
  assert.match(sqlBuilder,/official_register_index_only/);
  assert.match(sqlBuilder,/human_review_status.*pending/s);
  assert.match(workflow,/zero-unresolved register extraction/i);
  assert.match(workflow,/OFFICIAL ISSUE BACKBONE RECONCILIATION: PASS/);
  assert.match(workflow,/LIVE GAZETTE ISSUE -> ALL ACTS: PASS/);
});

test("GIC6 exact 1\/2009 and 1\/2016 production acceptance is required",()=>{
  assert.match(workflow,/issue 1 act list missing for/);
  assert.match(workflow,/year=2009&issue=1/);
  assert.match(workflow,/year=2016&issue=1/);
  assert.match(workflow,/Содржина на бројот:/);
  assert.match(workflow,/Вкупно индексирани акти:/);
});
