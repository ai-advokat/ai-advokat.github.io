import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("professional-tools.html","utf8");
const ui=fs.readFileSync("assets/professional-tools.js","utf8");
const core=fs.readFileSync("src/legal-analyzer.js","utf8");

test("Batch Review activates the existing Legal Analyzer core instead of duplicating it",()=>{
  assert.match(ui,/import \{ analyzeLegalDocument, buildReviewTable \} from "\/src\/legal-analyzer\.js"/);
  assert.match(core,/export function buildReviewTable\(documents=\[\]\)/);
  assert.match(page,/Batch Review · до 100 документи/);
  assert.match(page,/id="batchFiles"[^>]*multiple/);
  assert.match(page,/id="batchReviewBody"/);
});

test("Batch Review is browser-local, bounded and Human-Gate labelled",()=>{
  assert.match(ui,/files\.length>100/);
  assert.match(ui,/file\.size\|\|0\)>2_000_000/);
  assert.match(ui,/buildReviewTable\(docs\)/);
  assert.match(page,/без upload на сервер/);
  assert.match(page,/Human Gate останува задолжителен/);
});

test("Batch Review exports the same governed rows as CSV and JSON",()=>{
  assert.match(page,/id="exportBatchCsv"/);
  assert.match(page,/id="exportBatchJson"/);
  assert.match(ui,/legal-analyzer-batch-review\.csv/);
  assert.match(ui,/legal-analyzer-batch-review\.json/);
  assert.match(ui,/sourceVerification/);
  assert.match(ui,/humanGate/);
});
