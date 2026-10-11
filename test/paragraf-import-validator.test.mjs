import test from "node:test";
import assert from "node:assert/strict";
import { validateParagrafImport } from "../scripts/validate-paragraf-import.mjs";

function input(records,manifestOverrides={}){
  const manifest={
    type:"ai_advokat_paragraf_normalized_manifest",
    run_id:"validator-test-1",
    source_provider:"Paragraf.mk",
    source_product:"LexAI",
    authorized_export:true,
    license_or_access_basis:"Owner-authorized export",
    normalized_record_count:records.length,
    normalized_payload_sha256:"a".repeat(64),
    production_eligible:false,
    human_gate_required:true,
    ...manifestOverrides
  };
  return [manifest,...records].map(JSON.stringify).join("\n")+"\n";
}

test("PIV1 normalized manifest is accepted and counted separately",()=>{
  const out=validateParagrafImport(input([
    {document_type:"case_law",corpus_role:"case_law",title:"Case",visibility:"public",knowledge_eligible:1,source_sha256:"b".repeat(64)}
  ]));
  assert.equal(out.records,1);
  assert.equal(out.has_manifest,true);
  assert.equal(out.run_id,"validator-test-1");
});

test("PIV2 manifest count mismatch fails closed",()=>{
  assert.throws(
    ()=>validateParagrafImport(input([{document_type:"reference",title:"A"}],{normalized_record_count:2})),
    /normalized_record_count mismatch/
  );
});

test("PIV3 apply requires staging",()=>{
  assert.throws(
    ()=>validateParagrafImport(input([{document_type:"reference",title:"A"}]),{apply:true,staging:false}),
    /requires --staging/
  );
});

test("PIV4 production eligibility and secrets are rejected",()=>{
  assert.throws(
    ()=>validateParagrafImport(input([{document_type:"reference",title:"A"}],{production_eligible:true})),
    /production_eligible=false/
  );
  assert.throws(
    ()=>validateParagrafImport(input([{document_type:"reference",title:"A",metadata_json:"{\"session_id\":\"abc\"}"}])),
    /Forbidden sensitive material/
  );
});
