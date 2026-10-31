import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("migrations/0030_case_law_source_graph_v2.sql","utf8");
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));

test("CLSRC1 official domestic and European source lanes are registered",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  for(const id of ["mk-constitutional-court","mk-supreme-court","mk-judicial-portal","mk-ministry-court-directory","echr-hudoc","cjeu-infocuria","eu-eurlex-case-law","paragraf-mk"]){
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


test("CLSRC6 EUR-Lex and Paragraf product lineage are explicit",()=>{
  const eurlex=registry.sources.find(x=>x.id==="eu-eurlex-case-law");
  assert.equal(eurlex.access,"official_public");
  assert.equal(eurlex.identifier,"ECLI_and_CELEX");
  const p=registry.sources.find(x=>x.id==="paragraf-mk");
  assert.deepEqual(p.products,["Lex","Nova","LexAI"]);
  assert.equal(p.official_binding_required_before_gpt_case_law_context,true);
  assert.match(p.product_policy,/never changes the record's authority class/i);
  for(const key of ["celex","hudoc_item_id","source_product","source_record_id","official_binding_verified"]){
    assert.ok(registry.target_case_record.recommended.includes(key),key);
  }
});

test("CLSRC7 migration 0031 adds deduplication identifiers and official-binding provenance",()=>{
  const m=fs.readFileSync("migrations/0031_case_law_identifiers_and_provenance.sql","utf8");
  assert.match(m,/CREATE TABLE IF NOT EXISTS case_law_external_ids/);
  assert.match(m,/UNIQUE \(id_scheme,id_value\)/);
  assert.match(m,/CREATE TABLE IF NOT EXISTS case_law_provenance/);
  assert.match(m,/official_binding_verified/);
  assert.match(m,/licensed_secondary/);
  assert.match(m,/EUR-Lex EU case-law/);
});


test("CLSRC8 official international court lanes and secondary discovery lanes remain distinct",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  for(const id of ["icj-official","itlos-official","iacthr-official","icc-official","worldcourts","worldlii","un-dag-legal-research"]){
    assert.ok(byId.has(id),id);
  }
  assert.equal(byId.get("icj-official").access,"official_public");
  assert.equal(byId.get("itlos-official").authority_class,"international_court_case_law");
  assert.equal(byId.get("iacthr-official").authority_class,"comparative_human_rights_case_law");
  assert.equal(byId.get("icc-official").authority_class,"international_criminal_case_law");
  assert.match(byId.get("worldcourts").authority_class,/secondary/);
  assert.match(byId.get("worldlii").authority_class,/secondary/);
  assert.equal(byId.get("worldcourts").official_binding_required_before_gpt_case_law_context,true);
  assert.equal(byId.get("worldlii").official_binding_required_before_gpt_case_law_context,true);
  assert.equal(byId.get("un-dag-legal-research").ingest,"source_discovery_only");
});

test("CLSRC9 international case-law metadata includes domestic-effect and provenance fields",()=>{
  for(const id of ["icj-official","itlos-official","iacthr-official","icc-official"]){
    const s=registry.sources.find(x=>x.id===id);
    assert.match(s.domestic_effect_note,/North Macedonian|North Macedonia|Rome Statute|law-of-the-sea/i,id);
  }
  for(const key of ["international_court_case_number","official_document_id","series_or_report_reference","translation_status","domestic_effect_class"]){
    assert.ok(registry.target_case_record.recommended.includes(key),key);
  }
});


test("CLSRC10 BAILII remains manual secondary discovery and automated access is prohibited",()=>{
  const b=registry.sources.find(x=>x.id==="bailii");
  assert.ok(b);
  assert.equal(b.authority_class,"secondary_case_law_discovery");
  assert.equal(b.ingest,"link_only_no_automated_access");
  assert.equal(b.official_binding_required_before_gpt_case_law_context,true);
  for(const rule of ["bulk_downloading","scraping","automated_systems"]){
    assert.ok(b.forbidden.includes(rule),rule);
  }
  for(const key of ["ratio_or_holding_status","subsequent_treatment","distinguished_or_overruled_status"]){
    assert.ok(registry.target_case_record.recommended.includes(key),key);
  }
});


test("CLSRC11 Judicial Portal search results fail closed until record kind and document provenance are resolved",()=>{
  const p=registry.sources.find(x=>x.id==="mk-judicial-portal");
  assert.ok(p);
  assert.equal(p.displayed_result_count_snapshot.count,899778);
  assert.match(p.displayed_result_count_snapshot.scope,/not a verified count of final judgments/i);
  assert.ok(Array.isArray(p.supreme_court_interpretive_sections));
  for(const label of ["Начелни правни мислења","Начелни ставови","Правни мислења и заклучоци","Сентенци"]){
    assert.ok(p.supreme_court_interpretive_sections.includes(label),label);
  }
  for(const key of ["record_kind","displayed_decision_date","internal_document_date","date_conflict_status","related_case_numbers","authority_subtype"]){
    assert.ok(registry.target_case_record.recommended.includes(key),key);
  }
  assert.equal(p.privacy_minimisation,true);
});


test("CLSRC12 appellate bulletin and joint-meeting lanes remain provenance-gated",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  for(const id of ["mk-appellate-skopje-bulletins","mk-appellate-bitola-bulletins","mk-appellate-gostivar-bulletins","mk-joint-appellate-meeting-materials"]){
    assert.ok(byId.has(id),id);
  }
  for(const id of ["mk-appellate-skopje-bulletins","mk-appellate-bitola-bulletins","mk-appellate-gostivar-bulletins"]){
    const s=byId.get(id);
    assert.equal(s.authority_class,"appellate_case_law_publication_reference");
    assert.equal(s.original_decision_binding_required_before_gpt_case_law_context,true);
    assert.equal(s.privacy_minimisation,true);
  }
  const joint=byId.get("mk-joint-appellate-meeting-materials");
  assert.equal(joint.authority_class,"joint_appellate_interpretive_reference");
  assert.equal(joint.current_law_verification_required,true);
  assert.match(joint.authority_note,/not ordinary judgments/i);
});


test("CLSRC13 B3 governed reference lanes preserve authority boundaries",()=>{
  const byId=new Map(registry.sources.map(x=>[x.id,x]));
  const cid="mk-judicial-reference-batch-2026-10-31-b3";
  const constitutional=byId.get("mk-constitutional-court");
  assert.ok(constitutional.additional_corpus_ids.includes(cid));
  assert.equal(constitutional.original_decision_binding_required_before_gpt_case_law_context,true);
  assert.equal(constitutional.historical_current_law_gate,true);

  const skopje=byId.get("mk-appellate-skopje-bulletins");
  assert.ok(skopje.additional_corpus_ids.includes(cid));
  assert.ok(skopje.covered_bulletins.includes("12"));
  assert.equal(skopje.current_law_verification_required,true);

  const notary=byId.get("mk-notary-chamber-publications");
  assert.equal(notary.authority_class,"professional_institutional_notarial_reference");
  assert.equal(notary.current_law_verification_required,true);
  assert.match(notary.authority_note,/not court precedent/i);

  const register=byId.get("mk-civil-commercial-case-register-2018-2019");
  assert.equal(register.ingest,"case_number_and_topic_discovery_only");
  assert.ok(register.forbidden_authority_use.includes("not_a_holding_source"));

  const mixed=byId.get("mk-simulated-contracts-secondary-compilation");
  assert.match(mixed.authority_class,/secondary_mixed_jurisdiction/);
  assert.equal(mixed.official_binding_required_before_gpt_case_law_context,true);

  const rs=byId.get("rs-inheritance-secondary-extract");
  assert.equal(rs.jurisdiction,"RS");
  assert.ok(rs.forbidden_authority_use.includes("not_north_macedonian_authority"));
});
