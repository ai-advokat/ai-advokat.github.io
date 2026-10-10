import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../casepilot-workspace.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../assets/casepilot-workspace-ui.js",import.meta.url),"utf8");

test("Secure Workspace exposes governed export and audit controls",()=>{
  assert.match(html,/id="exportMd"/);
  assert.match(html,/id="exportDocx"/);
  assert.match(html,/id="exportPdf"/);
  assert.match(html,/id="refreshAudit"/);
  assert.match(html,/оваа страница не може сама да го отклучи Human Gate/i);
});

test("export report preserves source hashes and does not invent document bodies",()=>{
  const start=js.indexOf("function buildExportReport");
  const end=js.indexOf("async function runExport",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/sourceManifest:sourceRegistry\.map/);
  assert.match(block,/sha256:String\(source\.sha256\|\|""\)/);
  assert.doesNotMatch(block,/documentText|fullText|ocrText|fileBytes|attachments/);
});

test("exports use the existing governed server endpoint with memory-only membership key",()=>{
  assert.match(js,/downloadCasePilotExportFromApi/);
  assert.match(js,/membershipKey:accessKey/);
  assert.match(js,/apiBase:API_BASE/);
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|indexedDB/);
});

test("audit is loaded only from the active case-scoped endpoint",()=>{
  assert.match(js,/\/api\/cases\/"\+encodeURIComponent\(activeCaseId\)\+"\/audit"/);
  assert.match(js,/renderAudit/);
});

test("workspace opening refreshes classifications and audit together",()=>{
  const start=js.indexOf("async function openCaseById");
  const end=js.indexOf('$("loadCases").addEventListener',start);
  const block=js.slice(start,end);
  assert.match(block,/await loadClassifications\(\)/);
  assert.match(block,/await loadAudit\(\)/);
});
