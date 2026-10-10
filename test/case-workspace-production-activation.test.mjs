import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {isGateApproved} from "../scripts/human-gate-ledger-validator.mjs";

const requestPath=new URL("../.github/activation/case-workspace-production-request.json",import.meta.url);
const raw=fs.readFileSync(requestPath);
const request=JSON.parse(raw);
const exportRequestPath=new URL("../.github/activation/case-export-production-request.json",import.meta.url);
const exportRaw=fs.readFileSync(exportRequestPath);
const exportRequest=JSON.parse(exportRaw);
const exportSha=crypto.createHash("sha256").update(exportRaw).digest("hex");
const rerun=JSON.parse(fs.readFileSync(new URL("../.github/activation/case-workspace-export-rerun-2026-10-10.json",import.meta.url),"utf8"));
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


test("CasePilot export activation artifact is fingerprint-bound and does not authorize private upload",()=>{
  assert.equal(exportSha,"a77e18e9f7f9f970cfc27c0d35c49f61fa399a32d0a2a98d26f2c1dfdc0f6770");
  assert.equal(exportRequest.activation_authorized,true);
  assert.equal(exportRequest.runtime_version,"casepilot-export-1.0.0");
  assert.deepEqual(exportRequest.formats,["md","docx","pdf"]);
  assert.deepEqual(exportRequest.authorized_gates,["github_merge","production_runtime_deploy"]);
  assert.equal(exportRequest.professional_export_requires_recorded_human_gate,true);
  assert.equal(exportRequest.private_document_upload_authorized,false);
  assert.equal(exportRequest.private_object_storage_activation_authorized,false);
  assert.equal(exportRequest.provider_activation_authorized,false);
});

test("CasePilot export Human Gate approves runtime deploy but not schema/provider/corpus gates",()=>{
  const query={
    subject_id:"casepilot-export-v1-2026-10-10",
    artifact_version:exportRequest.decision_id,
    artifact_fingerprint:{case_export_request_sha256:exportSha}
  };
  for(const gate of ["github_merge","production_runtime_deploy"]){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),true,gate);
  }
  for(const gate of ["production_schema_migration","provider_activation","production_corpus_write","corpus_promotion","rag_eligibility"]){
    assert.equal(isGateApproved(ledger.initial_records,{...query,gate_type:gate}),false,gate);
  }
});

test("current-main Case Workspace activation performs live bounded export smoke and cleanup",()=>{
  assert.match(workflow,/case-export-production-request\.json/);
  assert.match(workflow,/npm run test:case-export/);
  assert.match(workflow,/md_docx_live_pdf_browser_rendered_human_gate_bound/);
  assert.match(workflow,/Live CasePilot MD DOCX PDF export smoke/);
  assert.match(workflow,/WORKING COPY — HUMAN GATE PENDING/);
  assert.match(workflow,/casepilot_canvas_pdf_v1/);
  assert.match(workflow,/browser_local_pdf_rendering_no_external_service/);
  assert.match(workflow,/event_type==="export_generated"/);
  assert.match(workflow,/Cleanup ephemeral CasePilot export data/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/DELETE FROM case_audit_events WHERE case_id/);
  assert.match(workflow,/DELETE FROM membership_access_keys WHERE account_id/);
});


test("CasePilot export rerun request does not expand Human Gate authorization",()=>{
  assert.equal(rerun.does_not_expand_authorization,true);
  assert.equal(rerun.private_document_upload_authorized,false);
  assert.equal(rerun.private_object_storage_activation_authorized,false);
  assert.equal(rerun.baseline_run,2);
  assert.equal(rerun.baseline_failure,"stale_post_deploy_capabilities_caseExports_undefined");
});

test("live Case Workspace boundary polls for current post-deploy capabilities before export smoke",()=>{
  assert.match(workflow,/seq 1 20/);
  assert.match(workflow,/Current Worker capabilities observed after deploy on attempt/);
  assert.match(workflow,/caseExports!=="md_docx_live_pdf_browser_rendered_human_gate_bound"/);
  assert.match(workflow,/sleep 3/);
  assert.match(workflow,/test "\$ready" = "1"/);
});


test("privacy smoke avoids D1 LIKE and validates bounded audit metadata in JSON",()=>{
  assert.doesNotMatch(workflow,/metadata_json LIKE/);
  assert.match(workflow,/const allowed=new Set\(\["format","mode","caseVersion"\]\)/);
  assert.match(workflow,/Case content leaked into export audit metadata/);
  assert.match(workflow,/LIVE EXPORT PRIVACY: PASS/);
});
