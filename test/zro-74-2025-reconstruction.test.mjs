import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan=JSON.parse(fs.readFileSync("ingest/mk/plans/zro-74-2025-reconstruction-plan.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/zro-74-2025-offline-reconstruction.yml","utf8");

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


test("ZRO74-9 offline workflow cannot write D1 or access Cloudflare secrets",()=>{
  assert.doesNotMatch(workflow,/wrangler\s+d1/i);
  assert.doesNotMatch(workflow,/CLOUDFLARE_/);
  assert.doesNotMatch(workflow,/db:migrate/i);
  assert.match(workflow,/zro-through-39-2025\.ndjson/);
  assert.match(workflow,/zro-through-74-2025\.ndjson/);
  const apply39=workflow.indexOf("ingest/mk/plans/zro-39-2025-reconstruction-plan.json");
  const apply74=workflow.lastIndexOf("ingest/mk/plans/zro-74-2025-reconstruction-plan.json");
  assert.ok(apply39>=0 && apply74>apply39);
});

test("ZRO74-10 full offline verification requires 299 pending articles and zero new parser warnings",()=>{
  assert.match(workflow,/candidate_articles=299/);
  assert.match(workflow,/changed_articles=25/);
  assert.match(workflow,/operations=40/);
  assert.match(workflow,/new_parser_warnings.*==0/);
  assert.match(workflow,/database_writes=0/);
});
