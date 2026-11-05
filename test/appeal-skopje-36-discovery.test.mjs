import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  APPEAL_SKOPJE_36_VERSION,
  APPEAL_SKOPJE_36_RECORDS,
  searchAppealSkopje36
} from "../src/appeal-skopje-36-discovery.js";

const worker=fs.readFileSync("src/index.js","utf8");
const master=JSON.parse(fs.readFileSync("data/case-law/mk-master-judicial-corpus-2026-11-04.json","utf8"));

test("Appeal Skopje supplied package exposes exactly 36 governed discovery records",()=>{
  assert.equal(APPEAL_SKOPJE_36_VERSION,"AI_ADVOCAT_APPEAL_SKOPJE_36_V1");
  assert.equal(APPEAL_SKOPJE_36_RECORDS.length,36);
  assert.equal(new Set(APPEAL_SKOPJE_36_RECORDS.map(x=>x.n)).size,36);
  for(const row of APPEAL_SKOPJE_36_RECORDS){
    assert.match(row.n,/^КОКЖ-\d+\/\d{2}$/);
    assert.match(row.d,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(row.p>=3);
  }
});

test("exact case number and legal issue discovery work without authority promotion",()=>{
  const exact=searchAppealSkopje36("КОКЖ-43/25");
  assert.equal(exact[0]?.n,"КОКЖ-43/25");
  const topic=searchAppealSkopje36("перење пари",{limit:8});
  assert.ok(topic.length>=4);
  assert.ok(topic.every(x=>/перење пари/i.test(x.i)));
});

test("shared backend exposes supplied decisions only as discovery for both bot surfaces",()=>{
  assert.match(worker,/function appealSkopjeDiscoveryContext/);
  assert.match(worker,/CASE_LAW_DISCOVERY_ONLY_NOT_AUTHORITY/);
  assert.match(worker,/legalAuthority:false/);
  assert.match(worker,/officialBindingVerified:false/);
  assert.match(worker,/\/api\/chat"\) return handleGPTChat/);
  assert.match(worker,/\/api\/bot"\) return handleGPTChat\(request, env, \{openAIOnly:true\}\)/);
});

test("master judicial corpus registers Appeal Skopje package with Human Gate",()=>{
  const g=master.source_groups.find(x=>x.id==="APPEAL_SKOPJE_CRIMINAL_DECISIONS_36_2026_11_05");
  assert.ok(g);
  assert.equal(g.record_count,36);
  assert.equal(g.human_gate_required,true);
  assert.match(g.status,/REMOTE_ITEM_BINDING_PENDING/);
  assert.equal(master.runtime.internal_bot,"enabled_as_discovery_context");
  assert.equal(master.runtime.external_bot,"enabled_as_discovery_context");
});