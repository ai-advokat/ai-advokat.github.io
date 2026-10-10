import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync(new URL("../migrations/0033_casepilot_audit_event_schema.sql",import.meta.url),"utf8");
const workspace=fs.readFileSync(new URL("../src/case-workspace.js",import.meta.url),"utf8");

test("0033 preserves every 0029 audit event type and adds case-law classification",()=>{
  for(const event of [
    "workspace_created","workspace_viewed","delete_requested",
    "access_granted","access_revoked",
    "document_slot_reserved","document_uploaded","document_quarantined","document_deleted",
    "analysis_requested","human_gate_recorded","export_generated","case_law_classified"
  ]){
    assert.match(migration,new RegExp("'"+event+"'"));
  }
});

test("0033 copies existing audit rows before replacing the constrained table",()=>{
  const insert=migration.indexOf("INSERT INTO case_audit_events_v2");
  const drop=migration.indexOf("DROP TABLE case_audit_events");
  const rename=migration.indexOf("ALTER TABLE case_audit_events_v2 RENAME TO case_audit_events");
  assert.ok(insert>0 && drop>insert && rename>drop);
  assert.match(migration,/SELECT\s+id,case_id,actor_account_id,event_type,object_type,object_id,metadata_json,created_at\s+FROM case_audit_events/s);
});

test("0033 restores the case audit index and records schema migration 33",()=>{
  assert.match(migration,/CREATE INDEX idx_case_audit_events_case_created/);
  assert.match(migration,/VALUES \('33'/);
});

test("bounded audit metadata now retains classification and export-count fields",()=>{
  const start=workspace.indexOf("export function safeCaseAuditMetadata");
  const block=workspace.slice(start,start+1600);
  assert.match(block,/"role"/);
  assert.match(block,/"issueKey"/);
  assert.match(block,/"authorityClassificationCount"/);
  assert.match(block,/v\.length<=160/);
  assert.match(block,/CONTROL\.test\(v\)/);
});

test("audit metadata does not gain document-body fields",()=>{
  const start=workspace.indexOf("export function safeCaseAuditMetadata");
  const block=workspace.slice(start,start+1600);
  assert.doesNotMatch(block,/documentText|fullText|ocrText|fileBytes|attachmentText|sourceText/);
});
