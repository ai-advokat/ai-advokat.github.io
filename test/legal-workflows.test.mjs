import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LEGAL_WORKFLOWS,
  getLegalWorkflow,
  listLegalWorkflows,
  buildWorkflowRun
} from "../src/legal-workflows.js";

test("workflow catalogue contains the agreed professional workflows",()=>{
  const ids=LEGAL_WORKFLOWS.map(w=>w.id);
  for(const id of [
    "complaint_or_indictment_analysis",
    "matter_chronology",
    "statement_comparison",
    "missing_evidence_review",
    "contract_review",
    "hearing_preparation",
    "due_diligence_review_table"
  ]) assert.ok(ids.includes(id),id);
});

test("every workflow is source-first and Human-Gate bound",()=>{
  for(const w of LEGAL_WORKFLOWS){
    assert.equal(w.humanGate,"required");
    assert.ok(w.steps.includes("lawyer_human_gate"));
    assert.ok(w.outputs.length>0);
  }
});

test("workflow run cannot autonomously file, sign or transmit",()=>{
  const run=buildWorkflowRun("hearing_preparation",{
    matterId:"CASE-TEST",
    documentIds:["DOC-1","DOC-2","DOC-1"]
  });
  assert.deepEqual(run.documentIds,["DOC-1","DOC-2"]);
  assert.equal(run.humanGate.professionalUse,"locked");
  assert.equal(run.humanGate.filing,"forbidden");
  assert.equal(run.humanGate.signature,"forbidden");
  assert.equal(run.humanGate.externalTransmission,"forbidden");
  assert.ok(run.steps.every(s=>s.status==="pending"));
});

test("unknown workflows fail closed",()=>{
  assert.equal(getLegalWorkflow("does-not-exist"),null);
  assert.throws(()=>buildWorkflowRun("does-not-exist"),/not_found/);
  assert.ok(listLegalWorkflows().every(x=>x.humanGate==="required"));
});


test("Worker exposes workflow catalogue read-only",()=>{
  const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
  assert.match(worker,/\/api\/professional-workflows/);
  assert.match(worker,/listLegalWorkflows\(\)/);
  assert.match(worker,/humanGate:"required"/);
});
