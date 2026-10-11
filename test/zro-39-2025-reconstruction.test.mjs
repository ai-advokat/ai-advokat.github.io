import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseLegalText } from "../scripts/parse-mk-legal-text.mjs";
import { applyAmendments } from "../scripts/apply-amendments.mjs";

const plan=JSON.parse(fs.readFileSync("ingest/mk/plans/zro-39-2025-reconstruction-plan.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/zro-39-2025-offline-reconstruction.yml","utf8");

const baseMeta={
  instrument_key:"mk:zro",
  instrument_title:"Закон за работните односи",
  version_id:"official-consolidated-snapshot-2023-111",
  source_url:plan.base.url,
  source_sha256:plan.base.sha256,
  source_issue_number:"through-111/2023",
  source_issue_date:"2023-05-30",
  status:"historical",
  human_review_status:"pending"
};
const miniBaseText=[
  "Член 103",
  "Договорот престанува поради трајна неспособност.",
  "Член 104",
  "Договорот за вработување работодавачот го прекинува кога работникот ќе наполни 64 години возраст и 15 години пензиски стаж, доколку со друг закон поинаку не е уредено.",
  "Член 105",
  "(1) Работникот има право на заработувачка - плата."
].join("\n");

function miniBase(){
  const p=parseLegalText(miniBaseText,baseMeta);
  return {manifest:{type:"ingest_manifest",...p,records:undefined},records:p.records};
}

test("ZRO39-1 plan is exact four-operation chronological coverage",()=>{
  assert.equal(plan.engine_input_version,1);
  assert.equal(plan.instrument_key,"mk:zro");
  assert.equal(plan.amendment.issue_number,"39/2025");
  assert.equal(plan.amendment.article_count,4);
  assert.deepEqual(plan.operations.map(x=>x.amendment_article),[1,2,3,4]);
  assert.deepEqual(plan.operations.map(x=>x.op),["textual_edit","insert_article","non_text","non_text"]);
});

test("ZRO39-2 Article 104 edit is one whole-word deletion only",()=>{
  const op=plan.operations[0];
  assert.equal(op.target,"104");
  assert.equal(op.find,"друг");
  assert.equal(op.replace,"");
  assert.equal(op.expected_matches,1);
  assert.equal(op.whole_word,true);
});

test("ZRO39-3 inserted Article 104-a is fully source-defined",()=>{
  const op=plan.operations[1];
  assert.equal(op.after,"104");
  assert.equal(op.number,"104-а");
  assert.match(op.text,/^Продолжување на работен однос на избрани и именувани лица/);
  assert.match(op.text,/најмногу до 67 години возраст/);
  assert.match(op.text,/најдоцна до 31 август/);
});

test("ZRO39-4 transitional and entry provisions remain non-text operations",()=>{
  assert.deepEqual(plan.operations.slice(2).map(x=>x.kind),["transitional","entry_into_force"]);
  assert.match(plan.operations[2].source_text,/во рок од 30 дена/);
  assert.match(plan.operations[3].source_text,/влегува во сила со денот на објавувањето/);
});

test("ZRO39-5 engine produces a pending candidate and preserves provenance",()=>{
  const result=applyAmendments(miniBase(),plan);
  const by=Object.fromEntries(result.records.map(r=>[r.article_number_normalized,r]));
  assert.equal(result.log.verdict,"APPLIED");
  assert.equal(result.records.length,4);
  assert.deepEqual(result.log.summary.inserted,["104-а"]);
  assert.deepEqual(result.log.summary.non_text,[
    {amendment_article:3,kind:"transitional"},
    {amendment_article:4,kind:"entry_into_force"}
  ]);
  assert.doesNotMatch(by["104"].article_text,/\bдруг\b/u);
  assert.match(by["104"].article_text,/доколку со закон поинаку не е уредено/);
  assert.equal(by["104-а"].article_heading,"Продолжување на работен однос на избрани и именувани лица");
  assert.match(by["104-а"].article_text,/67 години возраст/);
  assert.equal(by["104"].derived_from.at(-1).issue_number,"39/2025");
  assert.equal(by["104-а"].source.sha256,plan.amendment.sha256);
  for(const r of result.records){
    assert.equal(r.status,"needs_version_review");
    assert.equal(r.human_review_status,"pending");
    assert.notEqual(r.status,"current_consolidated");
  }
});

test("ZRO39-6 target cannot claim current law or Human Gate approval",()=>{
  assert.equal(plan.target.status,"needs_version_review");
  assert.equal(plan.target.human_review_status,"pending");
  assert.notEqual(plan.target.status,"current_consolidated");
});

test("ZRO39-7 audit workflow is offline-only with no D1 or secret access",()=>{
  assert.doesNotMatch(workflow,/wrangler\s+d1/i);
  assert.doesNotMatch(workflow,/CLOUDFLARE_/);
  assert.doesNotMatch(workflow,/db:migrate/i);
  assert.doesNotMatch(workflow,/legal_article_version_candidates/);
  assert.match(workflow,/apply-amendments\.mjs/);
});
