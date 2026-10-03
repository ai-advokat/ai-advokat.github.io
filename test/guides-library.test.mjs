import { describe,test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const html=fs.readFileSync("guides/index.html","utf8");

describe("Zoran guides library governance",()=>{
  test("G1 registry contains exactly 38 governed delivered records",()=>{
    assert.equal(data.records.length,38);
    assert.equal(new Set(data.records.map(x=>x.id)).size,38);
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
  test("G4 administrative short and comprehensive guides remain distinct",()=>{
    assert.ok(data.records.find(x=>x.id==="guide-26-administrative-short"));
    assert.ok(data.records.find(x=>x.id==="guide-administrative-v1"));
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
    assert.match(html,/не се прикажуваат како важечки закон/i);
  });
  test("G7 FULL Word batch 38-63 is complete and provenance-locked",()=>{
    const batch=data.records.filter(x=>x.source_role==="primary_full_word");
    assert.equal(batch.length,26);
    assert.deepEqual(batch.map(x=>Number(x.guide_no)).sort((a,b)=>a-b),Array.from({length:26},(_,i)=>i+38));
    for(const r of batch){
      assert.equal(r.source_format,"docx");
      assert.equal(r.public_pdf,null);
      assert.equal(r.ai_use,"reference_only_until_human_gate");
      assert.match(r.source_package_sha256,/^[0-9a-f]{64}$/);
    }
  });
  test("G8 Guide 53 remains blocked on the silence-of-administration deadline correction",()=>{
    const g=data.records.find(x=>x.id==="guide-53-full-word-2026");
    assert.equal(g.status,"legal_approval_required");
    assert.match(g.review_note,/У\.бр\.148\/2024/);
  });
  test("G9 source-checked Word guides remain Human-Gated",()=>{
    for(const id of ["guide-39-full-word-2026","guide-51-full-word-2026","guide-52-full-word-2026"]){
      const g=data.records.find(x=>x.id===id);
      assert.equal(g.status,"source_checked_review");
      assert.equal(g.professional_use,"human_review_required");
    }
  });
});
