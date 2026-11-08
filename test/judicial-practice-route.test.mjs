import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const index=fs.readFileSync("index.html","utf8");
const page=fs.readFileSync("judicial-practice.html","utf8");
const workflow=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");

test("header exposes exactly one canonical Judicial Practice link",()=>{
  const matches=index.match(/href="\/judicial-practice\.html"/g)||[];
  assert.equal(matches.length,1);
  assert.match(index,/data-header-legal="judicial-practice"/);
});

test("Judicial Practice canonical page exists and has governed source-first contract",()=>{
  assert.match(page,/SOURCE-FIRST · REVIEWED AUTHORITY · HUMAN GATE/);
  assert.match(page,/Discovery запис не е правен авторитет/);
});

test("Pages sync copies and parity-checks Judicial Practice",()=>{
  const copyBlock=workflow.slice(workflow.indexOf("files=("),workflow.indexOf("for f in"));
  assert.match(copyBlock,/judicial-practice\.html/);
  const parity=workflow.slice(workflow.indexOf("Verify branch parity"));
  assert.match(parity,/judicial-practice\.html/);
});
