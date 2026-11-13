import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("hybrid-legal-intelligence.html","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const pagesSync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
const workerSmoke=fs.readFileSync(".github/workflows/worker-runtime-live-smoke.yml","utf8");
const rootSmoke=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");

test("Hybrid Lawyer View exposes ten governed legal workflow modules",()=>{
  assert.match(page,/Hybrid Legal Intelligence R2/);
  assert.match(page,/Lawyer View/);
  for(const label of [
    "Article Time Machine",
    "Law ↔ Bylaw Graph",
    "Article ↔ Case-Law",
    "Legal Effective-Date Calendar",
    "Visual Consolidation Diff",
    "Open Data Legal Evidence",
    "Official e‑Service Navigator",
    "eID + Human Handoff",
    "Gold Set Review Gate",
    "ECHR ↔ Domestic Case-Law Crosswalk"
  ]) assert.equal(page.includes(label),true,label);
  assert.match(page,/Human Gate · Authority Boundary/);
  assert.match(page,/Secondary signals:/);
  assert.match(page,/Current-law promotion:/);
});

test("Hybrid R2 removes developer-first IDs from the primary Lawyer View flow",()=>{
  assert.match(page,/id="instrumentSelect"/);
  assert.equal(page.includes("/api/hybrid/instruments"),true);
  assert.equal(page.includes("/api/hybrid/consolidations"),true);
  assert.match(page,/id="beforeVersion"/);
  assert.match(page,/id="afterVersion"/);
  assert.match(page,/Напредно · canonical key/);
  assert.doesNotMatch(page,/Before consolidated-text ID/);
  assert.doesNotMatch(page,/After consolidated-text ID/);
});

test("Hybrid R2 renders structured legal results while preserving raw provenance payload",()=>{
  assert.match(page,/class:"article-card"/);
  assert.match(page,/class:"graph-list"/);
  assert.match(page,/class:"case-list"/);
  assert.match(page,/class:"timeline"/);
  assert.match(page,/class:"diff-list"/);
  assert.match(page,/Технички JSON · provenance payload/);
  assert.match(page,/SHA-256:/);
  assert.match(page,/Derivation trace:/);
});

test("Hybrid R2 inline JavaScript is syntactically valid",()=>{
  const match=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,"inline script missing");
  assert.doesNotThrow(()=>new Function(match[1]));
});

test("Hybrid R2 discovery APIs are read-only and Human-Gate bounded",()=>{
  assert.match(worker,/path==="\/api\/hybrid\/instruments"/);
  assert.match(worker,/path==="\/api\/hybrid\/consolidations"/);
  assert.match(worker,/AI_ADVOCAT_HYBRID_LAWYER_VIEW_R2/);
  assert.match(worker,/autonomousCurrentLawPromotion:false/);
  assert.match(worker,/humanGateRequired:true/);
  assert.match(worker,/FROM legal_instruments li/);
  assert.match(worker,/FROM gazette_consolidated_texts/);
  assert.doesNotMatch(worker,/api\/hybrid\/instruments[\s\S]{0,2500}(INSERT|UPDATE|DELETE)\s+/i);
});

test("Hybrid calendar supports optional selected-instrument filtering",()=>{
  assert.match(worker,/const calendarParams=\[from,to\]/);
  assert.match(worker,/calendarSql\+=" AND instrument_key=\?"/);
  assert.match(worker,/calendarParams\.push\(instrument\)/);
});

test("Pages sync publishes and verifies the Hybrid R2 workbench",()=>{
  assert.match(pagesSync,/\n\s+hybrid-legal-intelligence\.html\n/);
  assert.match(pagesSync,/test -f hybrid-legal-intelligence\.html/);
  assert.match(pagesSync,/grep -q 'Hybrid Legal Intelligence R2' hybrid-legal-intelligence\.html/);
  for(const artifact of [
    "index.html","case-law-curation.html","consolidator/index.html","hybrid-legal-intelligence.html",
    "professional-tools.html","public-legal-data-services.html","gold-set-review-gate.html","echr-crosswalk.html","bot/index.html"
  ]) assert.ok(pagesSync.includes(artifact),"Pages parity manifest missing "+artifact);
});

test("Worker and root release smokes verify Hybrid R2 live",()=>{
  assert.match(workerSmoke,/expected_hybrid=.*hybrid-legal-intelligence\.html/);
  assert.match(workerSmoke,/worker-hybrid\.html/);
  assert.match(workerSmoke,/HYBRID R2 WORKBENCH \+ ECHR CROSSWALK \+ DISCOVERY APIS: PASS/);
  assert.match(rootSmoke,/pages-hybrid\.html/);
  assert.match(rootSmoke,/grep -q 'Hybrid Legal Intelligence R2' \/tmp\/pages-hybrid\.html/);
  assert.match(rootSmoke,/grep -q 'Lawyer View' \/tmp\/pages-hybrid\.html/);
});

test("Hybrid integrates official public legal evidence and e-service APIs",()=>{
  assert.match(page,/\/api\/public-legal\/open-data/);
  assert.match(page,/\/api\/public-legal\/services/);
  assert.match(page,/data-module="opendata"/);
  assert.match(page,/data-module="services"/);
  assert.match(page,/data-module="handoff"/);
  assert.match(page,/data-module="gold"/);
  assert.match(page,/data-module="echr"/);
  assert.match(page,/echr-crosswalk\.html/);
  assert.match(page,/gold-set-review-gate\.html/);
  assert.match(worker,/gold_set_review_gate/);
  assert.match(worker,/echr_domestic_case_law_crosswalk/);
  assert.match(worker,/open_data_legal_evidence/);
  assert.match(worker,/official_e_service_navigator/);
  assert.match(worker,/eid_human_handoff/);
  assert.match(page,/No autonomous submission/);
});

test("Hybrid Lawyer View embeds a ten-step operating guide",()=>{
  assert.match(page,/id="guide"/);
  assert.match(page,/Водилка · Како функционира Hybrid Legal Intelligence/);
  assert.match(page,/Препорачан workflow/);
  assert.match(page,/Official source/);
  assert.match(page,/Reviewed authority/);
  assert.match(page,/Discovery/);
  assert.match(page,/Human Gate/);
  assert.equal((page.match(/class="guide-step"/g)||[]).length,10);
  assert.match(page,/Брз пример:/);
  assert.match(page,/href="#guide"/);
});

