import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const plan=JSON.parse(fs.readFileSync("ingest/mk/plans/zro-124-2025-reconstruction-plan.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/zro-124-2025-offline-reconstruction.yml","utf8");

test("ZRO124-1 official source fingerprint and chronology are fixed",()=>{
  assert.equal(plan.instrument_key,"mk:zro");
  assert.equal(plan.amendment.issue_number,"124/2025");
  assert.equal(plan.amendment.issue_date,"2025-06-19");
  assert.equal(plan.amendment.article_count,2);
  assert.equal(plan.amendment.sha256,"a300554b91884449a46ee3b1df2ae168fea9a24e53a12dafa49647e83e0807fd");
  assert.equal(plan.target.valid_from,"2025-06-19");
  assert.equal(plan.target.application_from,"2025-06-19");
});

test("ZRO124-2 operation matrix is exactly one Article 212 edit plus entry rule",()=>{
  assert.equal(plan.operations.length,2);
  const [edit,entry]=plan.operations;
  assert.equal(edit.op,"textual_edit");
  assert.equal(edit.amendment_article,1);
  assert.equal(edit.target,"212");
  assert.equal(edit.paragraph,"1");
  assert.equal(edit.find,"10%");
  assert.equal(edit.replace,"5%");
  assert.equal(edit.expected_matches,1);
  assert.match(edit.source_text,/точката 2)/);
  assert.match(edit.source_text,/10%/);
  assert.match(edit.source_text,/5%/);
  assert.equal(entry.op,"non_text");
  assert.equal(entry.amendment_article,2);
  assert.equal(entry.kind,"entry_into_force");
  assert.match(entry.source_text,/со денот на објавувањето/);
});

test("ZRO124-3 target remains review candidate only",()=>{
  assert.equal(plan.target.version_label,"derived-candidate-through-124/2025");
  assert.equal(plan.target.status,"needs_version_review");
  assert.equal(plan.target.human_review_status,"pending");
  assert.notEqual(plan.target.status,"current_consolidated");
});

test("ZRO124-4 workflow is strictly offline",()=>{
  assert.doesNotMatch(workflow,/wrangler\s+d1/i);
  assert.doesNotMatch(workflow,/CLOUDFLARE_/);
  assert.doesNotMatch(workflow,/db:migrate/i);
  assert.match(workflow,/zro-through-39-2025\.ndjson/);
  assert.match(workflow,/zro-through-74-2025\.ndjson/);
  assert.match(workflow,/zro-through-124-2025\.ndjson/);
});

test("ZRO124-5 workflow enforces exact candidate invariants",()=>{
  assert.match(workflow,/candidate_articles=299/);
  assert.match(workflow,/changed_articles=1/);
  assert.match(workflow,/operations=2/);
  assert.match(workflow,/new_parser_warnings.*==0/);
  assert.match(workflow,/human_gate=pending/);
  assert.match(workflow,/database_writes=0/);
});
