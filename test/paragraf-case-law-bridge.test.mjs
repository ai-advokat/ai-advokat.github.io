import test from "node:test";
import assert from "node:assert/strict";
import { bridgeParagrafCaseLaw } from "../scripts/paragraf-case-law-bridge.mjs";

function pack(records){
  const manifest={
    type:"ai_advokat_paragraf_normalized_manifest",
    run_id:"bridge-test",
    source_provider:"Paragraf.mk",
    source_product:"LexAI",
    authorized_export:true,
    license_or_access_basis:"Owner-authorized export",
    normalized_record_count:records.length,
    production_eligible:false,
    human_gate_required:true
  };
  return [manifest,...records].map(JSON.stringify).join("\n")+"\n";
}

test("PCLB1 bridges case-law records as licensed secondary discovery",()=>{
  const out=bridgeParagrafCaseLaw(pack([
    {
      legacy_id:"P-100",
      document_type:"case_law",
      corpus_role:"case_law",
      title:"Тест пресуда",
      jurisdiction:"MK",
      source_url:"https://paragraf.mk/case/P-100",
      source_sha256:"a".repeat(64),
      source_product:"Nova",
      metadata_json:JSON.stringify({
        court:"Врховен суд",
        case_number:"Рев2-100/2025",
        decision_date:"2025-12-01",
        legal_area:"граѓанско право",
        external_ids:{domestic_case_number:"Рев2-100/2025"},
        finality_status:"final"
      })
    }
  ]));
  assert.equal(out.cases.length,1);
  assert.equal(out.manifest.source_class,"licensed_secondary_export");
  assert.equal(out.manifest.discovery_only,true);
  assert.equal(out.cases[0].source_product,"Nova");
  assert.equal(out.cases[0].external_ids.paragraf_legacy_id,"P-100");
  assert.equal(out.cases[0].external_ids.domestic_case_number,"Рев2-100/2025");
});

test("PCLB2 non-case records are excluded and no-case export fails closed",()=>{
  assert.throws(
    ()=>bridgeParagrafCaseLaw(pack([{document_type:"primary_law",corpus_role:"primary_law",title:"Law"}])),
    /No case_law records/
  );
});

test("PCLB3 absent or foreign source URL falls back to Paragraf root",()=>{
  const out=bridgeParagrafCaseLaw(pack([
    {
      legacy_id:"P-2",document_type:"case_law",corpus_role:"case_law",title:"Case",
      source_url:"https://example.com/private",source_sha256:"b".repeat(64),
      metadata_json:"{}"
    }
  ]));
  assert.equal(out.cases[0].source_url,"https://paragraf.mk/");
  assert.match(out.cases[0].court,/pending Human Gate/);
});
