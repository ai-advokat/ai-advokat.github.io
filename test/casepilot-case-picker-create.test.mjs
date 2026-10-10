import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../casepilot-workspace.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../assets/casepilot-workspace-ui.js",import.meta.url),"utf8");

test("secure workspace exposes case picker and creation controls",()=>{
  assert.match(html,/id="loadCases"/);
  assert.match(html,/id="casePickerBody"/);
  assert.match(html,/id="createCase"/);
  assert.match(html,/id="newCaseTitle"/);
  assert.match(html,/Document ingestion останува посебно fail-closed/);
});

test("case listing is authenticated and case-scoped",()=>{
  assert.match(js,/api\("\/api\/cases"\)/);
  assert.match(js,/"X-Membership-Key":accessKey/);
  assert.match(js,/openCaseById/);
  assert.match(js,/\/api\/cases\/"\+encodeURIComponent\(caseId\)\+"\/casepilot"/);
});

test("new workspace creation sends only allowed metadata fields",()=>{
  const start=js.indexOf('$("createCase").addEventListener');
  const end=js.indexOf('$("forgetAccess").addEventListener',start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/title,/);
  assert.match(block,/clientReference:clientReference\|\|null/);
  assert.match(block,/legalArea:legalArea\|\|null/);
  assert.match(block,/retentionUntil:retentionUntil\|\|null/);
  assert.doesNotMatch(block,/documentText|fullText|attachments|fileBytes|ocrText/);
});

test("membership key is still memory-only after case picker addition",()=>{
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|indexedDB/);
  assert.match(js,/let accessKey=""/);
});

test("forget access hides private case list and create controls",()=>{
  const start=js.indexOf('$("forgetAccess").addEventListener');
  const block=js.slice(start,start+1200);
  assert.match(block,/casePickerCard.*classList\.add\("hidden"\)/s);
  assert.match(block,/createCaseCard.*classList\.add\("hidden"\)/s);
  assert.match(block,/accessKey=""/);
});
