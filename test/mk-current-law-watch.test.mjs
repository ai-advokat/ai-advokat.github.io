import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CURRENT_LAW_WATCH_VERSION,
  extractAnchors,
  normalizePage,
  classifyCandidate,
  diffSnapshots,
  buildHumanGatePacket
} from "../scripts/mk-current-law-watch.mjs";

const config=JSON.parse(fs.readFileSync("data/mk-current-law-watch-config.json","utf8"));
const sobranie=config.sources.find(x=>x.id==="mk-sobranie");
const gazette=config.sources.find(x=>x.id==="mk-official-gazette");

test("Current-Law Watch R1 contract is source-first and fail-closed",()=>{
  assert.equal(CURRENT_LAW_WATCH_VERSION,"AI_ADVOCAT_MK_CURRENT_LAW_WATCH_R1");
  assert.equal(config.governance.parliament_is_early_warning_only,true);
  assert.equal(config.governance.official_gazette_is_publication_provenance_primary,true);
  assert.equal(config.governance.automatic_current_law_promotion,false);
  assert.equal(config.governance.bulk_mirroring,false);
  assert.equal(config.governance.database_republication,false);
  assert.equal(config.governance.current_law_promotion_requires_all.length,8);
  assert.equal(config.poll_interval_minutes,30);
});

test("anchor extraction normalizes official relative URLs",()=>{
  const rows=extractAnchors(
    '<a href="/doc/zakon-1.pdf">Закон за изменување на Законот за работните односи</a>',
    "https://www.sobranie.mk/page"
  );
  assert.equal(rows.length,1);
  assert.equal(rows[0].url,"https://www.sobranie.mk/doc/zakon-1.pdf");
  assert.match(rows[0].label,/работните односи/);
});

test("Sobranie candidate is early warning and never current-law authority",()=>{
  const c=classifyCandidate({
    source:sobranie,
    anchor:{url:"https://www.sobranie.mk/doc/1",label:"Предлог на закон за изменување на Законот за работните односи"},
    instruments:config.tracked_instruments,
    keywords:config.legal_title_keywords
  });
  assert.equal(c.canonical_key,"mk:zro");
  assert.equal(c.legal_stage,"LEGISLATIVE_EARLY_WARNING");
  assert.equal(c.current_law_authority,false);
  assert.equal(c.automatic_promotion_allowed,false);
  assert.equal(c.human_gate_required,true);
});

test("Official Gazette candidate is publication provenance but still cannot auto-promote",()=>{
  const c=classifyCandidate({
    source:gazette,
    anchor:{url:"https://slvesnik.com.mk/example",label:"Закон за изменување и дополнување на Законот за извршување"},
    instruments:config.tracked_instruments,
    keywords:config.legal_title_keywords
  });
  assert.equal(c.canonical_key,"mk:zi");
  assert.equal(c.legal_stage,"PUBLISHED_SOURCE_CANDIDATE");
  assert.equal(c.current_law_authority,true);
  assert.equal(c.automatic_promotion_allowed,false);
});

test("normalized page fingerprint ignores markup noise but observes legal text change",()=>{
  assert.equal(normalizePage("<b>Закон</b>   1"),normalizePage("<div>Закон 1</div>"));
  assert.notEqual(normalizePage("<b>Закон 1</b>"),normalizePage("<b>Закон 2</b>"));
});

test("snapshot diff detects changed official page and new candidate",()=>{
  const previous={
    pages:[{source_id:"mk-official-gazette",url:"https://slvesnik.com.mk/",instrument_key:null,normalized_sha256:"aaa"}],
    candidates:[]
  };
  const current={
    governance:config.governance,
    captured_at:"2026-11-07T12:00:00Z",
    pages:[{source_id:"mk-official-gazette",url:"https://slvesnik.com.mk/",instrument_key:null,normalized_sha256:"bbb"}],
    candidates:[{
      source_id:"mk-official-gazette",
      source_role:"publication_provenance_primary",
      canonical_key:"mk:zro",
      instrument_title:"Закон за работните односи",
      label:"Закон за изменување на Законот за работните односи",
      url:"https://slvesnik.com.mk/new",
      legal_stage:"PUBLISHED_SOURCE_CANDIDATE",
      current_law_authority:true,
      automatic_promotion_allowed:false,
      human_gate_required:true
    }]
  };
  const d=diffSnapshots(previous,current);
  assert.equal(d.state,"CHANGE_DETECTED");
  assert.equal(d.changed_pages.length,1);
  assert.equal(d.new_candidates.length,1);
  assert.equal(d.requires_human_review,true);
  const p=buildHumanGatePacket(current,d);
  assert.equal(p.automatic_database_write,false);
  assert.equal(p.automatic_current_law_promotion,false);
  assert.equal(p.required_promotion_gates.length,8);
  assert.match(p.current_law_promotion,/BLOCKED/);
});

test("no-change snapshot does not fabricate a Human Gate event",()=>{
  const snapshot={
    governance:config.governance,
    captured_at:"2026-11-07T12:00:00Z",
    pages:[{source_id:"mk-sobranie",url:"https://www.sobranie.mk/",instrument_key:null,normalized_sha256:"same"}],
    candidates:[]
  };
  const d=diffSnapshots(snapshot,snapshot);
  assert.equal(d.state,"NO_CHANGE");
  assert.equal(d.requires_human_review,false);
});
