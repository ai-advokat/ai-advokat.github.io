import test from "node:test";
import assert from "node:assert/strict";
import { generateParagrafFullImportSql } from "../scripts/paragraf-full-ndjson-to-sql.mjs";

function pack(records,manifestOverrides={}){
  const manifest={
    type:"ai_advokat_paragraf_normalized_manifest",
    run_id:"sql-test-2026-10-11",
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
function row(overrides={}){
  return {
    legacy_id:"P-1",
    document_type:"reference",
    title:"Reference",
    jurisdiction:"MK",
    source_sha256:"b".repeat(64),
    visibility:"public",
    corpus_role:"reference",
    knowledge_eligible:1,
    text_content:"Legal text",
    metadata_json:"{}",
    ...overrides
  };
}

test("PFSQL1 generates rerun-resistant batch and document SQL",()=>{
  const out=generateParagrafFullImportSql(pack([row()]));
  assert.equal(out.records,1);
  assert.equal(out.knowledgeEligibleCount,1);
  assert.match(out.sql,/legacy_import_batches/);
  assert.match(out.sql,/WHERE NOT EXISTS/);
  assert.match(out.sql,/INSERT OR IGNORE INTO legacy_documents/);
  assert.match(out.sql,/'pending','pending'/);
  assert.doesNotMatch(out.sql,/'approved'|'reviewed'/);
});

test("PFSQL2 private, account and commercial content is never knowledge eligible or stored as text",()=>{
  const out=generateParagrafFullImportSql(pack([
    row({legacy_id:"P",visibility:"private",corpus_role:"private_case",document_type:"private_case",text_content:"PRIVATE"}),
    row({legacy_id:"A",corpus_role:"account",document_type:"account",text_content:"ACCOUNT"}),
    row({legacy_id:"B",corpus_role:"commercial",document_type:"commercial",text_content:"BILLING"})
  ]));
  assert.equal(out.privateCount,3);
  assert.equal(out.knowledgeEligibleCount,0);
  assert.doesNotMatch(out.sql,/PRIVATE|ACCOUNT|BILLING/);
});

test("PFSQL3 malformed manifest, count mismatch and secrets fail closed",()=>{
  assert.throws(
    ()=>generateParagrafFullImportSql(pack([row()],{production_eligible:true})),
    /production_eligible=false/
  );
  assert.throws(
    ()=>generateParagrafFullImportSql(pack([row()],{normalized_record_count:2})),
    /record count/
  );
  assert.throws(
    ()=>generateParagrafFullImportSql(pack([row({metadata_json:JSON.stringify({api_key:"x"})})])),
    /Forbidden credential\/session field/
  );
});

test("PFSQL4 requested knowledge eligibility is overridden for private records",()=>{
  const out=generateParagrafFullImportSql(pack([
    row({visibility:"private",corpus_role:"private_case",document_type:"private_case",knowledge_eligible:1})
  ]));
  assert.equal(out.knowledgeEligibleCount,0);
});
