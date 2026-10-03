import { describe,test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const html=fs.readFileSync("guides/index.html","utf8");

describe("Zoran guides library governance",()=>{
  test("G1 registry contains 39 governed records including controlled Administrative V2",()=>{
    assert.equal(data.records.length,39);
    assert.equal(new Set(data.records.map(x=>x.id)).size,39);
  });
  test("G2 no guide exposes a public PDF before Human Gate",()=>{
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").public_pdf,null);
  });
  test("G3 Guide 02 keeps explicit version history",()=>{
    const old=data.records.find(x=>x.id==="guide-02-victim-draft-2026-09-29");
    const current=data.records.find(x=>x.id==="guide-02-victim-edited-2026-10-01");
    assert.equal(old.superseded_by,current.id);
    assert.equal(current.supersedes,old.id);
    assert.equal(old.status,"superseded_draft");
  });
  test("G4 administrative version hierarchy is explicit and Human-Gated",()=>{
    const short=data.records.find(x=>x.id==="guide-26-administrative-short");
    const v1=data.records.find(x=>x.id==="guide-administrative-v1");
    const v2=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.ok(short);
    assert.equal(v1.superseded_by,v2.id);
    assert.equal(v2.supersedes,v1.id);
    assert.equal(v1.source_role,"version_history");
    assert.equal(v2.source_role,"primary");
    assert.equal(v2.provenance.provenance_role,"conceptual_and_organizational_reference_only");
    assert.equal(v2.catalog_public,false);
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
      assert.equal(r.source_package,"Pravni_vodichi_38_63_FULL_WORD_ALL.zip");
      assert.equal(r.source_package_sha256,"5c6aedf360b0376e1e24bdbe9df6b49e393eff8a8984a476e06ad6b05c884172");
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
  test("G10 public catalogue activation covers exactly all 38 governed records",()=>{
    assert.equal(data.collection.catalog_visibility.state,"public");
    assert.equal(data.collection.catalog_visibility.decision_id,"catalog-visibility-38-2026-10-03");
    assert.equal(data.records.filter(x=>x.catalog_public===true).length,38);
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").catalog_public,false);
    assert.match(html,/Каталогот е <strong>јавно активиран<\/strong>/);
    assert.match(html,/catalog_public===true/);
  });
  test("G11 catalogue visibility does not open document, RAG or production gates",()=>{
    assert.equal(data.collection.catalog_visibility.public_download,false);
    assert.equal(data.collection.catalog_visibility.rag_eligibility,false);
    assert.equal(data.collection.catalog_visibility.production_corpus_write,false);
    assert.equal(data.collection.catalog_visibility.legal_corpus_promotion,false);
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
  });
});
