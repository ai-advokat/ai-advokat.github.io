import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../casepilot-workspace.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../assets/casepilot-workspace-ui.js",import.meta.url),"utf8");
const toolsPage=fs.readFileSync(new URL("../professional-tools.html",import.meta.url),"utf8");

test("workspace UI never persists membership key in browser storage",()=>{
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|indexedDB/);
  assert.match(js,/let accessKey=""/);
  assert.match(js,/accessKey="";/);
  assert.match(html,/Клучот не се зачувува/);
});

test("authenticated workspace calls only case-scoped endpoints with membership header",()=>{
  assert.match(js,/"X-Membership-Key":accessKey/);
  assert.match(js,/\/api\/cases\/"\+encodeURIComponent\(caseId\)\+"\/casepilot"/);
  assert.match(js,/\/api\/cases\/"\+encodeURIComponent\(activeCaseId\)\+"\/case-law-classifications"/);
});

test("case-law research remains query-only and does not submit private matter text",()=>{
  const start=js.indexOf('$("researchCaseLaw").addEventListener');
  const end=js.indexOf("function renderResearchCards",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/body:\{query\}/);
  assert.doesNotMatch(block,/documentText|fullText|matterText|attachments|documents/);
});

test("classification UI sends only bounded classification metadata",()=>{
  const start=js.indexOf('$("saveClassification").addEventListener');
  const end=js.indexOf("async function loadClassifications",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/body:\{caseLawId,role,reason,issueKey:issueKey\|\|null\}/);
  assert.doesNotMatch(block,/documentText|fullText|fileBytes|attachment/);
});

test("official source links are https-only and isolated",()=>{
  const start=js.indexOf("function sourceLink");
  const end=js.indexOf("async function api",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/https/);
  assert.match(block,/test\(url\)/);
  assert.match(block,/a\.rel="noopener noreferrer"/);
});

test("professional tools exposes the authenticated secure workspace",()=>{
  assert.match(toolsPage,/href="\/casepilot-workspace\.html"/);
  assert.match(toolsPage,/Отвори Secure Case Workspace/);
});

test("private document vault supports drag drop and multi-file PDF Word image selection",()=>{
  for(const id of ["caseFileDrop","chooseCaseFiles","caseFileInput","caseFileSelection","uploadCaseFile"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/\.pdf,\.doc,\.docx,\.png,\.jpg,\.jpeg,\.webp/);
  assert.match(html,/caseFileInput" type="file" multiple hidden/);
  assert.match(js,/setPendingCaseFiles/);
  assert.match(js,/dataTransfer\?\.files/);
  assert.match(js,/pendingCaseFiles/);
  assert.match(js,/application\/msword/);
  assert.match(js,/image\/png/);
  assert.match(js,/image\/jpeg/);
  assert.match(js,/image\/webp/);
});

test("private document batch is capped at 20 files and 500 MB each",()=>{
  assert.match(html,/до 500 MB по документ · до 20 документи/);
  assert.match(js,/all\.length>20/);
  assert.match(js,/500\*1024\*1024/);
  assert.match(js,/најмногу 20 документи/);
});

test("large private files transparently use multipart integrity uploads",()=>{
  assert.match(html,/до 500 MB по документ · до 20 документи/);
  assert.match(js,/uploadLargePrivateFile/);
  assert.match(js,/documents\/multipart\/init/);
  assert.match(js,/X-Part-SHA256/);
  assert.match(js,/sha256HexFromBuffer/);
  assert.match(js,/file\.size<=25\*1024\*1024/);
  assert.match(js,/file\.size>500\*1024\*1024/);
});


test("Case Intelligence UI exposes whole-case analysis and governed drafting",()=>{
  for(const id of [
    "analyzeEntireCase","refreshIntelligence","intelligenceDocs","intelligenceEvidence","intelligenceLaw",
    "caseIntelligenceResult","caseDraftType","caseDraftInstruction","prepareCaseDraft","caseDraftResult"
  ]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/Case Intelligence Engine/);
  assert.match(html,/Accuracy-First/);
  assert.match(html,/WORKING DRAFT/);
  assert.match(js,/documents\/"\+encodeURIComponent\(row\.id\)\+"\/extract/);
  assert.match(js,/\/intelligence\/analyze/);
  assert.match(js,/\/intelligence\/draft/);
  assert.match(js,/case_document_partitioning_required/);
  assert.match(js,/Professional use останува под Human Gate/);
});

test("whole-case UI fails closed if any active document is not source-ready",()=>{
  const start=js.indexOf('$("analyzeEntireCase").addEventListener');
  const end=js.indexOf('$("prepareCaseDraft").addEventListener',start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/storage_state/);
  assert.match(block,/extraction_state/);
  assert.match(block,/partitioned extraction/);
  assert.doesNotMatch(block,/Promise\.all\([^)]*extract/);
});


test("CasePilot draft action self-heals intake and whole-case analysis prerequisites",()=>{
  assert.match(js,/async function extractPendingCaseDocuments/);
  const start=js.indexOf('$("prepareCaseDraft").addEventListener');
  const end=js.indexOf("async function sha256HexFromBuffer",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/extractPendingCaseDocuments/);
  assert.match(block,/loadIntelligenceReadiness/);
  assert.match(block,/latestAnalysisAvailable/);
  assert.match(block,/\/intelligence\/analyze/);
  assert.match(block,/\/intelligence\/draft/);
  assert.match(block,/WORKING DRAFT/);
});

test("successful private upload starts governed AI intake",()=>{
  const start=js.indexOf('$("uploadCaseFile").addEventListener');
  const end=js.indexOf('$("researchCaseLaw").addEventListener',start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/Започнува AI intake/);
  assert.match(block,/extractPendingCaseDocuments/);
  assert.match(block,/зачувани и прочитани/);
});
