import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zkp-official-lineage-audit-2026.json","utf8"));

test("ZKP-L1 official base timing distinguishes entry into force and current application start",()=>{
  assert.equal(x.official_base.gazette_issue,"150/2010");
  assert.equal(x.official_base.entry_into_force,"2010-11-26");
  assert.equal(x.official_base.original_application_from,"2012-11-26");
  assert.equal(x.official_base.application_from,"2013-12-01");
  assert.equal(x.official_base.application_date_changed_by,"100/2012 Article 2");
  assert.equal(x.official_base.active_signal,true);
});

test("ZKP-L2 51/2011 is classified as predecessor transitional, not amendment of 150/2010",()=>{
  const e=x.official_linked_lineage.find(e=>e.issue==="51/2011");
  assert.ok(e);
  assert.equal(e.kind,"predecessor_transitional_amendment");
  assert.equal(e.classification,"NOT_AMENDMENT_TO_150_2010");
  assert.equal(e.direct_text_effect_on_150_2010,false);
  assert.equal(e.sunset_trigger_date,"2013-12-01");
});

test("ZKP-L3 current normative lineage matches the reference label after classification",()=>{
  assert.deepEqual(x.current_normative_lineage,["150/2010","100/2012","142/2016","193/2016","198/2018"]);
  assert.deepEqual(x.repository_reference_snapshot.missing_from_label_relative_to_official_linked_lineage,[]);
  assert.deepEqual(x.repository_reference_snapshot.excluded_predecessor_transitional_reference,["51/2011"]);
  assert.equal(x.repository_reference_snapshot.normative_lineage_matches_classified_current_lineage,true);
  assert.equal(x.gates.current_version_verified,false);
  assert.equal(x.gates.human_gate_approved,false);
});

test("ZKP-L4 proposal preparation notice is never treated as enacted law",()=>{
  assert.equal(x.ministry_current_surface.classification,"PROPOSAL_PREPARATION_NOTICE");
  assert.equal(x.ministry_current_surface.enacted_law_effect,false);
});

test("ZKP-L5 audit remains fail closed on article-level official reconstruction",()=>{
  assert.equal(x.current_law_promotion,false);
  assert.ok(x.blockers.some(v=>/article-level effects of 100\/2012, 142\/2016 and 198\/2018/i.test(v)));
  assert.match(x.next_action,/official article-level effects/i);
});
