import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zkp-official-lineage-audit-2026.json","utf8"));

test("ZKP-L1 official base timing is explicit",()=>{
  assert.equal(x.official_base.gazette_issue,"150/2010");
  assert.equal(x.official_base.entry_into_force,"2010-11-26");
  assert.equal(x.official_base.application_from,"2012-11-26");
  assert.equal(x.official_base.active_signal,true);
});

test("ZKP-L2 official linked chain includes 51/2011 and latest identified enacted amendment 198/2018",()=>{
  assert.ok(x.official_linked_lineage.some(e=>e.issue==="51/2011"));
  assert.equal(x.latest_enacted_amendment_identified_on_checked_ldbis_chain,"198/2018");
  assert.equal(x.official_linked_lineage.find(e=>e.issue==="198/2018").active_signal,true);
});

test("ZKP-L3 secondary reference label mismatch is explicit and fail closed",()=>{
  assert.equal(x.repository_reference_snapshot.authority_class,"secondary_consolidated_reference");
  assert.deepEqual(x.repository_reference_snapshot.missing_from_label_relative_to_official_linked_lineage,["51/2011"]);
  assert.equal(x.gates.amendment_chain_resolved,false);
  assert.equal(x.gates.current_version_verified,false);
  assert.equal(x.gates.human_gate_approved,false);
});

test("ZKP-L4 proposal preparation notice is never treated as enacted law",()=>{
  assert.equal(x.ministry_current_surface.classification,"PROPOSAL_PREPARATION_NOTICE");
  assert.equal(x.ministry_current_surface.enacted_law_effect,false);
});

test("ZKP-L5 audit authorizes no promotion",()=>{
  assert.equal(x.current_law_promotion,false);
  assert.ok(x.blockers.some(v=>/51\/2011/.test(v)));
  assert.match(x.next_action,/do not mutate or promote/i);
});
