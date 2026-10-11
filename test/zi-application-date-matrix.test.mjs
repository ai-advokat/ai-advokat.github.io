import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const x=JSON.parse(fs.readFileSync("ingest/mk/real-source-fixtures/zi-application-date-matrix-2026.json","utf8"));
const by=new Map(x.events.map(e=>[e.id,e]));

test("ZI-D1 base law distinguishes force from application",()=>{
  const e=by.get("zi-72-2016");
  assert.equal(e.publication_date,"2016-04-12");
  assert.equal(e.entry_into_force_date,"2016-04-20");
  assert.equal(e.application_from,"2017-01-01");
  assert.notEqual(e.entry_into_force_date,e.application_from);
});

test("ZI-D2 142/2016 is immediate and changes base application to 1 Jan 2017",()=>{
  const e=by.get("zi-142-2016");
  assert.equal(e.publication_date,"2016-08-01");
  assert.equal(e.entry_into_force_date,"2016-08-01");
  assert.match(e.affected_timing,/2017-01-01/);
});

test("ZI-D3 Constitutional Court effects start on Gazette publication",()=>{
  for(const [id,date] of [["zi-cc-u143-2016","2017-12-06"],["zi-cc-u135-2016","2018-02-08"],["zi-cc-u94-2019","2020-05-27"]]){
    const e=by.get(id);
    assert.equal(e.legal_effect_from,date,id);
    assert.equal(e.publication_date,date,id);
    assert.equal(e.effect_rule,"day_of_gazette_publication",id);
  }
});

test("ZI-D4 later amendments preserve exact eighth-day/immediate rules",()=>{
  assert.equal(by.get("zi-233-2018").entry_into_force_date,"2018-12-28");
  assert.equal(by.get("zi-233-2018").transitional_rule,true);
  assert.equal(by.get("zi-14-2020").entry_into_force_date,"2020-01-28");
  assert.equal(by.get("zi-14-2020").transitional_rule,true);
  assert.equal(by.get("zi-154-2023").entry_into_force_date,"2023-07-20");
});

test("ZI-D5 emergency decrees remain separate from permanent current lineage",()=>{
  assert.equal(x.historical_overlays.length,1);
  const o=x.historical_overlays[0];
  assert.deepEqual(o.gazette_issues,["86/2020","103/2020","156/2020"]);
  assert.equal(o.permanent_current_text_component,false);
  assert.equal(x.verification_result.historical_overlay_index_complete,false);
});

test("ZI-D6 date gate closes without current/Human Gate promotion",()=>{
  assert.equal(x.verification_result.permanent_lineage_timing_verified,true);
  assert.equal(x.verification_result.current_law_gate_application_dates_verified,true);
  assert.equal(x.verification_result.current_version_verified,false);
  assert.equal(x.verification_result.human_gate_approved,false);
});


test("ZIDM direct Constitutional Court provenance for U.br.94/2019",()=>{
  const ev=x.events.find(e=>e.constitutional_case==="U.br.94/2019");
  assert.ok(ev);
  assert.equal(ev.official_court_reference,"https://ustavensud.mk/2020/05/%D0%A3-%D0%B1%D1%80-942019-1/");
});
