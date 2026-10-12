import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zkp-51-2011-classification-2026.json","utf8"));
const audit=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zkp-official-lineage-audit-2026.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const z=ledger.instruments.find(v=>v.canonical_key==="mk:zkp");

test("ZKP51-1 official 51/2011 act targets predecessor 15/1997 chain",()=>{
  const e=x.official_sources.og_51_2011;
  assert.equal(e.act_item_number,"1381");
  assert.deepEqual(e.target_law_lineage,["15/1997","44/2002","74/2004","83/2008","67/2009"]);
  assert.equal(e.direct_text_effect_on_150_2010,false);
  assert.equal(e.classification,"PREDECESSOR_LAW_AMENDMENT_WITH_TRANSITIONAL_SUNSET");
});

test("ZKP51-2 100/2012 moves full application of 150/2010 to 1 December 2013",()=>{
  assert.equal(x.official_sources.og_100_2012.target_law,"150/2010");
  assert.equal(x.timing.new_150_2010_entry_into_force,"2010-11-26");
  assert.equal(x.timing.new_150_2010_application_from,"2013-12-01");
  assert.equal(audit.official_base.application_from,"2013-12-01");
});

test("ZKP51-3 normative 2010 lineage excludes predecessor-only 51/2011",()=>{
  assert.deepEqual(x.lineage_classification.current_2010_act_normative_lineage,["150/2010","100/2012","142/2016","193/2016","198/2018"]);
  assert.ok(!x.lineage_classification.current_2010_act_normative_lineage.includes("51/2011"));
  assert.equal(x.lineage_classification.issue_51_2011_should_not_be_added_to_570_snapshot_normative_lineage,true);
  assert.equal(audit.repository_reference_snapshot.normative_lineage_matches_classified_current_lineage,true);
});

test("ZKP51-4 resolution removes only the 51/2011 blocker and does not promote ZKP",()=>{
  assert.match(z.current_law_status,/51_2011_RESOLVED/);
  assert.equal(z.gates.official_source_bound,false);
  assert.equal(z.gates.current_version_verified,false);
  assert.equal(z.gates.human_gate_approved,false);
  assert.equal(x.promotion_authorized,false);
  assert.ok(x.remaining_blockers.length>=4);
});
