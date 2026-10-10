import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
const workspace=fs.readFileSync(new URL("../src/case-workspace.js",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../casepilot-workspace.html",import.meta.url),"utf8");
const ui=fs.readFileSync(new URL("../assets/casepilot-workspace-ui.js",import.meta.url),"utf8");

test("professional Human Gate is explicit, append-only and fingerprint-bound",()=>{
  const start=worker.indexOf('if(tail==="human-gate")');
  const end=worker.indexOf('if(tail==="exports")',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/caseProfessionalFingerprint\(env,caseId,access\)/);
  assert.match(block,/human_gate_recorded/);
  assert.match(block,/decision==="approved" \? 0 : 1/);
  assert.match(block,/fingerprint:currentFingerprint/);
  assert.match(block,/missingDecisionMeansLocked:true/);
});

test("Human Gate accepts only bounded decision metadata",()=>{
  const start=worker.indexOf('if(tail==="human-gate")');
  const end=worker.indexOf('if(tail==="exports")',start);
  const block=worker.slice(start,end);
  assert.match(block,/new Set\(\["decision","reason"\]\)/);
  assert.match(block,/approved","rejected","needs_revision","revoked/);
  assert.match(block,/human_gate_reason_required/);
  assert.doesNotMatch(block,/documentText|fullText|fileBytes|attachmentText/);
});

test("professional export verifies current fingerprint before approval is effective",()=>{
  const start=worker.indexOf('if(tail==="exports")');
  const block=worker.slice(start,start+7000);
  assert.match(block,/caseProfessionalFingerprint\(env,caseId,access\)/);
  assert.match(block,/latestCaseHumanGate\(env,caseId,currentFingerprint\)/);
  assert.match(block,/case_export_professional_human_gate_stale/);
  assert.match(block,/latestGate\.effectiveApproved/);
});

test("new lawyer authority classification re-locks professional use",()=>{
  const start=worker.indexOf('if(tail==="case-law-classifications")');
  const end=worker.indexOf('if(tail==="human-gate")',start);
  const block=worker.slice(start,end);
  assert.match(block,/SET professional_use_locked=1,updated_at=\?/);
});

test("bounded audit metadata retains fingerprint without private document content",()=>{
  const start=workspace.indexOf("export function safeCaseAuditMetadata");
  const block=workspace.slice(start,start+1800);
  assert.match(block,/"fingerprint"/);
  assert.doesNotMatch(block,/documentText|fullText|ocrText|fileBytes|attachmentText|sourceText/);
});

test("Secure Workspace exposes Human Gate controls and cannot self-derive approval",()=>{
  assert.match(html,/id="recordHumanGate"/);
  assert.match(html,/id="humanGateDecision"/);
  assert.match(html,/server-computed fingerprint/);
  assert.match(ui,/\/human-gate"/);
  assert.match(ui,/body:\{decision,reason\}/);
  assert.doesNotMatch(ui,/professionalUseLocked\s*=\s*false/);
});
