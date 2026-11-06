import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  APPEAL_SKOPJE_GOLD100_VERSION,
  APPEAL_SKOPJE_GOLD100_RECORDS,
  gold100RecordForCase,
  searchAppealSkopjeGold100
} from "../src/appeal-skopje-gold100-discovery.js";

const worker=fs.readFileSync("src/index.js","utf8");
const master=JSON.parse(fs.readFileSync("data/case-law/mk-master-judicial-corpus-2026-11-04.json","utf8"));
const runtime=JSON.parse(fs.readFileSync("data/case-law/appeal-skopje-gold100-ft22-2026-11-06/runtime-register.json","utf8"));

test("Gold-100 register is unique, privacy-minimised and fail-closed",()=>{
  assert.equal(APPEAL_SKOPJE_GOLD100_VERSION,"AI_ADVOCAT_APPEAL_SKOPJE_GOLD100_V1");
  assert.equal(APPEAL_SKOPJE_GOLD100_RECORDS.length,100);
  assert.equal(new Set(APPEAL_SKOPJE_GOLD100_RECORDS.map(x=>x.caseNumber)).size,100);
  assert.equal(new Set(APPEAL_SKOPJE_GOLD100_RECORDS.map(x=>x.sha256)).size,100);
  assert.equal(APPEAL_SKOPJE_GOLD100_RECORDS.filter(x=>x.ft22PackageCopy).length,20);
  for(const row of APPEAL_SKOPJE_GOLD100_RECORDS){
    assert.match(row.sha256,/^[0-9a-f]{64}$/);
    assert.equal(row.legalVerified,false);
    assert.equal(row.humanGate,"OPEN");
    assert.equal(row.productionAuthority,"NO-GO");
    assert.ok(!("partyName" in row));
    assert.ok(!("excerpt" in row));
  }
});

test("FT-22 exact records preserve hash provenance and detention instrument subtype",()=>{
  const detention=gold100RecordForCase("КОКЖ-93/25");
  assert.ok(detention);
  assert.equal(detention.series,"FT22");
  assert.equal(detention.kindInitial,"РЕШЕНИЕ");
  assert.equal(detention.topicDraft,"Притвор / мерки");
  assert.equal(detention.sha256,"31e3705f1e0356aa7c72f7b454958dfa587b659a53db54086958f8106ce3d04c");
  const exact=searchAppealSkopjeGold100("КОКЖ-93/25");
  assert.equal(exact[0]?.caseNumber,"КОКЖ-93/25");
});

test("Gold-100 extends discovery beyond the original 36 without authority promotion",()=>{
  const row=gold100RecordForCase("КОКЖ-9/25");
  assert.ok(row);
  assert.equal(row.series,"FT21");
  assert.equal(row.sourceAvailability,"register_only");
  assert.match(worker,/searchAppealSkopjeGold100/);
  assert.match(worker,/gold100RecordCount:APPEAL_SKOPJE_GOLD100_RECORDS\.length/);
  assert.match(worker,/legalAuthority:false/);
  assert.match(worker,/PRODUCTION_AUTHORITY: NO-GO/);
  assert.match(worker,/SHA-256 proves file identity\/integrity only/);
});

test("master and runtime manifests preserve Human Gate and no raw-PDF publication",()=>{
  const g=master.source_groups.find(x=>x.id==="APPEAL_SKOPJE_GOLD100_FT22_2026_11_06");
  assert.ok(g);
  assert.equal(g.record_count,100);
  assert.equal(g.ft22_package_copy_count,20);
  assert.equal(g.legal_verified_count,0);
  assert.equal(g.human_gate_required,true);
  assert.equal(g.production_authority,"NO-GO");
  assert.match(g.privacy_indexing,/raw PDFs not published/);
  assert.equal(runtime.record_count,100);
  assert.equal(runtime.ft22_package_copy_count,20);
  assert.equal(runtime.legal_verified_count,0);
  assert.equal(runtime.raw_pdf_publication,"not_published");
  assert.equal(master.runtime.internal_bot,"enabled_as_discovery_context");
  assert.equal(master.runtime.external_bot,"enabled_as_discovery_context");
});
