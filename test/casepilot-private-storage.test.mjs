import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_WORKSPACE_MAX_FILE_BYTES,
  validateCaseDocumentUploadMetadata
} from "../src/case-workspace.js";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("private document metadata accepts only bounded PDF/DOCX uploads",()=>{
  assert.equal(CASE_WORKSPACE_MAX_FILE_BYTES,20*1024*1024);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.pdf",mimeType:"application/pdf",pageCount:"4"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"contract.docx",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}).ok,true);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.exe",mimeType:"application/octet-stream"}).ok,false);
  assert.equal(validateCaseDocumentUploadMetadata({name:"../evidence.pdf",mimeType:"application/pdf"}).ok,false);
  assert.equal(validateCaseDocumentUploadMetadata({name:"evidence.docx",mimeType:"application/pdf"}).ok,false);
});

test("private upload is storage-gated, server-hashed and never stores bytes in D1",()=>{
  const start=worker.indexOf('if(tail==="documents/upload")');
  const end=worker.indexOf('if(tail.startsWith("documents/"))',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/caseWorkspaceStorageReady\(env\)/);
  assert.match(block,/readLimitedBytes\(request,CASE_WORKSPACE_MAX_FILE_BYTES\)/);
  assert.match(block,/caseDocumentBytesMatchMime/);
  assert.match(block,/sha256BytesHex/);
  assert.match(block,/env\.CASE_FILES\.put/);
  assert.match(block,/storage_state='uploaded'/);
  assert.doesNotMatch(block,/file_bytes|document_bytes|extracted_text|document_text/i);
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
  assert.match(worker,/env\.CASE_FILES\.get\(row\.storage_key\)/);
});

test("private deletion removes object, relocks Human Gate and audits",()=>{
  const start=worker.indexOf('if(tail.startsWith("documents/"))');
  const end=worker.indexOf('if(tail==="casepilot")',start);
  const block=worker.slice(start,end);
  assert.match(block,/env\.CASE_FILES\.delete\(row\.storage_key\)/);
  assert.match(block,/professional_use_locked=1/);
  assert.match(block,/'document_deleted'/);
});
