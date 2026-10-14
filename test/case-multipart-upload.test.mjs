import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("migrations/0044_case_multipart_uploads.sql","utf8");

test("MPU1 multipart metadata stores no private document bytes in D1",()=>{
  assert.match(migration,/CREATE TABLE IF NOT EXISTS case_multipart_uploads/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS case_multipart_parts/);
  assert.match(migration,/expected_size INTEGER NOT NULL/);
  assert.match(migration,/expected_size <= 524288000/);
  assert.match(migration,/part_size = 8388608/);
  assert.match(migration,/total_parts BETWEEN 1 AND 64/);
  assert.match(migration,/integrity_manifest_sha256/);
  assert.doesNotMatch(migration,/\b(?:file_bytes|document_bytes|extracted_text|ocr_text|document_text)\b/i);
});

test("MPU2 multipart metadata remains case and account bound",()=>{
  assert.match(migration,/case_id TEXT NOT NULL/);
  assert.match(migration,/document_id TEXT NOT NULL/);
  assert.match(migration,/actor_account_id TEXT NOT NULL/);
  assert.match(migration,/FOREIGN KEY \(case_id\) REFERENCES case_workspaces/);
  assert.match(migration,/FOREIGN KEY \(document_id\) REFERENCES case_document_slots/);
  assert.match(migration,/FOREIGN KEY \(actor_account_id\) REFERENCES membership_accounts/);
});
