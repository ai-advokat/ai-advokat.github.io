import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");

test("CasePilot matter view includes active lawyer authority classifications",()=>{
  const start=worker.indexOf('if(tail==="casepilot")');
  const block=worker.slice(start,start+4500);
  assert.match(block,/loadActiveCaseLawClassifications\(env,caseId\)/);
  assert.match(block,/authorityClassifications/);
  assert.match(block,/metadata\/source registry and lawyer authority classifications only/);
});

test("classification loader exposes reviewer display name, not email",()=>{
  const start=worker.indexOf("async function loadActiveCaseLawClassifications");
  const end=worker.indexOf("async function recordCaseAudit",start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/ma\.display_name AS classifier_display_name/);
  assert.match(block,/classifierDisplayName/);
  assert.doesNotMatch(block,/ma\.email/);
});

test("server injects canonical authority classification section into every case export",()=>{
  const start=worker.indexOf('if(tail==="exports")');
  const block=worker.slice(start,start+10000);
  assert.match(block,/caseLawClassificationExportSection\(authorityClassifications\)/);
  assert.match(block,/caseLawClassificationManifest\(authorityClassifications\)/);
  assert.match(block,/caseLawClassificationProvenance\(authorityClassifications\)/);
  assert.match(block,/authorityClassificationCount:authorityClassifications\.length/);
});

test("client cannot spoof reserved classification export namespaces",()=>{
  const start=worker.indexOf('if(tail==="exports")');
  const block=worker.slice(start,start+10000);
  assert.match(block,/section\?\.id\|\|""\)!=="case-law-authority-classification"/);
  assert.match(block,/startsWith\("CASELAW-"\)/);
  assert.match(block,/startsWith\("authority-classification:"\)/);
});

test("authority export states role, reason, reviewer and official source",()=>{
  const start=worker.indexOf("function caseLawClassificationExportSection");
  const end=worker.indexOf("function caseLawClassificationManifest",start);
  const block=worker.slice(start,end);
  assert.match(block,/Образложение:/);
  assert.match(block,/Класифицирал:/);
  assert.match(block,/LAWYER_CLASSIFIED/);
  assert.match(block,/x\.authority\.sourceUrl/);
});
