import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  PROFESSIONAL_DOCX_ENGINE_VERSION,
  PROFESSIONAL_DOCX_PROFILE,
  renderProfessionalLegalDocxBundle
} from "../src/professional-docx-engine.js";

import {
  LEGAL_DOCUMENT_AST_VERSION
} from "../src/legal-document-export.js";

import {
  CASE_EXPORT_VERSION,
  normalizeCaseExportReport,
  renderCaseExportDocxBytes
} from "../src/case-export.js";

const SHA_A="a".repeat(64);
const SHA_B="b".repeat(64);
const SHA_C="c".repeat(64);
const SHA_D="d".repeat(64);

function escapeRegex(value){
  return String(value).replace(/[.*+?^$()|[\]\\{}]/g,"\\$&");
}

function workingFixture(){
  return {
    version:LEGAL_DOCUMENT_AST_VERSION,
    caseId:"CASE-PRC-001",
    documentId:"PLEADING-PRC-001",
    caseVersion:"0.3",
    generatedAt:"2026-10-24T18:30:00Z",
    documentType:"employment_claim",
    title:"ТУЖБА — синтетички PR-C тест",
    court:"ОСНОВЕН ГРАЃАНСКИ СУД — СИНТЕТИЧКИ",
    summary:"Синтетички предмет за Professional DOCX Engine.",
    parties:[
      {id:"P-1",role:"ТУЖИТЕЛ",name:"Ана Тестовска",identifier:"[АДРЕСА НА ТУЖИТЕЛ]"},
      {id:"P-2",role:"ТУЖЕН",name:"Тест Работодавач ДОО",identifier:"[СЕДИШТЕ НА ТУЖЕН]"}
    ],
    facts:[
      {
        id:"F-1",
        text:"Тужителката засновала работен однос на 01.02.2024 година.",
        status:"supported",
        evidenceIds:["E-1"]
      },
      {
        id:"F-2",
        text:"Тужениот донел одлука за отказ поради наводно неоправдано отсуство.",
        status:"disputed",
        evidenceIds:["E-2","E-3"]
      }
    ],
    evidence:[
      {
        id:"E-1",
        title:"Договор за вработување",
        description:"Синтетички договор.",
        verificationStatus:"unverified",
        source:{
          id:"SRC-E1",
          title:"Синтетички договор",
          locator:"страница 1",
          version:"test-v1",
          sha256:SHA_A,
          verificationStatus:"unverified"
        },
        analysis:{
          proves:"Постоење на работен однос.",
          doesNotProve:"Не ја докажува законитоста на отказот.",
          verificationRequired:"Да се провери оригиналот."
        }
      },
      {
        id:"E-2",
        title:"Одлука за отказ",
        description:"Синтетичка отказна одлука.",
        verificationStatus:"unverified",
        source:{
          id:"SRC-E2",
          title:"Синтетичка отказна одлука",
          locator:"страница 2",
          version:"test-v1",
          sha256:SHA_B,
          verificationStatus:"unverified"
        },
        analysis:{
          proves:"Работодавачот навел причина за отказ.",
          doesNotProve:"Не докажува дека причината е фактички точна.",
          verificationRequired:"Да се проверат постапката и образложението."
        }
      },
      {
        id:"E-3",
        title:"Е-пошта од раководител",
        description:"Синтетичка е-пошта.",
        verificationStatus:"unverified",
        source:{
          id:"SRC-E3",
          title:"Синтетичка е-пошта",
          locator:"26.08.2026",
          version:"test-v1",
          sha256:SHA_C,
          verificationStatus:"unverified"
        },
        analysis:{
          proves:"Содржи индикација за дозволена работа од дома.",
          doesNotProve:"Не ја докажува автентичноста или овластувањето.",
          verificationRequired:"Да се проверат headers и целата нишка."
        }
      }
    ],
    legalBases:[
      {
        id:"LB-1",
        proposition:"Да се провери правната основа за поништување на отказ и враќање на работа.",
        status:"review_required",
        requiredForProfessional:true
      }
    ],
    arguments:[
      {
        id:"ARG-1",
        heading:"Оспорување на фактичката основа",
        text:"Отказната одлука и е-поштата содржат спротивставени податоци што мора да бидат оценети пред професионално издание.",
        status:"working",
        factIds:["F-2"],
        evidenceIds:["E-2","E-3"],
        legalBasisIds:["LB-1"]
      }
    ],
    contradictions:[
      {
        id:"CON-1",
        summary:"Одлуката наведува дека немало одобрение, а е-поштата содржи спротивна индикација.",
        left:{type:"fact",id:"F-2"},
        right:{type:"evidence",id:"E-3"},
        status:"unresolved"
      }
    ],
    petitum:[
      {id:"PET-1",text:"СЕ ПОНИШТУВА синтетичката одлука за отказ.",status:"draft"},
      {id:"PET-2",text:"СЕ ЗАДОЛЖУВА тужениот да ја врати тужителката на работа.",status:"draft"}
    ],
    attachments:[
      {id:"ATT-1",title:"Договор за вработување",evidenceId:"E-1"},
      {id:"ATT-2",title:"Одлука за отказ",evidenceId:"E-2"},
      {id:"ATT-3",title:"Е-пошта",evidenceId:"E-3"}
    ],
    blockers:[
      {id:"BL-1",kind:"deadline",summary:"Рокот мора да се провери.",mandatory:true,status:"open"},
      {id:"BL-2",kind:"jurisdiction",summary:"Надлежноста мора да се провери.",mandatory:true,status:"open"}
    ],
    humanGate:{status:"pending"}
  };
}

function professionalFixture(){
  const input=structuredClone(workingFixture());
  for(const evidence of input.evidence){
    evidence.verificationStatus="verified";
    evidence.source.verificationStatus="verified";
  }
  input.legalBases=[{
    id:"LB-1",
    proposition:"Синтетички потврдена правна основа за тестирање на PR-C.",
    status:"verified",
    requiredForProfessional:true,
    citation:"SYNTHETIC VERIFIED LEGAL BASIS",
    authority:{
      id:"LAW-SYN-1",
      title:"Синтетички верификуван правен извор",
      locator:"test locator",
      version:"test-v1",
      sha256:SHA_D,
      verificationStatus:"verified"
    }
  }];
  input.arguments[0].status="approved";
  input.contradictions[0]={
    ...input.contradictions[0],
    status:"resolved",
    resolution:{
      text:"Синтетички разрешено од адвокат за позитивен тест.",
      reviewer:"Synthetic Reviewer",
      decidedAt:"2026-10-24T18:40:00Z"
    }
  };
  for(const item of input.petitum) item.status="approved";
  for(const item of input.blockers){
    item.status="resolved";
    item.resolution="Синтетички разрешено.";
  }
  input.humanGate={
    status:"approved",
    reviewer:"Synthetic Reviewer",
    decidedAt:"2026-10-24T18:45:00Z",
    decisionRef:"HG-PRC-001"
  };
  return input;
}

function zipText(bytes){
  return new TextDecoder().decode(bytes);
}

test("PRC-01 engine uses dedicated legal DOCX profile on top of PR-B",()=>{
  assert.equal(PROFESSIONAL_DOCX_ENGINE_VERSION,"1.0.0");
  assert.equal(PROFESSIONAL_DOCX_PROFILE.page,"A4");
  assert.equal(PROFESSIONAL_DOCX_PROFILE.font,"Verdana");
  assert.equal(PROFESSIONAL_DOCX_PROFILE.fontSizeHalfPoints,20);
  const source=fs.readFileSync(new URL("../src/professional-docx-engine.js",import.meta.url),"utf8");
  assert.match(source,/legal-document-export\.js/);
  assert.doesNotMatch(source,/case-export\.js/);
});

test("PRC-02 A4 Verdana 10, margins and paragraph spacing are explicit in OpenXML",()=>{
  const out=renderProfessionalLegalDocxBundle(workingFixture(),{
    subject:"Поништување отказ и враќање на работа"
  });
  const text=zipText(out.courtDocument);
  assert.match(text,/w:pgSz w:w="11906" w:h="16838"/);
  assert.match(text,/w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"/);
  assert.match(text,/w:rFonts w:ascii="Verdana" w:hAnsi="Verdana"/);
  assert.match(text,/w:sz w:val="20"/);
  assert.match(text,/w:spacing w:after="120" w:line="276" w:lineRule="auto"/);
});

test("PRC-03 native Word Roman and Arabic numbering is packaged and referenced",()=>{
  const out=renderProfessionalLegalDocxBundle(workingFixture());
  const text=zipText(out.courtDocument);
  assert.match(text,/word\/numbering\.xml/);
  assert.match(text,/w:numFmt w:val="upperRoman"/);
  assert.match(text,/w:numFmt w:val="decimal"/);
  for(const id of [1,2,3,4,5,6]){
    assert.match(text,new RegExp('w:numId="'+id+'"'));
  }
  assert.ok((text.match(/<w:numPr>/g)||[]).length>=10);
});

test("PRC-04 court structure contains court, parties, subject, facts, law, evidence, petitum, attachments and signature",()=>{
  const out=renderProfessionalLegalDocxBundle(workingFixture(),{
    subject:"Поништување на отказ и враќање на работа",
    place:"Скопје",
    date:"24.10.2026",
    signature:"[ПОТПИС НА АДВОКАТ]"
  });
  const text=zipText(out.courtDocument);
  for(const token of [
    "ОСНОВЕН ГРАЃАНСКИ СУД",
    "ТУЖИТЕЛ",
    "ТУЖЕН",
    "ПРЕДМЕТ",
    "Т У Ж Б А",
    "ФАКТИЧКА СОСТОЈБА",
    "ПРАВНА ОСНОВА",
    "ДОКАЗНИ ПРЕДЛОЗИ",
    "ТУЖБЕНО БАРАЊЕ",
    "ПРИЛОЗИ",
    "Скопје",
    "24.10.2026",
    "[ПОТПИС НА АДВОКАТ]"
  ]) assert.match(text,new RegExp(escapeRegex(token)));
});

test("PRC-05 keepNext, keepLines and cantSplit controls are present",()=>{
  const text=zipText(renderProfessionalLegalDocxBundle(workingFixture()).courtDocument);
  assert.match(text,/<w:keepNext\/>/);
  assert.match(text,/<w:keepLines\/>/);
  assert.match(text,/<w:cantSplit\/>/);
});

test("PRC-06 placeholders and Macedonian Cyrillic survive the DOCX package",()=>{
  const input=workingFixture();
  input.court="";
  input.parties=[];
  const text=zipText(renderProfessionalLegalDocxBundle(input,{
    subject:"",
    place:"[МЕСТО]",
    date:"[ДАТУМ]",
    signature:"[ПОТПИС]"
  }).courtDocument);
  assert.match(text,/\[НАДЛЕЖЕН СУД\]/);
  assert.match(text,/\[ИМЕ И АДРЕСА\]/);
  assert.match(text,/\[НАЗИВ И СЕДИШТЕ\]/);
  assert.match(text,/\[ПРЕДМЕТ\]/);
  assert.match(text,/\[МЕСТО\]/);
  assert.match(text,/\[ДАТУМ\]/);
  assert.match(text,/\[ПОТПИС\]/);
  assert.match(text,/Тужениот донел одлука за отказ/);
});

test("PRC-07 working court DOCX has warning but leaks no Review/Human Gate/source metadata in any package part",()=>{
  const out=renderProfessionalLegalDocxBundle(workingFixture());
  const text=zipText(out.courtDocument);
  assert.match(text,/РАБОТЕН НАЦРТ — НЕ Е ЗА ПОДНЕСУВАЊЕ/);
  assert.doesNotMatch(text,/INTERNAL REVIEW ANNEX|Human Gate|Reviewer:|Decision reference:|Decision time:/i);
  assert.doesNotMatch(text,/SRC-E[123]|LAW-SYN|Source manifest|Provenance appendix|PROFESSIONAL blockers/);
  assert.doesNotMatch(text,/CASE-PRC-001|PLEADING-PRC-001/);
  assert.doesNotMatch(text,/word\/comments\.xml|customXml/i);
});

test("PRC-08 court document properties and footer are generic and contain no internal review data",()=>{
  const out=renderProfessionalLegalDocxBundle(professionalFixture(),{mode:"professional"});
  const text=zipText(out.courtDocument);
  assert.match(text,/AI Advokat 4 Professional Legal Document/);
  assert.match(text,/word\/footer1\.xml/);
  assert.match(text,/Страница/);
  assert.match(text,/ PAGE /);
  assert.doesNotMatch(text,/Synthetic Reviewer|HG-PRC-001|INTERNAL REVIEW ANNEX/);
});

test("PRC-09 Review Annex remains a separate internal document and retains review metadata",()=>{
  const out=renderProfessionalLegalDocxBundle(professionalFixture(),{mode:"professional"});
  const court=zipText(out.courtDocument);
  const review=zipText(out.reviewAnnex);
  assert.doesNotMatch(court,/INTERNAL REVIEW ANNEX/);
  assert.match(review,/INTERNAL REVIEW ANNEX — NOT FOR FILING/);
  assert.match(review,/Human Gate/);
  assert.match(review,/Synthetic Reviewer/);
  assert.match(review,/HG-PRC-001/);
  assert.match(review,/PROFESSIONAL blockers/);
});

test("PRC-10 PROFESSIONAL remains fail-closed when PR-B Human Gate or blockers are unresolved",()=>{
  const input=professionalFixture();
  assert.throws(
    ()=>renderProfessionalLegalDocxBundle(input,{
      mode:"professional",
      serverHumanGate:{status:"pending"}
    }),
    /legal_document_professional_blocked/
  );

  const open=professionalFixture();
  open.blockers[0].status="open";
  delete open.blockers[0].resolution;
  assert.throws(
    ()=>renderProfessionalLegalDocxBundle(open,{mode:"professional"}),
    /legal_document_professional_blocked/
  );
});

test("PRC-11 PROFESSIONAL succeeds only after PR-B readiness and removes WORKING warning",()=>{
  const out=renderProfessionalLegalDocxBundle(professionalFixture(),{
    mode:"professional",
    subject:"Поништување на отказ и враќање на работа",
    place:"Скопје",
    date:"24.10.2026",
    signature:"Адвокат — синтетички тест"
  });
  assert.equal(out.mode,"professional");
  assert.equal(out.readiness.professionalReady,true);
  const text=zipText(out.courtDocument);
  assert.doesNotMatch(text,/РАБОТЕН НАЦРТ/);
  assert.match(text,/СЕ ПОНИШТУВА/);
  assert.match(text,/СЕ ЗАДОЛЖУВА/);
});

test("PRC-12 existing default CasePilot DOCX contract remains unchanged and governance-rich",()=>{
  assert.equal(CASE_EXPORT_VERSION,"1.0.0");
  const report=normalizeCaseExportReport({
    caseId:"CASE-CP-CONTROL",
    title:"CasePilot control export",
    caseVersion:"1.0",
    generatedAt:"2026-10-24T18:50:00Z",
    sections:[{
      id:"s1",
      title:"Контролна секција",
      items:[{heading:"Тест",text:"CasePilot default content",status:"WORKING",sources:[]}]
    }],
    sourceManifest:[],
    provenance:[],
    humanGate:{status:"pending"}
  },{mode:"working"});
  const text=zipText(renderCaseExportDocxBytes(report));
  assert.match(text,/WORKING COPY — HUMAN GATE PENDING/);
  assert.match(text,/Source manifest/);
  assert.match(text,/Human Gate/);
  assert.match(text,/Provenance appendix/);
  assert.doesNotMatch(text,/LegalTitle|LegalSection|professional-docx-engine/);
});

test("PRC-13 numbering restarts use distinct native numIds for facts, law, evidence, petitum and attachments",()=>{
  const text=zipText(renderProfessionalLegalDocxBundle(workingFixture()).courtDocument);
  for(const id of [2,3,4,5,6]){
    assert.match(text,new RegExp('<w:num w:numId="'+id+'"><w:abstractNumId w:val="1"'));
  }
  const uses=[2,3,4,5,6].map(id=>(text.match(new RegExp('<w:numId w:val="'+id+'"/>','g'))||[]).length);
  assert.ok(uses.every(count=>count>=1));
});

test("PRC-14 complete synthetic document preserves multiple paragraphs without provider or database dependencies",()=>{
  const input=workingFixture();
  for(let i=3;i<=18;i++){
    input.facts.push({
      id:"F-"+i,
      text:"Синтетички дополнителен факт број "+i+" со македонска кирилица.",
      status:"supported",
      requiredForProfessional:false,
      evidenceIds:["E-1"]
    });
  }
  const out=renderProfessionalLegalDocxBundle(input,{subject:"Долг синтетички предмет"});
  const text=zipText(out.courtDocument);
  assert.equal((text.match(/Синтетички дополнителен факт број/g)||[]).length,16);
  assert.ok(out.courtDocument.length>5000);
});

test("PRC-15 engine source is provider-free, migration-free, network-free and action-free",()=>{
  const source=fs.readFileSync(new URL("../src/professional-docx-engine.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/api\.openai\.com|OPENAI_API_KEY|\/v1\/responses|wrangler\s+deploy|wrangler\s+secret/i);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/CREATE\s+TABLE|ALTER\s+TABLE|INSERT\s+INTO|UPDATE\s+\w+\s+SET/i);
  assert.doesNotMatch(source,/submitToCourt|fileToCourt|electronicFiling|sendEmail|signDocument|digitalSignature/i);
});

test("PRC-16 DOCX package contains professional OpenXML parts and no comments/custom XML",()=>{
  const text=zipText(renderProfessionalLegalDocxBundle(workingFixture()).courtDocument);
  for(const part of [
    "[Content_Types].xml",
    "word/document.xml",
    "word/styles.xml",
    "word/numbering.xml",
    "word/settings.xml",
    "word/footer1.xml",
    "docProps/core.xml"
  ]) assert.match(text,new RegExp(escapeRegex(part)));
  assert.doesNotMatch(text,/word\/comments\.xml|commentsExtended|customXml|people\.xml/i);
});
