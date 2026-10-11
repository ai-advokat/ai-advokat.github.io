import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const byKey=new Map(ledger.instruments.map(x=>[x.canonical_key,x]));
const required=ledger.promotion_rule.production_ready_requires_all;

test("CLR1 current-law promotion requires all eight governed gates",()=>{
  assert.deepEqual(required,[
    "official_source_bound",
    "article_level_text_present",
    "article_set_version_bound",
    "amendment_chain_resolved",
    "constitutional_court_effects_resolved",
    "application_dates_verified",
    "current_version_verified",
    "human_gate_approved"
  ]);
  assert.equal(ledger.promotion_rule.fail_closed,true);
});

test("CLR2 no priority instrument is currently labelled production ready",()=>{
  assert.equal(ledger.instruments.length,10);
  for(const item of ledger.instruments){
    assert.notEqual(item.current_law_status,"PRODUCTION_READY",item.canonical_key);
    assert.ok(required.some(g=>item.gates[g]!==true),item.canonical_key);
  }
});

test("CLR3 ZI is the first exact-snapshot candidate but remains non-current",()=>{
  const x=byKey.get("mk:zi");
  assert.equal(x.priority,1);
  assert.equal(x.repository_snapshot.expected_article_rows,258);
  assert.equal(x.repository_snapshot.source_sha256,"15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55");
  assert.equal(x.repository_snapshot.version_class,"dated_snapshot");
  assert.equal(x.gates.current_version_verified,false);
  assert.equal(x.gates.human_gate_approved,false);
});

test("CLR4 ZRO records audited 2025 amendments without claiming reconstruction",()=>{
  const x=byKey.get("mk:zro");
  assert.equal(x.repository_snapshot.expected_article_rows,298);
  assert.equal(x.verified_amendment_events_2025,32);
  assert.equal(x.current_text_reconstructed,false);
  assert.equal(x.gates.amendment_chain_resolved,false);
});

test("CLR5 ZKP reference consolidation cannot satisfy official current-law binding",()=>{
  const x=byKey.get("mk:zkp");
  assert.equal(x.repository_snapshot.expected_article_rows,570);
  assert.equal(x.repository_snapshot.version_class,"reference_consolidation");
  assert.equal(x.gates.official_source_bound,false);
  assert.equal(x.gates.current_version_verified,false);
});

test("CLR6 ZPP preserves the 18 January 2027 application boundary",()=>{
  const x=byKey.get("mk:zpp");
  assert.equal(x.current_law_status,"TEMPORAL_DUAL_TRACK_REVIEW");
  assert.match(x.temporal_note,/2027-01-18/);
  assert.equal(x.gates.application_dates_verified,true);
  assert.equal(x.gates.current_version_verified,false);
});

test("CLR7 priorities are unique and match the governed order",()=>{
  const sorted=[...ledger.instruments].sort((a,b)=>a.priority-b.priority).map(x=>x.canonical_key);
  assert.deepEqual(sorted,ledger.priority_order);
  assert.equal(new Set(ledger.instruments.map(x=>x.priority)).size,ledger.instruments.length);
});
