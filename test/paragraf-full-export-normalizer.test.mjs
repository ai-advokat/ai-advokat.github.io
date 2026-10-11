import test from "node:test";
import assert from "node:assert/strict";
import { normalizeParagrafFullExport } from "../scripts/normalize-paragraf-full-export.mjs";

function pack(records,overrides={}){
  return JSON.stringify({
    manifest:{
      type:"paragraf_full_export_manifest",
      run_id:"test-paragraf-full-2026-10-11",
      source_provider:"Paragraf.mk",
      source_product:"LexAI",
      authorized_export:true,
      license_or_access_basis:"Owner-authorized export supplied for controlled AI Advokat migration",
      ...overrides
    },
    records
  });
}

test("PFM1 normalizes law, case law and commentary with checksums",()=>{
  const out=normalizeParagrafFullExport(pack([
    {id:"L-1",type:"law",title:"Закон тест",text:"Член 1...",source_url:"https://paragraf.mk/law/1"},
    {id:"C-1",type:"judgment",title:"Пресуда тест",text:"Образложение...",court:"Врховен суд",case_number:"TEST-1/2026"},
    {id:"A-1",type:"commentary",title:"Коментар тест",text:"Коментар..."}
  ]));
  assert.equal(out.records.length,3);
  assert.equal(out.records[0].corpus_role,"primary_law");
  assert.equal(out.records[1].corpus_role,"case_law");
  assert.equal(out.records[2].corpus_role,"commentary");
  assert.ok(out.records.every(x=>/^[a-f0-9]{64}$/.test(x.source_sha256)));
  assert.ok(out.records.every(x=>x.knowledge_eligible===1));
  assert.equal(out.manifest.production_eligible,false);
  assert.equal(out.manifest.human_gate_required,true);
});

test("PFM2 private cases and account/billing records never enter knowledge corpus",()=>{
  const out=normalizeParagrafFullExport(pack([
    {id:"P-1",type:"private_case",title:"Private matter",text:"private",visibility:"private"},
    {id:"U-1",type:"account",title:"Account record"},
    {id:"B-1",type:"invoice",title:"Billing record"}
  ]));
  assert.ok(out.records.every(x=>x.knowledge_eligible===0));
});

test("PFM3 rejects credentials or session material anywhere",()=>{
  assert.throws(
    ()=>normalizeParagrafFullExport(pack([{id:"X",type:"reference",title:"Bad",metadata:{session_id:"abc"}}])),
    /Forbidden credential\/session field/
  );
  assert.throws(
    ()=>normalizeParagrafFullExport(pack([{id:"X",type:"reference",title:"Bad",api_key:"abc"}])),
    /Forbidden credential\/session field/
  );
});

test("PFM4 requires explicit export authorization and basis",()=>{
  assert.throws(
    ()=>normalizeParagrafFullExport(pack([{id:"X",type:"reference",title:"Test"}],{authorized_export:false})),
    /authorized_export=true/
  );
  assert.throws(
    ()=>normalizeParagrafFullExport(pack([{id:"X",type:"reference",title:"Test"}],{license_or_access_basis:""})),
    /license_or_access_basis/
  );
});

test("PFM5 preserves Paragraf product lineage and legacy IDs",()=>{
  const out=normalizeParagrafFullExport(pack([
    {legacy_id:"PX-100",type:"judgment",title:"Case",source_product:"Nova",text:"x"}
  ]));
  assert.equal(out.records[0].source_product,"Nova");
  assert.equal(out.records[0].legacy_id,"PX-100");
  assert.equal(out.records[0].source_record_id,"PX-100");
});
