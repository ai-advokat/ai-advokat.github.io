import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {isGateApproved} from "../scripts/human-gate-ledger-validator.mjs";

const requestPath=new URL("../.github/activation/case-workspace-production-request.json",import.meta.url);
const raw=fs.readFileSync(requestPath);
const request=JSON.parse(raw);
const workflow=fs.readFileSync(new URL("../.github/workflows/case-workspace-production-activation.yml",import.meta.url),"utf8");
const ledger=JSON.parse(fs.readFileSync(new URL("../data/human-gate-decision-ledger.json",import.meta.url),"utf8"));
const sha=crypto.createHash("sha256").update(raw).digest("hex");

test("Case Workspace activation artifact is fingerprint-bound and narrowly authorised",()=>{
  assert.equal(sha,"1fac9cb9e4b5837a92ca9e75345e1b450fe8bf5b310d2b9ee29b3162f1ca46b0");
  assert.equal(request.activation_authorized,true);
  assert.equal(request.migration,"0029_secure_case_workspace.sql");
  assert.equal(request.private_document_upload_authorized,false);
  assert.equal(request.private_object_storage_activation_authorized,false);
  assert.equal(request.provider_activation_authorized,false);
  assert.deepEqual(request.authorized_gates,["github_merge","production_schema_migration","production_runtime_deploy"]);
});

test("Human Gate approves only the Case Workspace release gates",()=>{
  const query={
    subject_id:"secure-case-workspace-v1-2026-10-10",
    artifact_version:request.decision_id,
    artifact_fingerprint:{activation_request_sha256:sha}
  };
  for(const gate of request.authorized_gates){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),true,gate);
  }
  for(const gate of ["provider_activation","production_corpus_write","corpus_promotion","rag_eligibility"]){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),false,gate);
  }
});

test("production workflow is migration-exact and keeps private storage locked",()=>{
  assert.match(workflow,/0029_secure_case_workspace\.sql/);
  assert.match(workflow,/Unexpected pending migrations/);
  assert.match(workflow,/if\(c\.r2_buckets\) throw new Error\("Private CASE_FILES storage must remain unbound/);
  assert.match(workflow,/workspace_ready_storage_locked/);
  assert.match(workflow,/case_workspace_membership_required/);
  assert.match(workflow,/Global document upload boundary failed/);
});
