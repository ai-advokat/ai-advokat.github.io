import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
const bridge=fs.readFileSync(new URL("../src/casepilot-workspace-bridge.js",import.meta.url),"utf8");

test("P3H-01 private document bytes are re-hashed before download and extraction",()=>{
  assert.match(worker,/verifyCaseDocumentSha256/);
  assert.match(worker,/case_document_integrity_mismatch/);
  assert.match(worker,/storage_state='quarantined',extraction_state='failed'/);
  assert.match(worker,/reason:"sha256_mismatch"/);
  const extract=worker.slice(worker.indexOf('if(tail.startsWith("documents/") && tail.endsWith("/extract"))'),worker.indexOf('if(tail.startsWith("documents/"))'));
  assert.match(extract,/verifyCaseDocumentSha256/);
  const download=worker.slice(worker.indexOf('if(segments.length===2 && segments\[1\]==="download")'),worker.indexOf('if(segments.length===1 && request.method==="DELETE")'));
  assert.match(download,/verifyCaseDocumentSha256/);
});

test("P3H-02 deleted quarantined and reserved slots cannot become CasePilot sources",()=>{
  assert.match(bridge,/\["deleted","quarantined","reserved"\]\.includes\(storageState\)/);
});

test("P3H-03 evidence deletion invalidates analysis and purges stale working drafts",()=>{
  const start=worker.indexOf('if(segments.length===1 && request.method==="DELETE")');
  const block=worker.slice(start,start+3500);
  assert.match(block,/analysis\/latest\.md/);
  assert.match(block,/caseObjectDeletePrefix\(env,.*drafts\//s);
  assert.match(block,/professional_use_locked=1/);
  assert.match(worker,/async function caseObjectDeletePrefix/);
  assert.match(worker,/CASE_FILES\.list/);
  assert.match(worker,/DELETE FROM case_private_object_chunks WHERE object_key LIKE/);
});
