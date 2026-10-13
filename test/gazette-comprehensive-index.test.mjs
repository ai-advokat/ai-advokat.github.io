import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("migrations/0038_gazette_comprehensive_archive.sql","utf8");
const manifest=JSON.parse(fs.readFileSync("data/gazette-coverage-manifest.json","utf8"));
const doc=fs.readFileSync("docs/gazette/COMPREHENSIVE_INDEX_1944_PRESENT.md","utf8");

test("GC1 coverage target starts at 1944 and extends to present",()=>{
  assert.equal(manifest.coverage_target.from_year,1944);
  assert.equal(manifest.coverage_target.through,"present");
  assert.ok(manifest.coverage_target.dimensions.includes("член"));
  assert.ok(manifest.coverage_target.dimensions.includes("датум на издание"));
  assert.ok(manifest.coverage_target.dimensions.includes("број на издание"));
});

test("GC2 official source contract preserves free issue archive and registers",()=>{
  const kinds=new Set(manifest.official_sources.map(x=>x.kind));
  assert.ok(kinds.has("free_issue_archive"));
  assert.ok(kinds.has("chronological_registers"));
  const regs=manifest.official_sources.find(x=>x.kind==="chronological_registers");
  assert.equal(regs.verified_range,"1991-2025");
});

test("GC3 schema indexes issue, act and article as separate provenance layers",()=>{
  for(const table of ["gazette_issues","gazette_acts","gazette_act_articles","gazette_ingest_batches"]){
    assert.match(migration,new RegExp("CREATE TABLE IF NOT EXISTS "+table));
  }
  assert.match(migration,/target_article_number/);
  assert.match(migration,/effective_date/);
  assert.match(migration,/application_date/);
  assert.match(migration,/source_sha256/);
  assert.match(migration,/human_review_status/);
});

test("GC4 publication policy remains metadata-first and fail-closed",()=>{
  assert.equal(manifest.publication_policy.metadata_index_public,true);
  assert.equal(manifest.publication_policy.bulk_replication_of_gazette,false);
  assert.equal(manifest.publication_policy.subscriber_content_copied,false);
  assert.equal(manifest.publication_policy.current_law_label_requires_human_gate,true);
});

test("GC5 definition of done requires official reconciliation",()=>{
  assert.match(manifest.completion_rule,/COMPLETE/);
  assert.match(manifest.completion_rule,/official source/);
  assert.match(doc,/reconciliation/i);
  assert.match(doc,/Human Gate/);
});
