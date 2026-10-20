import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("document-router.html","utf8");
const client=fs.readFileSync("assets/document-router.js","utf8");
const caseClient=fs.readFileSync("assets/case-law-metadata.js","utf8");
const professional=fs.readFileSync("professional-tools.html","utf8");

test("mixed-document router is wired from Professional Tools and keeps Human Gate visible",()=>{
  assert.match(professional,/href="\/document-router\.html"/);
  assert.match(page,/Governed Document Router/);
  assert.match(page,/Human Gate/);
  assert.match(page,/production|reviewed authority|remote bytes/i);
});

test("router client uses deterministic router, governed registries and local SHA-256",()=>{
  assert.match(client,/document-ingest-router\.js/);
  assert.match(client,/official-source-binder\.js/);
  assert.match(client,/open-legal-sources-registry-2026\.json/);
  assert.match(client,/case-law-source-registry-2026\.json/);
  assert.match(client,/crypto\.subtle\.digest\("SHA-256"/);
  assert.match(client,/productionEligible:false/);
  assert.match(client,/humanGateRequired:true/);
});

test("router sends no full document to a server endpoint",()=>{
  assert.doesNotMatch(client,/fetch\([^\n]*(?:documentText|fullText|sourceText)/);
  assert.doesNotMatch(client,/body:\s*JSON\.stringify\([^\n]*(?:text|content)/i);
});

test("case-law workbench refuses non-case-law auto-routing",()=>{
  assert.match(caseClient,/classifyDocumentForIngest/);
  assert.match(caseClient,/routing\.route!==["']case_law["']/);
  assert.match(caseClient,/Governed Document Router/);
});

test("router source manifest is provenance-only and does not create authority",()=>{
  assert.match(page,/Source manifest/);
  assert.match(client,/sourceBinding/);
  assert.match(client,/metadataStagingEligible/);
  assert.doesNotMatch(client,/officialBindingVerified\s*[:=]\s*true/);
  assert.doesNotMatch(client,/humanGateRequired\s*[:=]\s*false/);
});
