import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync(new URL("../migrations/0032_casepilot_authority_classifications.sql",import.meta.url),"utf8");
const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("classification schema is private case-scoped provenance",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS casepilot_authority_classifications/);
  assert.match(migration,/FOREIGN KEY \(case_id\) REFERENCES case_workspaces/);
  assert.match(migration,/FOREIGN KEY \(case_law_id\) REFERENCES case_law/);
  assert.match(migration,/supporting','adverse','distinguishing','neutral/);
  assert.match(migration,/status IN \('active','superseded'\)/);
});

test("classification endpoint allows only bounded work-product fields",()=>{
  const start=worker.indexOf('if(tail==="case-law-classifications")');
  assert.ok(start>0);
  const block=worker.slice(start,start+11000);
  assert.match(block,/new Set\(\["caseLawId","role","reason","issueKey"\]\)/);
  assert.match(block,/case_law_role_reason_required/);
  assert.match(block,/unexpected_field/);
  assert.doesNotMatch(block,/documentText|fullText|attachment|fileBytes/);
});

test("classification requires official dual-reviewed authority",()=>{
  const start=worker.indexOf('if(tail==="case-law-classifications")');
  const block=worker.slice(start,start+11000);
  assert.match(block,/source_status!=="official"/);
  assert.match(block,/authority_review_status/);
  assert.match(block,/case_law_not_official_dual_reviewed/);
});

test("new classification supersedes prior active role for same issue and records audit",()=>{
  const start=worker.indexOf('if(tail==="case-law-classifications")');
  const block=worker.slice(start,start+11000);
  assert.match(block,/SET status='superseded'/);
  assert.match(block,/COALESCE\(issue_key,''\)=COALESCE\(\?,''\)/);
  assert.match(block,/case_law_classified/);
  assert.match(block,/safeCaseAuditMetadata\(\{role,issueKey\}\)/);
});

test("classification response states it does not change judgment authority",()=>{
  const start=worker.indexOf('if(tail==="case-law-classifications")');
  const block=worker.slice(start,start+11000);
  assert.match(block,/does not alter the underlying judgment or its legal authority/);
});
