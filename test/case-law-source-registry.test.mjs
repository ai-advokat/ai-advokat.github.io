import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("migrations/0030_case_law_source_graph_v2.sql","utf8");
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));

test("CLSRC1 official domestic and European source lanes are registered",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  for(const id of ["mk-constitutional-court","mk-supreme-court","mk-judicial-portal","echr-hudoc","cjeu-infocuria","paragraf-mk"]){
    assert.ok(byId.has(id),id);
  }
  assert.equal(byId.get("echr-hudoc").jurisdiction,"ECHR");
  assert.equal(byId.get("echr-hudoc").identifier,"application_number");
  assert.equal(byId.get("cjeu-infocuria").jurisdiction,"EU");
  assert.match(byId.get("cjeu-infocuria").domestic_effect_note,/not classify as automatically binding/i);
});

test("CLSRC2 Paragraf is licensed secondary discovery only without credential or paywall bypass",()=>{
  const p=registry.sources.find(x=>x.id==="paragraf-mk");
  assert.equal(p.authority_class,"licensed_secondary_discovery");
  assert.equal(p.ingest,"link_only_without_license");
  for(const forbidden of ["credential_bypass","session_hijack","paywall_bypass","automated_copy_of_restricted_database"]){
    assert.ok(p.forbidden.includes(forbidden),forbidden);
  }
  assert.match(p.licensed_import_condition,/authorized export|lawful subscription|rights holder/i);
  assert.match(migration,/https:\/\/paragraf\.mk\//);
  assert.match(migration,/secondary_reference','link_only',0,0,0/);
  assert.match(migration,/No scraping of subscriber-only/i);
});

test("CLSRC3 migration extends existing court graph rather than creating a parallel case-law system",()=>{
  assert.match(migration,/ALTER TABLE court_registry ADD COLUMN jurisdiction/);
  assert.match(migration,/echr-hudoc/);
  assert.match(migration,/cjeu-infocuria/);
  assert.doesNotMatch(migration,/CREATE TABLE IF NOT EXISTS case_law\b/);
  assert.doesNotMatch(migration,/CREATE TABLE IF NOT EXISTS court_registry\b/);
});

test("CLSRC4 case records require provenance, jurisdiction and human review",()=>{
  const required=new Set(registry.target_case_record.required);
  for(const key of [
    "court","jurisdiction","decision_type","case_number_or_application_number","decision_date",
    "source_url","source_hash","legal_issue_keys","outcome_summary","human_review_status"
  ]) assert.ok(required.has(key),key);
  assert.ok(registry.doctrine.includes("supporting_and_adverse_authority_both_retrieved"));
  assert.ok(registry.doctrine.includes("official_origin_first"));
  assert.ok(registry.doctrine.includes("human_review_for_material_legal_propositions"));
});

test("CLSRC5 European source authority remains explicitly scoped",()=>{
  const echr=registry.sources.find(x=>x.id==="echr-hudoc");
  const cjeu=registry.sources.find(x=>x.id==="cjeu-infocuria");
  assert.equal(echr.authority_class,"convention_case_law");
  assert.equal(cjeu.authority_class,"eu_case_law_reference");
  assert.match(migration,/convention_case_law/);
  assert.match(migration,/eu_case_law_reference/);
});
