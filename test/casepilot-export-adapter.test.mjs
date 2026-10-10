import test from "node:test";
import assert from "node:assert/strict";
import {
  createMatter,
  documentRecord,
  claim,
  evidenceItem,
  claimEvidenceLink,
  contradiction,
  aiFinding,
  decideAIFinding,
  addMatterObject
} from "../src/casepilot-matter.js";
import { casePilotMatterToExportReport } from "../src/casepilot-export-adapter.js";

const SHA="a".repeat(64);

function matter(){
  let m=createMatter({matterId:"CASE-001",title:"Предмет",version:"1.0"});
  m=addMatterObject(m,"documents",documentRecord({id:"DOC-1",title:"Пресуда",sha256:SHA,pageCount:10}));
  m=addMatterObject(m,"documents",documentRecord({id:"DOC-2",title:"Исказ",sha256:"b".repeat(64),pageCount:5}));
  m=addMatterObject(m,"claims",claim({id:"CL-1",text:"Тврдење",sourceId:"DOC-1",page:2,status:"confirmed_from_source"}));
  m=addMatterObject(m,"evidence",evidenceItem({id:"EV-1",title:"Исказ",sourceId:"DOC-2",page:3}));
  m=addMatterObject(m,"claim_evidence",claimEvidenceLink({id:"L-1",claimId:"CL-1",evidenceId:"EV-1"}));
  m=addMatterObject(m,"contradictions",contradiction({
    id:"CON-1",
    left:{text:"А",sourceId:"DOC-1",page:4},
    right:{text:"Б",sourceId:"DOC-2",page:2}
  }));
  return m;
}

test("adapter creates export sections, manifest and provenance",()=>{
  const out=casePilotMatterToExportReport(matter(),{summary:"Работен преглед"});
  assert.equal(out.caseId,"CASE-001");
  assert.equal(out.title,"Предмет");
  assert.equal(out.sourceManifest.length,2);
  assert.ok(out.sections.some(s=>s.id==="claim-evidence"));
  assert.ok(out.sections.some(s=>s.id==="contradictions"));
  assert.ok(out.provenance.some(p=>p.claimId==="CL-1" && p.sourceId==="DOC-1"));
  assert.equal(out.humanGate.status,"pending");
});

test("AI findings export their lawyer decision and source anchors",()=>{
  let m=matter();
  let f=aiFinding({id:"AI-1",text:"AI заклучок",sources:[{sourceId:"DOC-1",page:5}]});
  f=decideAIFinding(f,{decision:"accepted",lawyer:"Reviewer",decidedAt:"2026-10-10T19:00:00Z"});
  m=addMatterObject(m,"ai_findings",f);
  const out=casePilotMatterToExportReport(m);
  const section=out.sections.find(s=>s.id==="ai-findings");
  assert.match(section.items[0].text,/Lawyer decision: accepted/);
  assert.equal(section.items[0].status,"LAWYER_REVIEWED");
  assert.equal(section.items[0].sources[0].locator,"page 5");
  assert.ok(out.provenance.some(p=>p.claimId==="AI-1" && /lawyer_decision:accepted/.test(p.note)));
});

test("adapter fails closed on broken source integrity",()=>{
  let m=createMatter({matterId:"CASE-1",title:"Broken"});
  m=addMatterObject(m,"documents",documentRecord({id:"DOC-1",title:"Doc",sha256:SHA,pageCount:1}));
  m=addMatterObject(m,"claims",claim({id:"CL-X",text:"Bad anchor",sourceId:"DOC-1",page:99}));
  assert.throws(()=>casePilotMatterToExportReport(m),/source_integrity_failed/);
});

test("manifest preserves SHA-256 for auditability",()=>{
  const out=casePilotMatterToExportReport(matter());
  const doc=out.sourceManifest.find(x=>x.id==="DOC-1");
  assert.equal(doc.sha256,SHA);
  assert.equal(doc.version,"1.0");
});
