import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zi-current-law-2026.json","utf8"));

test("ZI-CL1 official editorial snapshot identity is preserved",()=>{
  assert.equal(x.instrument_key,"mk:zi");
  assert.equal(x.official_editorial_consolidation.page_count,99);
  assert.equal(x.official_editorial_consolidation.sha256,"15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55");
  assert.equal(x.current_law_promotion,false);
});

test("ZI-CL2 permanent lineage distinguishes amendments from Constitutional Court effects",()=>{
  const byIssue=new Map(x.official_editorial_consolidation.source_lineage.map(i=>[i.issue,i]));
  assert.equal(byIssue.get("178/2017").kind,"constitutional_court_effect");
  assert.equal(byIssue.get("26/2018").kind,"constitutional_court_effect");
  assert.equal(byIssue.get("136/2020").kind,"constitutional_court_effect");
  assert.equal(byIssue.get("154/2023").kind,"amendment");
  assert.equal(x.official_editorial_consolidation.last_enacted_amendment_identified,"154/2023");
});

test("ZI-CL3 emergency 86/2020 remains a historical overlay, not permanent consolidation lineage",()=>{
  assert.equal(x.temporary_historical_overlay.gazette_issue,"86/2020");
  assert.equal(x.temporary_historical_overlay.permanent_consolidation_component,false);
  assert.ok(!x.official_editorial_consolidation.source_lineage.some(i=>i.issue==="86/2020"));
});

test("ZI-CL4 Article 218 carries a pending constitutional review warning",()=>{
  const p=x.constitutional_review.find(i=>i.case==="U.br.86/2025");
  assert.ok(p);
  assert.equal(p.article,"218");
  assert.equal(p.status,"PROCEEDINGS_INITIATED");
  assert.equal(p.warning_required,true);
  assert.equal(p.legal_effect,"NO_REPEAL_EFFECT_IDENTIFIED");
});

test("ZI-CL5 current-law promotion remains blocked by date and Human Gate",()=>{
  assert.equal(x.gates.official_source_bound,true);
  assert.equal(x.gates.article_level_text_present,true);
  assert.equal(x.gates.article_set_version_bound,true);
  assert.equal(x.gates.amendment_chain_resolved,true);
  assert.equal(x.gates.constitutional_court_effects_resolved,true);
  assert.equal(x.gates.application_dates_verified,false);
  assert.equal(x.gates.current_version_verified,false);
  assert.equal(x.gates.human_gate_approved,false);
  assert.equal(x.promotion_status,"CURRENT_TEXT_CANDIDATE_REQUIRES_HUMAN_GATE");
});
