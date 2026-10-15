import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_WORKSPACE_MAX_FILE_BYTES,
  CASE_WORKSPACE_MAX_LARGE_FILE_BYTES,
  CASE_MULTIPART_PART_BYTES,
  CASE_MULTIPART_MAX_PARTS,
  validateCaseDocumentUploadMetadata
} from "../src/case-workspace.js";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("private document metadata accepts bounded PDF Word and common image uploads",()=>{
  assert.equal(CASE_WORKSPACE_MAX_FILE_BYTES,25*1024*1024);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.pdf",mimeType:"application/pdf",pageCount:"4"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"legacy.doc",mimeType:"application/msword"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"contract.docx",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"scan.png",mimeType:"image/png"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"photo.jpeg",mimeType:"image/jpeg"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.webp",mimeType:"image/webp"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.exe",mimeType:"application/octet-stream"}).ok,false);
  assert.equal(validateCaseDocumentUploadMetadata({name:"../evidence.pdf",mimeType:"application/pdf"}).ok,false);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.docx",mimeType:"application/pdf"}).ok,false);
});

test("private upload is storage-gated, server-hashed and uses governed private storage",()=>{
  const start=worker.indexOf('if(tail==="documents/upload")');
  const end=worker.indexOf('if(tail.startsWith("documents/"))',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/caseWorkspaceStorageReady\(env\)/);
  assert.match(block,/readLimitedBytes\(request,CASE_WORKSPACE_MAX_FILE_BYTES\)/);
  assert.match(block,/caseDocumentBytesMatchMime/);
  assert.match(block,/sha256BytesHex/);
  assert.match(block,/caseObjectPut\(env,/);
  assert.match(block,/storage_state='uploaded'/);
  assert.doesNotMatch(block,/\b(?:file_bytes|document_bytes|extracted_text|document_text)\b/i);
});

test("reviewer remains read-only for consequential CasePilot writes",()=>{
  const upload=worker.slice(worker.indexOf('if(tail==="documents/upload")'),worker.indexOf('if(tail.startsWith("documents/"))'));
  assert.match(upload,/\["owner","lawyer"\]\.includes/);
  const classifications=worker.slice(worker.indexOf('if(tail==="case-law-classifications")'),worker.indexOf('if(tail==="human-gate")'));
  assert.match(classifications,/case_professional_write_role_required/);
  const humanGate=worker.slice(worker.indexOf('if(tail==="human-gate")'),worker.indexOf('if(tail==="exports")'));
  assert.match(humanGate,/case_professional_write_role_required/);
});

test("private download is case-scoped, no-store and audited",()=>{
  assert.match(worker,/eventType:"document_downloaded"/);
  assert.match(worker,/cache-control":"private, no-store, max-age=0"/);
  assert.match(worker,/filename\*=UTF-8''/);
  assert.match(worker,/caseObjectGet\(env,row\.storage_key\)/);
});

test("private deletion removes object, relocks Human Gate and audits",()=>{
  const start=worker.indexOf('if(tail.startsWith("documents/"))');
  const end=worker.indexOf('if(tail==="casepilot")',start);
  const block=worker.slice(start,end);
  assert.match(block,/caseObjectDelete\(env,row\.storage_key\)/);
  assert.match(block,/professional_use_locked=1/);
  assert.match(block,/'document_deleted'/);
});

test("private upload signature gate covers legacy Word and common image formats",()=>{
  assert.match(worker,/mimeType==="application\/msword"/);
  assert.match(worker,/bytes\[0\]===0xd0 && bytes\[1\]===0xcf/);
  assert.match(worker,/mimeType==="image\/png"/);
  assert.match(worker,/mimeType==="image\/jpeg"/);
  assert.match(worker,/mimeType==="image\/webp"/);
});

test("protected multipart upload is bounded to 500 MB and 64 eight-MiB parts",()=>{
  assert.equal(CASE_WORKSPACE_MAX_FILE_BYTES,25*1024*1024);
  assert.equal(CASE_WORKSPACE_MAX_LARGE_FILE_BYTES,500*1024*1024);
  assert.equal(CASE_MULTIPART_PART_BYTES,8*1024*1024);
  assert.equal(CASE_MULTIPART_MAX_PARTS,64);
  const start=worker.indexOf('if(tail==="documents/multipart/init")');
  const end=worker.indexOf('if(tail==="documents/upload")',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/caseWorkspaceMultipartReady/);
  assert.match(block,/expectedSize<=CASE_WORKSPACE_MAX_FILE_BYTES/);
  assert.match(block,/expectedSize>CASE_WORKSPACE_MAX_LARGE_FILE_BYTES/);
  assert.match(block,/createMultipartUpload/);
  assert.match(block,/resumeMultipartUpload/);
  assert.match(block,/X-Part-SHA256/);
  assert.match(block,/multipart_part_integrity_mismatch/);
  assert.match(block,/multipart_parts_incomplete/);
  assert.match(block,/file_signature_mismatch/);
  assert.match(block,/storageState:"quarantined"/);
  assert.match(block,/sourceEligibility:"locked_until_partitioned_extraction_and_human_gate"/);
});


test("D1 fallback is bounded, chunked and never public corpus",()=>{
  assert.match(worker,/CASE_D1_OBJECT_CHUNK_BYTES=900\*1024/);
  assert.match(worker,/CASE_D1_FALLBACK_MAX_BYTES=CASE_INTELLIGENCE_PROVIDER_MAX_BYTES/);
  assert.match(worker,/case_private_object_chunks/);
  assert.match(worker,/d1_fallback_object_too_large/);
  assert.match(worker,/caseStorageBackend/);
  assert.doesNotMatch(worker,/INSERT INTO legal_articles[^\n]*case_private_object_chunks/i);
});
