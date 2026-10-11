import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan=JSON.parse(fs.readFileSync("ingest/mk/plans/zro-74-2025-reconstruction-plan.json","utf8"));

test("ZRO74-1 exact source and chronology are fixed",()=>{
  assert.equal(plan.instrument_key,"mk:zro");
  assert.equal(plan.amendment.issue_number,"74/2025");
  assert.equal(plan.amendment.issue_date,"2025-04-08");
  assert.equal(plan.amendment.article_count,26);
  assert.equal(plan.amendment.sha256,"c5289c8e6b015d103bc17beb8686dbaca7b874c2b121888da8927cb320d309ba");
  assert.equal(plan.target.valid_from,"2025-04-16");
  assert.equal(plan.target.application_from,"2025-04-16");
});

test("ZRO74-2 all 26 amendment articles are covered in nondecreasing statutory order",()=>{
  const nums=plan.operations.map(x=>x.amendment_article);
  for(let i=1;i<nums.length;i++) assert.ok(nums[i]>=nums[i-1],`${nums[i]} after ${nums[i-1]}`);
  assert.deepEqual([...new Set(nums)],[...Array(26)].map((_,i)=>i+1));
});

test("ZRO74-3 all text operations are exact-match governed",()=>{
  for(const op of plan.operations.filter(x=>x.op==="textual_edit")){
    assert.ok(Number.isInteger(op.expected_matches) && op.expected_matches>=1,`${op.amendment_article}/${op.target}`);
    assert.equal(typeof op.find,"string");
    assert.equal(typeof op.replace,"string");
  }
});

test("ZRO74-4 full replacements are only 213-b and 258-b and paragraph replacement is only 266-b(1)",()=>{
  assert.deepEqual(plan.operations.filter(x=>x.op==="replace_article").map(x=>x.target),["213-б","258-б"]);
  const rp=plan.operations.filter(x=>x.op==="replace_paragraph");
  assert.equal(rp.length,1);
  assert.equal(rp[0].target,"266-б");
  assert.equal(rp[0].paragraph,"1");
});

test("ZRO74-5 Article 26 remains non-text entry-into-force rule",()=>{
  const x=plan.operations.filter(x=>x.amendment_article===26);
  assert.equal(x.length,1);
  assert.equal(x[0].op,"non_text");
  assert.equal(x[0].kind,"entry_into_force");
  assert.match(x[0].source_text,/осмиот ден/);
});

test("ZRO74-6 reviewed Unicode normalization is explicit and source text remains verbatim",()=>{
  assert.equal(plan.reviewed_source_typography.length,1);
  const n=plan.reviewed_source_typography[0];
  assert.deepEqual(n.amendment_articles,[15,17]);
  assert.equal(n.source_token,"Mинистерството");
  assert.equal(n.derived_token,"Министерството");
  assert.ok(plan.operations.filter(x=>[15,17].includes(x.amendment_article)).some(x=>x.source_text.includes("Mинистерството")));
  assert.ok(plan.operations.filter(x=>[15,17].includes(x.amendment_article)&&x.op==="textual_edit").every(x=>!x.replace.includes("Mинистерството")));
});

test("ZRO74-7 source lexical spellings are not silently corrected",()=>{
  assert.ok(plan.operations.filter(x=>[8,14].includes(x.amendment_article)).some(x=>x.replace==="министерот за дигитална транформација"));
  assert.match(plan.operations.find(x=>x.amendment_article===20).new_text,/кваратален преглед/);
});

test("ZRO74-8 target remains candidate-only",()=>{
  assert.equal(plan.target.status,"needs_version_review");
  assert.equal(plan.target.human_review_status,"pending");
  assert.notEqual(plan.target.status,"current_consolidated");
});
