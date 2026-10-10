import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_WORKSPACE_VERSION,
  CASE_WORKSPACE_DOCUMENT_LIMIT,
  CASE_WORKSPACE_ALLOWED_PLANS,
  caseWorkspacePlanAllowed,
  validateCaseWorkspaceCreate,
  caseWorkspaceId,
  caseWorkspaceStorageReady,
  caseWorkspaceRuntimeState,
  safeCaseWorkspaceView,
  safeCaseAuditMetadata
} from "../src/case-workspace.js";

const migration=fs.readFileSync(new URL("../migrations/0029_secure_case_workspace.sql",import.meta.url),"utf8");
const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
const wrangler=JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8"));

test("secure case workspace is bounded to 20 documents and professional plans",()=>{
  assert.equal(CASE_WORKSPACE_VERSION,"1.0.0");
  assert.equal(CASE_WORKSPACE_DOCUMENT_LIMIT,20);
  assert.deepEqual(CASE_WORKSPACE_ALLOWED_PLANS,["trial_pro","pro","office"]);
  for(const plan of ["trial_pro","pro","office"]) assert.equal(caseWorkspacePlanAllowed(plan),true);
  for(const plan of ["free","start","",null]) assert.equal(caseWorkspacePlanAllowed(plan),false);
});

test("case creation accepts only bounded metadata and rejects extra fields",()=>{
  const good=validateCaseWorkspaceCreate({
    title:"Наследен предмет — работен простор",
    clientReference:"CLIENT-REF-01",
    legalArea:"наследно право",
    retentionUntil:"2027-10-10"
  });
  assert.equal(good.ok,true);
  assert.equal(good.value.title,"Наследен предмет — работен простор");

  const extra=validateCaseWorkspaceCreate({title:"x",secretDocumentText:"private"});
  assert.equal(extra.ok,false);
  assert.ok(extra.errors.some(x=>x.startsWith("unexpected_field:")));

  const invalid=validateCaseWorkspaceCreate({title:"ok",retentionUntil:"tomorrow"});
  assert.equal(invalid.ok,false);
  assert.ok(invalid.errors.includes("invalid_retention_until"));
});

test("case ids are opaque v4 UUID based identifiers",()=>{
  assert.equal(caseWorkspaceId("CASE-123e4567-e89b-42d3-a456-426614174000"),"CASE-123e4567-e89b-42d3-a456-426614174000");
  assert.equal(caseWorkspaceId("CASE-1"),null);
  assert.equal(caseWorkspaceId("../other-case"),null);
});

test("public case view omits tenant/account internals",()=>{
  const view=safeCaseWorkspaceView({
    id:"CASE-123e4567-e89b-42d3-a456-426614174000",
    owner_account_id:"SECRET-ACCOUNT",
    title:"Case",
    client_reference:"REF",
    legal_area:"civil",
    status:"active",
    confidentiality_class:"private_legal",
    document_limit:20,
    professional_use_locked:1,
    created_at:"2026-10-10T00:00:00Z",
    updated_at:"2026-10-10T00:00:00Z"
  },"owner");
  assert.equal(view.professionalUseLocked,true);
  assert.equal("owner_account_id" in view,false);
  assert.equal("ownerAccountId" in view,false);
});

test("storage state fails closed without private object storage binding",()=>{
  assert.equal(caseWorkspaceStorageReady({}),false);
  assert.equal(caseWorkspaceRuntimeState({CASE_WORKSPACE_ENABLED:"true"},{schemaReady:true}),"workspace_ready_storage_locked");
  const binding={put(){},get(){},delete(){}};
  assert.equal(caseWorkspaceStorageReady({CASE_FILES:binding}),true);
  assert.equal(caseWorkspaceRuntimeState({CASE_WORKSPACE_ENABLED:"true",CASE_FILES:binding},{schemaReady:true}),"workspace_and_storage_ready");
  assert.equal(caseWorkspaceRuntimeState({CASE_WORKSPACE_ENABLED:"true"},{schemaReady:false}),"schema_not_ready");
});

test("audit metadata is privacy bounded",()=>{
  const x=JSON.parse(safeCaseAuditMetadata({
    reason:"user request",
    slotNumber:3,
    privateDocumentText:"MUST NOT LEAK",
    clientName:"MUST NOT LEAK"
  }));
  assert.deepEqual(x,{reason:"user request",slotNumber:3});
});

test("migration contains tenant access, audit and metadata slots but no document body columns",()=>{
  for(const table of ["case_workspaces","case_workspace_access","case_document_slots","case_audit_events"]){
    assert.match(migration,new RegExp("CREATE TABLE IF NOT EXISTS "+table));
  }
  assert.match(migration,/document_limit INTEGER NOT NULL DEFAULT 20/);
  assert.match(migration,/FOREIGN KEY \(owner_account_id\) REFERENCES membership_accounts/);
  assert.match(migration,/UNIQUE \(case_id, slot_number\)/);
  assert.doesNotMatch(migration,/document_bytes|file_bytes|extracted_text|document_text|ocr_text/i);
});

test("Worker case API requires membership and per-case account access",()=>{
  assert.match(worker,/case_workspace_membership_required/);
  assert.match(worker,/caseWorkspacePlanAllowed\(membership\.planCode\)/);
  assert.match(worker,/a\.account_id=\? AND a\.status='active'/);
  assert.match(worker,/case_workspace_plan_required/);
  assert.match(worker,/private_case_metadata/);
  assert.match(worker,/No document bytes are stored in D1/);
  assert.match(worker,/url\.pathname === "\/api\/cases" \|\| url\.pathname\.startsWith\("\/api\/cases\/"\)/);
});

test("case workspace runtime is armed while document storage remains separately unbound",()=>{
  assert.equal(wrangler.vars.CASE_WORKSPACE_ENABLED,"true");
  assert.equal(Object.prototype.hasOwnProperty.call(wrangler,"r2_buckets"),false);
});
