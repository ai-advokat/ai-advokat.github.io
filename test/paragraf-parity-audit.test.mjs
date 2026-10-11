import test from "node:test";
import assert from "node:assert/strict";
import { auditParagrafParity } from "../scripts/paragraf-parity-audit.mjs";

function normalized(records,expectedCounts){
  const manifest={
    type:"ai_advokat_paragraf_normalized_manifest",
    run_id:"audit-test",
    source_provider:"Paragraf.mk",
    source_product:"LexAI",
    authorized_export:true,
    license_or_access_basis:"Owner-authorized export",
    normalized_record_count:records.length,
    expected_counts:expectedCounts,
    production_eligible:false,
    human_gate_required:true
  };
  return [manifest,...records].map(JSON.stringify).join("\n")+"\n";
}
function row(id,role,extra={}){
  return {
    legacy_id:id,
    document_type:role,
    corpus_role:role,
    title:id,
    visibility:role==="private_case"?"private":"public",
    knowledge_eligible:role==="private_case"?0:1,
    source_sha256:(id.charCodeAt(0)%16).toString(16).repeat(64),
    ...extra
  };
}
function queue(entries){
  const manifest={
    type:"official_binding_queue_manifest",
    source_run_id:"audit-test-case-law",
    record_count:entries.length,
    official_source_required:true,
    human_gate_required:true
  };
  return [manifest,...entries].map(JSON.stringify).join("\n")+"\n";
}

test("PPA1 passes exact role counts and fail-closed binding queue",()=>{
  const records=[row("A","primary_law"),row("B","case_law"),row("C","private_case")];
  const q=queue([{
    type:"official_binding_candidate",
    queue_key:"bind:B",
    lookup_readiness:"identifier_ready",
    binding_status:"pending",
    human_review_status:"pending"
  }]);
  const out=auditParagrafParity(normalized(records,{primary_law:1,case_law:1,private_case:1}),q);
  assert.equal(out.pass,true);
  assert.equal(out.case_law_count,1);
  assert.equal(out.binding_queue.candidates,1);
  assert.equal(out.private_or_administrative_count,1);
});

test("PPA2 expected count mismatch fails",()=>{
  const out=auditParagrafParity(normalized([row("A","primary_law")],{primary_law:2}));
  assert.equal(out.pass,false);
  assert.ok(out.issues.some(x=>x.code==="ROLE_COUNT_MISMATCH"));
});

test("PPA3 private knowledge eligibility violation fails",()=>{
  const out=auditParagrafParity(normalized([
    row("C","private_case",{knowledge_eligible:1})
  ],{private_case:1}));
  assert.equal(out.pass,false);
  assert.ok(out.issues.some(x=>x.code==="PRIVATE_KNOWLEDGE_ELIGIBILITY_VIOLATION"));
});

test("PPA4 binding queue count mismatch fails",()=>{
  const out=auditParagrafParity(
    normalized([row("B","case_law")],{case_law:1}),
    queue([])
  );
  assert.equal(out.pass,false);
  assert.ok(out.issues.some(x=>x.code==="CASE_LAW_BINDING_QUEUE_COUNT_MISMATCH"));
});

test("PPA5 duplicate identifiers are warnings, not silent",()=>{
  const same="a".repeat(64);
  const out=auditParagrafParity(normalized([
    row("D","reference",{source_sha256:same}),
    row("D","reference",{source_sha256:same})
  ],{reference:2}));
  assert.equal(out.pass,true);
  assert.ok(out.warnings.some(x=>x.code==="DUPLICATE_LEGACY_ID"));
  assert.ok(out.warnings.some(x=>x.code==="DUPLICATE_SOURCE_SHA256"));
});
