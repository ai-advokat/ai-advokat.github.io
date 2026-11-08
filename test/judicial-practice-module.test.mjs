import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Judicial Practice hub is visible as one canonical header entry",()=>{
  const index=read("index.html");
  assert.equal((index.match(/href="\/judicial-practice\.html"/g)||[]).length,1);
  assert.match(index,/data-header-legal="judicial-practice"/);
});

test("Judicial Practice hub preserves authority-state separation",()=>{
  const html=read("judicial-practice.html");
  for(const marker of [
    "Research","Discovery","Source Binding","Temporal Gate","Gold Review","Reviewed Authority","Case Use",
    "Discovery запис не е правен авторитет","No automatic promotion","Human Gate"
  ]) assert.ok(html.includes(marker),marker);
});

test("Judicial Practice hub links all governed case-law surfaces",()=>{
  const html=read("judicial-practice.html");
  for(const href of [
    "/case-law-curation.html","/gold-set-review-gate.html","/echr-crosswalk.html",
    "/casepilot-workspace.html","/case-law-metadata.html","/hybrid-legal-intelligence.html"
  ]) assert.ok(html.includes(href),href);
});

test("archive provenance boundary blocks automatic authority promotion",()=>{
  const html=read("judicial-practice.html");
  assert.ok(html.includes("evidence и methodology corpus"));
  assert.ok(html.includes("не се автоматски imported како reviewed authority"));
  assert.ok(html.includes("NO-GO/HOLD"));
});

test("Pages curated publish includes Judicial Practice hub",()=>{
  const wf=read(".github/workflows/sync-pages-runtime.yml");
  assert.ok(wf.includes("judicial-practice.html"));
});
