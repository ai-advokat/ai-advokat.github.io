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


test("GC6 act purpose metadata is source-grounded and reviewable",()=>{
  const purposeMigration=fs.readFileSync("migrations/0039_gazette_act_purpose_metadata.sql","utf8");
  for(const col of ["subject_matter","adoption_purpose","legal_problem_addressed","affected_area","purpose_source_basis","purpose_review_status"]){
    assert.match(purposeMigration,new RegExp(col));
  }
  assert.equal(manifest.publication_policy.act_purpose_must_be_source_grounded,true);
  assert.equal(manifest.publication_policy.unsupported_purpose_inference,false);
});


test("GC7 hybrid legal intelligence covers legal effects, applicability and practical use",()=>{
  const hybrid=JSON.parse(fs.readFileSync("data/gazette-hybrid-legal-intelligence.json","utf8"));
  assert.equal(hybrid.layers.length,9);
  for(const view of ["Што се смени?","Кого го засега?","Од кога важи/се применува?","Што треба да направам?"]){
    assert.ok(hybrid.output_views.includes(view));
  }
  assert.ok(hybrid.mandatory_rules.some(x=>x.includes("Human Gate")));
  assert.ok(hybrid.mandatory_rules.some(x=>x.includes("Effective date")));
});

test("GC8 hybrid schema stores rights, duties, deadlines, sanctions and cross-authority links",()=>{
  const migration=fs.readFileSync("migrations/0040_gazette_hybrid_legal_intelligence.sql","utf8");
  for(const field of ["rights_created","obligations_created","sanctions_consequences","deadlines_time_limits","eu_alignment","constitutional_context","case_law_context","citizen_summary","professional_summary","compliance_action"]){
    assert.match(migration,new RegExp(field));
  }
  assert.match(migration,/gazette_act_relationships/);
  assert.match(migration,/gazette_act_effects/);
});
