import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  slotEligibleForCasePilot,
  mapWorkspaceToCasePilotShell
} from "../src/casepilot-workspace-bridge.js";

const SHA="a".repeat(64);

test("eligible document slots require id, hash and page count",()=>{
  assert.equal(slotEligibleForCasePilot({id:"DOC-1",sha256:SHA,page_count:3}),true);
  assert.equal(slotEligibleForCasePilot({id:"DOC-1",sha256:"bad",page_count:3}),false);
  assert.equal(slotEligibleForCasePilot({id:"DOC-1",sha256:SHA,page_count:null}),false);
});

test("bridge creates source-linked CasePilot shell from secure metadata only",()=>{
  const workspace={
    id:"CASE-123e4567-e89b-42d3-a456-426614174000",
    title:"Работен предмет",
    legal_area:"граѓанско право",
    confidentiality_class:"private_legal",
    professional_use_locked:1
  };
  const slots=[
    {
      id:"DOC-1",
      slot_number:1,
      original_name:"presuda.pdf",
      sha256:SHA,
      page_count:12,
      storage_state:"stored",
      extraction_state:"ready"
    }
  ];
  const out=mapWorkspaceToCasePilotShell(workspace,slots);
  assert.equal(out.caseId,workspace.id);
  assert.equal(out.matter.objects.documents.length,1);
  assert.equal(out.sourceRegistry[0].sourceId,"DOC-1");
  assert.equal(out.privacy.fileBytesExposed,false);
  assert.equal(out.privacy.extractedTextExposed,false);
  assert.equal(out.privacy.metadataOnly,true);
  assert.equal(out.humanGate.professionalUseLocked,true);
});

test("bridge rejects incomplete slots without fabricating provenance",()=>{
  const workspace={
    id:"CASE-123e4567-e89b-42d3-a456-426614174000",
    title:"Работен предмет",
    professional_use_locked:1
  };
  const out=mapWorkspaceToCasePilotShell(workspace,[
    {id:"DOC-X",slot_number:2,original_name:"unknown.pdf",sha256:null,page_count:null,storage_state:"pending",extraction_state:"pending"}
  ]);
  assert.equal(out.matter.objects.documents.length,0);
  assert.equal(out.rejectedSlots.length,1);
  assert.equal(out.rejectedSlots[0].reason,"document_slot_not_ready_for_source_linking");
});

test("bridge reports storage/extraction state but never body fields",()=>{
  const workspace={
    id:"CASE-123e4567-e89b-42d3-a456-426614174000",
    title:"Работен предмет",
    professional_use_locked:1
  };
  const out=mapWorkspaceToCasePilotShell(workspace,[
    {id:"DOC-1",sha256:SHA,page_count:1,storage_state:"stored",extraction_state:"ready"},
    {id:"DOC-2",sha256:"b".repeat(64),page_count:2,storage_state:"stored",extraction_state:"pending"}
  ]);
  assert.deepEqual(out.runtime.storageStates,{stored:2});
  assert.deepEqual(out.runtime.extractionStates,{ready:1,pending:1});
  const json=JSON.stringify(out);
  assert.ok(!/document_text|extracted_text|file_bytes|ocr_text/i.test(json));
});


test("authenticated case API exposes CasePilot shell without private body fields",()=>{
  const worker=fs.readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
  const start=worker.indexOf('if(tail==="casepilot")');
  assert.ok(start>0);
  const block=worker.slice(start,start+2200);
  assert.match(block,/mapWorkspaceToCasePilotShell/);
  assert.match(block,/metadata\/source registry and lawyer authority classifications only/);
  assert.match(block,/file bytes and extracted private text are not returned/);
  assert.doesNotMatch(block,/SELECT[^;]*(document_text|extracted_text|ocr_text|file_bytes)/i);
});
