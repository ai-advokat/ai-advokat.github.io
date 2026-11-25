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

test("legacy gate status is independent of the working-only export boundary",()=>{
  const start=worker.indexOf('if(tail==="exports")');
  const end=worker.indexOf('if(tail==="audit")',start);
  const block=worker.slice(start,end);
  assert.match(block,/case_export_professional_release_on_hold/);
  assert.match(block,/const mode="working"/);
  assert.doesNotMatch(block,/latestCaseHumanGate|caseProfessionalFingerprint|effectiveApproved/);
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
  const start=ui.indexOf('$("recordHumanGate").addEventListener');
  const end=ui.indexOf("function buildExportReport",start);
  assert.ok(start>0 && end>start);
  const block=ui.slice(start,end);
  // The shared case-scoped helper must carry both legacy and revision review.
  assert.match(ui,/api\("\/api\/cases\/"\+encodeURIComponent\(caseId\)\+"\/"\+tail,options\)/);
  assert.match(block,/workspaceRequest\("human-gate",undefined,context\)/);
  assert.match(block,/let body=\{decision,reason\}/);
  assert.match(block,/if\(gate\.responseReviewRequired===true\)/);
  assert.match(block,/revision=\{number:target\.number,sha256:target\.sha256,draftId:target\.draft\.draftId,responseSourcesSha256:target\.draft\.responseSourcesSha256\}/);
  assert.match(block,/revision=gate\.review\.revision/);
  assert.match(block,/\$\("caseDraftResult"\)\.value!==target\.text/);
  assert.match(block,/if\(!confirm\(/);
  assert.match(block,/body=\{scope:"response_revision",decision,reason,revision,expectedDecisionId:gate\.review\?\.decisionId\?\?null\}/);
  assert.match(block,/workspaceRequest\("human-gate",\{method:"POST",body\},context\)/);
  assert.match(block,/if\(data\.responseReviewRequired!==true\)/);
  const render=ui.slice(ui.indexOf("function renderHumanGate("),ui.indexOf('$("refreshHumanGate").addEventListener'));
  assert.match(render,/if\(data\?\.responseReviewRequired===true\)/);
  assert.match(render,/\$\("caseGate"\)\.textContent="LOCKED"/);
  assert.match(render,/\$\("humanGateCurrent"\)\.textContent="HOLD"/);
  assert.doesNotMatch(ui,/professionalUseLocked\s*=\s*false/);
});
