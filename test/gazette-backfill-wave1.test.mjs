import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const script=fs.readFileSync("scripts/gazette_backfill_wave1.py","utf8");
const workflow=fs.readFileSync(".github/workflows/gazette-backfill-wave1-1991-2025.yml","utf8");

test("GB1 wave one targets 1991-2025 official registers",()=>{
  assert.match(script,/REGISTER_PAGE=/);
  assert.match(script,/FREE_ACCESS_PAGE=/);
  assert.match(workflow,/--from-year 1991/);
  assert.match(workflow,/--to-year 2025/);
});

test("GB2 extracted acts remain pending Human Gate",()=>{
  assert.match(script,/"human_review_status":"pending"/);
  assert.match(workflow,/pending reconciliation and Human Gate/);
});

test("GB3 workflow is paced and auditable",()=>{
  assert.match(workflow,/--delay 0\.8/);
  assert.match(workflow,/actions\/upload-artifact@v4/);
  assert.match(script,/register_source_sha256/);
});
