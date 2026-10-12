import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");
const gateModule=fs.readFileSync("src/guide-law-governance.js","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const catalogue=fs.readFileSync("guides/index.html","utf8");
const record=fs.readFileSync("guides/record.html","utf8");
const guides=JSON.parse(fs.readFileSync("data/guides.json","utf8"));

test("GLRI1 backend loads guide dependency registry and current-law readiness ledger",()=>{
  assert.match(worker,/loadGuideLawDependencyRegistry/);
  assert.match(worker,/loadCurrentLawReadinessLedger/);
  assert.match(worker,/evaluateGuideLawDependencies/);
  assert.match(worker,/guideLawGatePrompt/);
});

test("GLRI2 fingerprint-verified guides carry dependency gate into model context and response provenance",()=>{
  assert.match(gateModule,/GUIDE_LAW_DEPENDENCY_GATE/);
  assert.match(worker,/lawDependencyGate:dependencyGate\.state/);
  assert.match(worker,/primarySourceRequired:dependencyGate\.primarySourceRequired===true/);
  assert.match(worker,/ai_advokat_guides_secondary_primary_law_required/);
});

test("GLRI3 all public guide records expose law dependencies and remain secondary",()=>{
  assert.equal(guides.records.length,39);
  for(const g of guides.records){
    assert.equal(g.current_law_claim_policy,"primary_source_required",g.id);
    assert.ok(Array.isArray(g.law_dependencies)&&g.law_dependencies.length>=1,g.id);
    assert.notEqual(g.current_law_authority,true,g.id);
  }
  assert.equal(guides.collection.guide_law_runtime_gate.status,"active_fail_closed");
});

test("GLRI4 public catalogue and detail page disclose the official-law gate",()=>{
  assert.match(catalogue,/Закон: официјален извор/);
  assert.match(record,/Законски зависности/);
  assert.match(record,/секундарен материјал/);
});

test("GLRI5 chat visibly labels secondary-guide-only legal support",()=>{
  assert.match(chat,/ai_advokat_guides_secondary_primary_law_required/);
  assert.match(chat,/задолжителен официјален законски извор/);
});
