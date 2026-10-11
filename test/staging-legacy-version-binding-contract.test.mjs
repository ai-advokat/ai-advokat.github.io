import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const req=JSON.parse(fs.readFileSync(".github/activation/staging-legacy-version-binding-2026-10-11.json","utf8"));
const wf=fs.readFileSync(".github/workflows/staging-legacy-version-binding.yml","utf8");

test("SLVB1 activation is staging-only and forbids current-law promotion",()=>{
  assert.equal(req.environment,"staging");
  assert.equal(req.production_write_authorized,false);
  assert.equal(req.current_law_promotion_authorized,false);
  assert.equal(req.human_gate_promotion_authorized,false);
  assert.equal(req.article_text_rewrite_authorized,false);
  assert.equal(req.fail_closed,true);
});

test("SLVB2 migration order is exactly ZI -> ZRO -> ZKP",()=>{
  assert.deepEqual(req.migrations,[
    "0024_zi_legacy_version_backfill.sql",
    "0025_zro_legacy_version_backfill.sql",
    "0026_zkp_legacy_version_backfill.sql"
  ]);
});

test("SLVB3 mutations target PREVIEW_DB only",()=>{
  const writeLines=wf.split("\n").filter(x=>/--file migrations\/002[456]_/.test(x));
  assert.equal(writeLines.length,3);
  for(const line of writeLines) assert.match(line,/d1 execute PREVIEW_DB /);
  assert.match(wf,/d1 execute ai-advokat-db --remote --json --command/);
});

test("SLVB4 production statements are read-only",()=>{
  const lines=wf.split("\n").filter(x=>/d1 execute ai-advokat-db /.test(x));
  assert.ok(lines.length>=2);
  for(const line of lines){
    assert.doesNotMatch(line,/--file/);
    assert.match(line,/--json --command/);
  }
});

test("SLVB5 workflow explicitly verifies no current or Human-Gate promotion",()=>{
  assert.match(wf,/max_is_current/);
  assert.match(wf,/approved_rows/);
  assert.match(wf,/current_article_rows/);
  assert.match(wf,/PRODUCTION UNCHANGED: PASS/);
});
