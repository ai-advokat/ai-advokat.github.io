import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflow=fs.readFileSync(".github/workflows/lioe-runtime-readonly-diagnostic.yml","utf8");

test("LIOE diagnostic is production read-only and privacy-minimised",()=>{
  assert.doesNotMatch(workflow,/environment:\\s*production/);
  assert.match(workflow,/wrangler d1 execute DB --remote/);
  assert.match(workflow,/SELECT run_id,started_at,finished_at/);
  assert.doesNotMatch(workflow,/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bALTER\b/i);
  assert.doesNotMatch(workflow,/question|answer|attachment_text|membership_identity|conversation_history/i);
});

test("LIOE diagnostic is bounded to exact registered run ids",()=>{
  assert.match(workflow,/lioe-runtime-article12-20261101\.json/);
  assert.match(workflow,/WHERE run_id IN/);
  assert.match(workflow,/expected two telemetry rows/);
});
