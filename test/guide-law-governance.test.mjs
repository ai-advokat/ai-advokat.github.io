import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {evaluateGuideLawDependencies,guideLawGatePrompt} from "../src/guide-law-governance.js";

const registry=JSON.parse(fs.readFileSync("data/guide-law-dependencies-2026.json","utf8"));
const ledger=JSON.parse(fs.readFileSync("data/mk-current-law-readiness-2026.json","utf8"));
const guides=JSON.parse(fs.readFileSync("data/guides.json","utf8"));

test("GLG1 all 39 guide records have a dependency profile",()=>{
  assert.equal(registry.records.length,39);
  const ids=new Set(registry.records.map(x=>x.guide_id));
  assert.equal(ids.size,39);
  for(const g of guides.records) assert.ok(ids.has(g.id),g.id);
});

test("GLG2 guides never become primary law from the dependency gate",()=>{
  assert.equal(registry.policy.guide_never_primary_law,true);
  assert.equal(registry.policy.current_law_claim_requires_primary_source,true);
  for(const p of registry.records) assert.equal(p.current_law_claim_policy,"primary_source_required");
});

test("GLG3 ZPP-dependent guide exposes temporal dual-track review",()=>{
  const g=evaluateGuideLawDependencies("guide-40-full-word-2026",registry,ledger);
  const zpp=g.dependencies.find(x=>x.key==="mk:zpp");
  assert.ok(zpp);
  assert.equal(zpp.state,"temporal_dual_track_review");
  assert.equal(g.primarySourceRequired,true);
  assert.match(g.state,/primary_source_required/);
});

test("GLG4 ZKP-dependent guide fails closed while official lineage is unresolved",()=>{
  const g=evaluateGuideLawDependencies("guide-46-full-word-2026",registry,ledger);
  const zkp=g.dependencies.find(x=>x.key==="mk:zkp");
  assert.ok(zkp);
  assert.equal(zkp.verified,false);
  assert.equal(g.allDependenciesCurrentVerified,false);
});

test("GLG5 external dependencies explicitly require an official-source check",()=>{
  const g=evaluateGuideLawDependencies("guide-60-full-word-2026",registry,ledger);
  assert.ok(g.dependencies.every(x=>x.state==="external_official_source_required"));
  assert.equal(g.state,"primary_source_required_external_check");
});

test("GLG6 guide law gate prompt is explicit and fail closed",()=>{
  const g=evaluateGuideLawDependencies("guide-free-legal-aid",registry,ledger);
  const prompt=guideLawGatePrompt(g);
  assert.match(prompt,/secondary guidance only/);
  assert.match(prompt,/primary\/official source/);
  assert.match(prompt,/never silently treated as verified current law/);
});
