import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const recheck=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zi-final-current-status-recheck-2026.json","utf8"));
const pack=JSON.parse(fs.readFileSync("ingest/mk/human-gate/zi-final-human-gate-pack-2026-10-11.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const zi=ledger.instruments.find(x=>x.canonical_key==="mk:zi");

test("ZIF1 recheck is bounded and never claims universal absence",()=>{
  assert.equal(recheck.result,"PASS_BOUNDED_OFFICIAL_SURFACES_HUMAN_GATE_REQUIRED");
  assert.match(recheck.caveat,/not a universal proof/i);
  assert.equal(recheck.bounded_findings.later_enacted_amendment_identified_on_checked_ministry_ldbis_surfaces,false);
});

test("ZIF2 checked official surfaces preserve 154/2023 as latest displayed enacted/linked amendment",()=>{
  assert.equal(recheck.bounded_findings.ministry_latest_enacted_amendment_displayed,"154/2023");
  assert.equal(recheck.bounded_findings.ldbis_latest_linked_amendment_displayed,"154/2023");
  assert.equal(recheck.bounded_findings.official_gazette_154_2023_verified,true);
});

test("ZIF3 Article 218 remains pending with mandatory warning and no inferred repeal",()=>{
  assert.equal(recheck.bounded_findings.article_218_constitutional_review_state,"PROCEEDINGS_INITIATED");
  assert.equal(recheck.bounded_findings.article_218_final_repeal_or_annulment_effect_identified,false);
  assert.equal(recheck.bounded_findings.article_218_runtime_warning_must_remain,true);
});

test("ZIF4 final Human Gate pack is decision-ready but unapproved",()=>{
  assert.equal(pack.decision_state,"PENDING_HUMAN_DECISION");
  assert.equal(pack.decision,null);
  assert.equal(pack.reviewer,null);
  assert.equal(pack.machine_evidence.production_source_parity,"PASS_258_OF_258");
  assert.equal(pack.machine_evidence.parser_findings_resolved,28);
  assert.deepEqual(pack.machine_evidence.reviewed_representation_articles,["4","104","269"]);
});

test("ZIF5 automation is explicitly prohibited from current/Human-Gate promotion",()=>{
  const rules=pack.prohibited_automation.join("\n");
  assert.match(rules,/human_gate_approved=true/);
  assert.match(rules,/is_current=1/);
  assert.match(rules,/current_consolidated/);
  assert.match(rules,/Article 218 warning/);
});

test("ZIF6 readiness remains fail-closed pending human decision",()=>{
  assert.equal(zi.gates.current_version_verified,false);
  assert.equal(zi.gates.human_gate_approved,false);
  assert.equal(zi.final_human_gate?.ready,true);
  assert.equal(zi.final_human_gate?.decision_state,"PENDING_HUMAN_DECISION");
  assert.notEqual(zi.current_law_status,"PRODUCTION_READY");
});
