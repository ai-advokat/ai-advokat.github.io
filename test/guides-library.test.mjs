import { describe,test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const html=fs.readFileSync("guides/index.html","utf8");

describe("Zoran guides library governance",()=>{
  test("G1 registry contains 12 delivered editions plus controlled V2 upgrade",()=>{
    assert.equal(data.records.length,13);
    assert.equal(new Set(data.records.map(x=>x.id)).size,12);
  });
  test("G2 no guide exposes a public PDF before Human Gate",()=>{
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
  });
  test("G3 Guide 02 keeps explicit version history",()=>{
    const old=data.records.find(x=>x.id==="guide-02-victim-draft-2026-09-29");
    const current=data.records.find(x=>x.id==="guide-02-victim-edited-2026-10-01");
    assert.equal(old.superseded_by,current.id);
    assert.equal(current.supersedes,old.id);
    assert.equal(old.status,"superseded_draft");
  });
  test("G4 administrative version hierarchy is explicit",()=>{
    const short=data.records.find(x=>x.id==="guide-26-administrative-short");
    const v1=data.records.find(x=>x.id==="guide-administrative-v1");
    const v2=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.ok(short);
    assert.equal(v1.superseded_by,v2.id);
    assert.equal(v2.supersedes,v1.id);
    assert.equal(v1.source_role,"version_history");
    assert.equal(v2.source_role,"primary");
    assert.equal(v2.provenance.provenance_role,"conceptual_and_organizational_reference_only");
  });
  test("G5 every delivered source has immutable provenance metadata",()=>{
    for(const r of data.records){
      assert.match(r.sha256,/^[0-9a-f]{64}$/);
      assert.ok(Number.isInteger(r.source_size_bytes) && r.source_size_bytes>0);
    }
  });
  test("G6 public page states source-first and Human Gate boundaries",()=>{
    assert.match(html,/секундарни материјали/);
    assert.match(html,/Human Gate/);
    assert.match(html,/не се прикажуваат како важечки закон/);
  });
});
