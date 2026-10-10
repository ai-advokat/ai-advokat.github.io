import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_EXPORT_VERSION,
  CASE_EXPORT_FORMATS,
  normalizeCaseExportReport,
  caseExportFilename,
  caseExportMime,
  renderCaseExportMarkdown,
  renderCaseExportDocxBytes,
  buildPdfFromJpegPages
} from "../src/case-export.js";

const worker=fs.readFileSync("src/index.js","utf8");
const browser=fs.readFileSync("assets/casepilot-export.js","utf8");

const base={
  caseId:"CASE-123e4567-e89b-42d3-a456-426614174000",
  title:"Оставински предмет — тест",
  caseVersion:"1.2",
  generatedAt:"2026-10-10T12:00:00.000Z",
  summary:"Канонски работен извештај со македонска кирилица.",
  sections:[
    {
      id:"chronology",
      title:"Хронологија",
      items:[
        {
          heading:"Настан 1",
          text:"Оставителот починал на измислен датум. Ова е синтетички тест.",
          status:"CONFIRMED",
          sources:[{id:"DOC-1",locator:"стр. 2",title:"Извод"}]
        }
      ]
    },
    {
      id:"outcome",
      title:"Проценка",
      items:["Исходот не се претставува со измислен процент."]
    }
  ],
  sourceManifest:[
    {
      id:"DOC-1",
      title:"Извод",
      locator:"стр. 2",
      version:"v1",
      sha256:"a".repeat(64)
    }
  ],
  provenance:[
    {claimId:"CL-1",sourceId:"DOC-1",locator:"стр. 2",note:"Потврдено од синтетички извор."}
  ],
  humanGate:{status:"pending"}
};

test("EXP1 export engine exposes MD DOCX PDF and bounded working report",()=>{
  assert.equal(CASE_EXPORT_VERSION,"1.0.0");
  assert.deepEqual(CASE_EXPORT_FORMATS,["md","docx","pdf"]);
  const report=normalizeCaseExportReport(base,{mode:"working"});
  assert.equal(report.mode,"working");
  assert.equal(report.humanGate.status,"pending");
  assert.equal(report.sections.length,2);
  assert.equal(report.sourceManifest.length,1);
  assert.equal(report.provenance.length,1);
});

test("EXP2 professional export requires recorded Human Gate evidence",()=>{
  assert.throws(
    ()=>normalizeCaseExportReport(base,{mode:"professional",serverHumanGate:{status:"approved"}}),
    /case_export_professional_requires_recorded_human_gate/
  );
  const report=normalizeCaseExportReport(base,{
    mode:"professional",
    serverHumanGate:{
      status:"approved",
      reviewer:"Адвокат Тест",
      decidedAt:"2026-10-10T12:30:00.000Z",
      decisionRef:"CAE-HG-1"
    }
  });
  assert.equal(report.mode,"professional");
  assert.equal(report.humanGate.status,"approved");
  assert.equal(report.humanGate.decisionRef,"CAE-HG-1");
});

test("EXP3 Markdown is the canonical UTF-8 master with gate, manifest and provenance",()=>{
  const report=normalizeCaseExportReport(base,{mode:"working"});
  const md=renderCaseExportMarkdown(report);
  assert.match(md,/Оставински предмет/);
  assert.match(md,/WORKING COPY — HUMAN GATE PENDING/);
  assert.match(md,/## Source manifest/);
  assert.match(md,/SHA-256:/);
  assert.match(md,/## Provenance appendix/);
  assert.match(md,/Потврдено од синтетички извор/);
  assert.equal(caseExportMime("md"),"text/markdown; charset=utf-8");
});

test("EXP4 DOCX is a real OpenXML ZIP and preserves Macedonian Cyrillic",()=>{
  const report=normalizeCaseExportReport(base,{mode:"working"});
  const bytes=renderCaseExportDocxBytes(report);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes[0],0x50);
  assert.equal(bytes[1],0x4b);
  const text=new TextDecoder().decode(bytes);
  assert.match(text,/\[Content_Types\]\.xml/);
  assert.match(text,/word\/document\.xml/);
  assert.match(text,/word\/styles\.xml/);
  assert.match(text,/Оставински предмет — тест/);
  assert.match(text,/WORKING COPY — HUMAN GATE PENDING/);
  assert.equal(caseExportMime("docx"),"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("EXP5 PDF assembler emits a multi-page PDF container from browser JPEG pages",()=>{
  const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0x00,0x01,0xff,0xd9]);
  const bytes=buildPdfFromJpegPages([
    {bytes:jpeg,width:1240,height:1754},
    {bytes:jpeg,width:1240,height:1754}
  ]);
  const text=new TextDecoder("latin1").decode(bytes);
  assert.match(text,/^%PDF-1\.4/);
  assert.match(text,/\/Type \/Pages/);
  assert.match(text,/\/Subtype \/Image/);
  assert.match(text,/\/Count 2/);
  assert.match(text,/xref/);
  assert.match(text,/%%EOF/);
  assert.equal(caseExportMime("pdf"),"application/pdf");
});

test("EXP6 filenames are stable, bounded and format-specific",()=>{
  const report=normalizeCaseExportReport(base,{mode:"working"});
  assert.equal(caseExportFilename(report,"md"),"CASE-123e4567-e89b-42d3-a456-426614174000-1.2-casepilot.md");
  assert.equal(caseExportFilename(report,"docx"),"CASE-123e4567-e89b-42d3-a456-426614174000-1.2-casepilot.docx");
  assert.equal(caseExportFilename(report,"pdf"),"CASE-123e4567-e89b-42d3-a456-426614174000-1.2-casepilot.pdf");
});

test("EXP7 authenticated case API derives export mode server-side and never trusts client professional status",()=>{
  assert.match(worker,/if\(tail==="exports"\)/);
  assert.match(worker,/mode=Number\(access\.professional_use_locked\)===0 \? "professional" : "working"/);
  assert.match(worker,/case_export_professional_human_gate_evidence_missing/);
  assert.match(worker,/eventType:"export_generated"/);
  assert.match(worker,/casepilot_canvas_pdf_v1/);
  assert.match(worker,/browser_local_pdf_rendering_no_external_service/);
  assert.match(worker,/caseExports: caseSchemaReady \? "md_docx_live_pdf_browser_rendered_human_gate_bound"/);
});

test("EXP8 browser PDF uses local canvas/system fonts and no bundled font or external PDF service",()=>{
  assert.match(browser,/document\.createElement\("canvas"\)/);
  assert.match(browser,/toBlob/);
  assert.match(browser,/image\/jpeg/);
  assert.match(browser,/buildPdfFromJpegPages/);
  assert.match(browser,/Segoe UI/);
  assert.match(browser,/Arial/);
  assert.doesNotMatch(browser,/\.ttf|\.otf|\.woff2?|pdf\.co|cloudconvert|ilovepdf/i);
});

test("EXP9 export payload rejects unsafe size, control characters and invalid source hash",()=>{
  assert.throws(
    ()=>normalizeCaseExportReport({...base,title:"x\u202Eevil"},{mode:"working"}),
    /case_export_title_invalid/
  );
  assert.throws(
    ()=>normalizeCaseExportReport({...base,sourceManifest:[{id:"x",title:"y",sha256:"bad"}]},{mode:"working"}),
    /case_export_source_sha256_invalid/
  );
});
