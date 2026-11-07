import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");
const page=fs.readFileSync("public-legal-data-services.html","utf8");
const root=fs.readFileSync("index.html","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");

test("Public Legal Data workbench exposes five lawyer-facing capabilities",()=>{
  for(const label of [
    "Open Data Legal Finder",
    "Evidence Dataset Card",
    "Legal Dataset Lens",
    "e‑Service Legal Navigator",
    "eID Readiness + Human Handoff"
  ]) assert.equal(page.includes(label),true,label);
  assert.match(page,/data\.gov\.mk/);
  assert.match(page,/uslugi\.gov\.mk/);
  assert.match(page,/Human Gate/);
});

test("Public Legal Data APIs are read-only and fixed to official hosts",()=>{
  assert.match(worker,/PUBLIC_LEGAL_DATA_VERSION/);
  assert.match(worker,/handlePublicLegalDataServices/);
  assert.match(worker,/\/api\/public-legal\/open-data/);
  assert.match(worker,/\/api\/public-legal\/services/);
  assert.match(worker,/https:\/\/data\.gov\.mk\/api\/3\/action\/package_search/);
  assert.match(worker,/https:\/\/uslugi\.gov\.mk\/service-details\.nspx\?serviceId=5235/);
  assert.match(worker,/autonomousApplicationSubmission:false/);
  assert.match(worker,/openDataIsNotAutomaticLegalAuthority:true/);
});

test("Public Legal Data module is visible in both AI Advokat shells",()=>{
  assert.match(root,/href="\/public-legal-data-services\.html"/);
  assert.match(bot,/href="\/public-legal-data-services\.html"/);
  assert.match(root,/Public Legal Data & e‑Services/);
  assert.match(bot,/Public Legal Data & e‑Services/);
});

test("Open-data proxy cannot be turned into arbitrary SSRF",()=>{
  const start=worker.indexOf("async function handlePublicLegalDataServices");
  const end=worker.indexOf("async function handleHybridLegalIntelligence",start);
  const block=worker.slice(start,end);
  assert.match(block,/new URL\("https:\/\/data\.gov\.mk\/api\/3\/action\/package_search"\)/);
  assert.doesNotMatch(block,/new URL\(url\.searchParams/);
  assert.doesNotMatch(block,/fetch\(url\.searchParams/);
});
