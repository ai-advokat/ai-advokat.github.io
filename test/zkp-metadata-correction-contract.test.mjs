import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const wf=fs.readFileSync(".github/workflows/zkp-metadata-correction-staging.yml","utf8");
const sql=fs.readFileSync("migrations/0036_zkp_entry_application_metadata_correction.sql","utf8");
const req=JSON.parse(fs.readFileSync(".github/activation/zkp-metadata-correction-staging-2026-10-12.json","utf8"));

test("ZKPMC1 activation is staging-only and forbids promotion/text mutation",()=>{
  assert.equal(req.environment,"staging");
  assert.equal(req.production_write_authorized,false);
  assert.equal(req.article_text_mutation_authorized,false);
  assert.equal(req.current_law_promotion_authorized,false);
  assert.equal(req.human_gate_mutation_authorized,false);
});

test("ZKPMC2 workflow applies migration only to PREVIEW_DB",()=>{
  const fileLines=wf.split("\n").filter(x=>/--file migrations\/0036_/.test(x));
  assert.equal(fileLines.length,1);
  assert.match(fileLines[0],/d1 execute PREVIEW_DB /);
  for(const line of wf.split("\n").filter(x=>/d1 execute ai-advokat-db /.test(x))){
    assert.match(line,/--json --command/);
    assert.doesNotMatch(line,/--file/);
  }
});

test("ZKPMC3 migration changes metadata only and preserves current/Human Gate",()=>{
  assert.match(sql,/effective_date='2010-11-26'/);
  assert.match(sql,/valid_from='2018-10-31'/);
  assert.doesNotMatch(sql,/UPDATE\s+legal_article_versions/i);
  assert.doesNotMatch(sql,/SET\s+is_current\s*=\s*1/i);
  assert.doesNotMatch(sql,/human_review_status\s*=\s*'approved'/i);
  assert.doesNotMatch(sql,/current_status\s*=\s*'active'/i);
});

test("ZKPMC4 production unchanged verification compares normalized logical result rows only",()=>{
  assert.match(wf,/ZKP PRODUCTION LOGICAL RESULTS UNCHANGED: PASS/);
  assert.match(wf,/payload\?\.\[0\]\?\.results \?\? \[\]/);
  assert.match(wf,/Object\.entries\(row\)\.sort/);
  assert.match(wf,/production logical query results changed/);
  assert.doesNotMatch(wf,/JSON\.stringify\(JSON\.parse\(fs\.readFileSync\("\/tmp\/zkp-prod-before\.json"/);
  assert.match(wf,/current_consolidated/);
});
