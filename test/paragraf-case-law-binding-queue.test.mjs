import test from "node:test";
import assert from "node:assert/strict";
import { buildParagrafBindingQueue } from "../scripts/paragraf-case-law-binding-queue.mjs";

function pack(cases){
  const manifest={
    type:"case_law_manifest",
    run_id:"bridge-test-case-law",
    source_class:"licensed_secondary_export",
    source_provider:"Paragraf.mk",
    source_product:"Lex",
    authorized_export:true,
    license_or_access_basis:"Owner-authorized export"
  };
  return [manifest,...cases].map(JSON.stringify).join("\n")+"\n";
}

test("PBQ1 produces pending Human Gate official binding candidates",()=>{
  const out=buildParagrafBindingQueue(pack([
    {
      type:"case_law_case",
      case_key:"paragraf:P1",
      case_title:"Case",
      court:"Врховен суд",
      case_number:"Рев2-1/2025",
      jurisdiction:"MK",
      decision_date:"2025-01-01",
      source_url:"https://paragraf.mk/",
      source_sha256:"a".repeat(64),
      source_record_id:"P1",
      external_ids:{paragraf_legacy_id:"P1",domestic_case_number:"Рев2-1/2025"}
    }
  ]));
  assert.equal(out.entries.length,1);
  assert.equal(out.entries[0].lookup_readiness,"identifier_ready");
  assert.equal(out.entries[0].binding_status,"pending");
  assert.equal(out.entries[0].human_review_status,"pending");
  assert.equal(out.manifest.official_source_required,true);
});

test("PBQ2 weak metadata remains metadata_search_required",()=>{
  const out=buildParagrafBindingQueue(pack([
    {
      type:"case_law_case",case_key:"x",case_title:"Case",court:"Unknown",
      jurisdiction:"MK",source_url:"https://paragraf.mk/",source_sha256:"b".repeat(64),external_ids:{}
    }
  ]));
  assert.equal(out.entries[0].lookup_readiness,"metadata_search_required");
});
