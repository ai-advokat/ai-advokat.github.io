import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const p=JSON.parse(fs.readFileSync("ingest/mk/audits/zro-human-gate-pack-2026-10-12.json","utf8"));

test("ZROHG1 pack remains non-approved and non-production",()=>{
  assert.equal(p.status,"HUMAN_GATE_PACK_READY_NOT_APPROVED");
  assert.equal(p.current_law_claim,false);
  assert.equal(p.current_version_verified,false);
  assert.equal(p.human_gate_approved,false);
  assert.equal(p.database_write_authorized,false);
  assert.equal(p.decision.value,null);
});

test("ZROHG2 exact reconstruction chain is recorded",()=>{
  assert.equal(p.candidate.article_count,299);
  assert.equal(p.candidate.version_label,"derived-candidate-through-124/2025");
  assert.deepEqual(p.candidate.source_chain.map(x=>x.issue),["through-111/2023","39/2025","74/2025","124/2025"]);
  assert.equal(p.reconstruction.operation_count,46);
  assert.equal(p.reconstruction.text_operation_count,42);
  assert.equal(p.reconstruction.non_text_operation_count,4);
  assert.equal(p.reconstruction.database_writes,0);
});

test("ZROHG3 Human Gate scope is exactly 27 unique changed or inserted articles",()=>{
  assert.equal(p.reconstruction.unique_changed_or_inserted_article_count,27);
  assert.equal(new Set(p.reconstruction.unique_changed_or_inserted_articles).size,27);
  for(const n of ["104","104-а","212","213-г","265","266-в"]) assert.ok(p.reconstruction.unique_changed_or_inserted_articles.includes(n),n);
});

test("ZROHG4 temporal rules remain separate",()=>{
  assert.equal(p.temporal_events.length,4);
  assert.deepEqual(p.temporal_events.map(x=>x.issue),["39/2025","39/2025","74/2025","124/2025"]);
  assert.ok(p.temporal_events.some(x=>x.kind==="transitional"));
  assert.ok(p.temporal_events.some(x=>x.issue==="74/2025"&&x.rule==="eighth_day_after_publication"));
});

test("ZROHG5 decision choices require an explicit Human Gate",()=>{
  assert.deepEqual(p.decision.permitted_values,["APPROVE_CURRENT_CANDIDATE","REJECT","RETURN_FOR_CORRECTION"]);
  assert.ok(p.promotion_blockers.length>=4);
  assert.ok(p.human_gate_checklist.some(x=>/Article 212/.test(x)));
});
