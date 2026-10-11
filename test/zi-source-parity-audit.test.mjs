import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const q=JSON.parse(fs.readFileSync("ingest/mk/audits/zi-parser-review-queue-2026-10-11.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const zi=ledger.instruments.find(x=>x.canonical_key==="mk:zi");

test("ZI-P1 exact machine parity evidence is recorded without promotion",()=>{
  assert.equal(q.machine_source_parity.production,"PASS_258_OF_258");
  assert.equal(q.machine_source_parity.staging,"PASS_258_OF_258");
  assert.equal(q.machine_source_parity.production_staging_digest_match,true);
  assert.equal(q.machine_source_parity.corpus_sha256,"56a69c8c0d278f237984ad7d0e4271f12e48ee54f5ffd8fdd0f804826b361609");
  assert.equal(q.machine_source_parity.database_mutation,false);
  assert.equal(q.promotion_blocked,true);
  assert.equal(q.current_version_verified,false);
  assert.equal(q.human_gate_approved,false);
});

test("ZI-P2 all 28 parser findings remain queued",()=>{
  assert.equal(q.parser_findings_count,28);
  assert.equal(q.findings.length,28);
  assert.deepEqual(q.finding_summary,{
    mixed_script_token:11,
    editorial_note_contamination:2,
    unexplained_gap:15
  });
  assert.ok(q.findings.every(x=>x.review_state==="PENDING_HUMAN_REVIEW"));
});

test("ZI-P3 findings are exact governed categories, not auto-repairs",()=>{
  const mixed=q.findings.filter(x=>x.code==="mixed_script_token").map(x=>x.article);
  assert.deepEqual(mixed,["4","29","33","68","73","74","86","110","163","245","261"]);
  const notes=q.findings.filter(x=>x.code==="editorial_note_contamination").map(x=>x.article);
  assert.deepEqual(notes,["104","269"]);
  const gaps=q.findings.filter(x=>x.code==="unexplained_gap").map(x=>x.article);
  assert.deepEqual(gaps,["95","240","241","242","243","244","247","248","250","252","256","257","258","259","260"]);
});

test("ZI-P4 readiness records parity but current/Human Gate remain false",()=>{
  assert.equal(zi.machine_source_parity?.verified,true);
  assert.equal(zi.machine_source_parity?.article_count,258);
  assert.equal(zi.machine_source_parity?.corpus_sha256,q.machine_source_parity.corpus_sha256);
  assert.equal(zi.machine_source_parity?.parser_findings_total,28);
  assert.equal(zi.machine_source_parity?.parser_findings_resolved,28);
  assert.equal(zi.machine_source_parity?.parser_findings_pending,0);
  assert.equal(zi.gates.current_version_verified,false);
  assert.equal(zi.gates.human_gate_approved,false);
  assert.notEqual(zi.current_law_status,"PRODUCTION_READY");
});
