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
