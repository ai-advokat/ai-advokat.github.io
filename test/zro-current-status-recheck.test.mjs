import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zro-current-status-recheck-2026.json","utf8"));
const amendments=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zro-2025-amendments.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const zro=ledger.instruments.find(i=>i.canonical_key==="mk:zro");

test("ZRO-R1 recheck is bounded and latest displayed amendment is 124/2025",()=>{
  assert.match(x.caveat,/not a universal negative/i);
  assert.equal(x.bounded_findings.ministry_latest_displayed_amendment,"124/2025");
  assert.equal(x.bounded_findings.ldbis_latest_displayed_amendment,"124/2025");
  assert.equal(x.bounded_findings.later_amendment_identified_on_checked_surfaces,false);
});

test("ZRO-R2 2025 source pack remains exactly three acts and 32 events",()=>{
  assert.deepEqual(amendments.sources.map(s=>s.issue),["39/2025","74/2025","124/2025"]);
  assert.equal(amendments.aggregate.event_count,32);
  assert.equal(amendments.aggregate.unique_existing_articles_for_review,26);
  assert.deepEqual(amendments.aggregate.inserted_articles,["104-а"]);
  assert.equal(amendments.aggregate.current_text_reconstructed,false);
});

test("ZRO-R3 latest checked Constitutional Court outcomes do not alter Articles 104/104-a",()=>{
  assert.equal(x.bounded_findings.article_104a_2025_constitutional_case_effect,"NO_PROCEEDINGS_INITIATED");
  assert.equal(x.bounded_findings.article_104_2025_constitutional_case_effect,"INITIATIVE_DISMISSED");
  assert.equal(x.bounded_findings.latest_checked_constitutional_cases_change_text,false);
});

test("ZRO-R4 readiness remains reconstruction-pending and Human Gate closed",()=>{
  assert.equal(zro.gates.current_version_verified,false);
  assert.equal(zro.gates.human_gate_approved,false);
  assert.equal(zro.current_text_reconstructed,false);
  assert.notEqual(zro.current_law_status,"PRODUCTION_READY");
  assert.equal(zro.official_status_recheck?.state,"LATEST_IDENTIFIED_AMENDMENT_124_2025");
});

test("ZRO-R5 no current-consolidated promotion is authorized by source recheck",()=>{
  assert.equal(x.corpus_state_expected.current_text_reconstructed,false);
  assert.equal(x.corpus_state_expected.current_consolidated_allowed,false);
  assert.equal(x.next_gate.includes("Read-only live D1"),true);
});
