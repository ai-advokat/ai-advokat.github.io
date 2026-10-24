import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  LEGAL_DOCUMENT_AST_VERSION,
  normalizeLegalDocumentAst,
  legalDocumentReadiness,
  legalDocumentExportBundle,
  renderLegalDocumentDocxBundle,
  legalDocumentVisualControl
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

function workingFixture(){
  return {
    version:LEGAL_DOCUMENT_AST_VERSION,
    caseId:"CASE-LDE-001",
    documentId:"PLEADING-001",
    caseVersion:"0.1",
    generatedAt:"2026-10-24T17:00:00Z",
    documentType:"employment_claim",
    title:"ТУЖБА — синтетички WORKING DRAFT",
    court:"Основен граѓански суд — синтетички тест",
    summary:"Синтетички предмет за тестирање на структурирано правно документирање.",
    parties:[
      {id:"P-1",role:"Тужител",name:"Ана Тестовска",identifier:"СИНТЕТИЧКИ-ПОДАТОК"},
      {id:"P-2",role:"Тужен",name:"Тест Работодавач ДОО",identifier:"СИНТЕТИЧКИ-ПОДАТОК"}
    ],
    facts:[
      {
        id:"F-1",
        text:"Работниот однос започнал на синтетичкиот датум 01.02.2024.",
        status:"supported",
        evidenceIds:["E-1"]
      },
      {
        id:"F-2",
        text:"Работодавачот тврди дека отсуството било без одобрение.",
        status:"disputed",
        evidenceIds:["E-2","E-3"]
      }
    ],
    evidence:[
      {
        id:"E-1",
        title:"Синтетички договор за вработување",
        description:"Тест-документ без реални лични податоци.",
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
          proves:"Постоење на синтетички работен однос.",
          doesNotProve:"Не ја докажува законитоста или незаконитоста на отказот.",
          verificationRequired:"Да се провери автентичноста и целосноста пред професионална употреба."
        }
      },
      {
        id:"E-2",
        title:"Синтетичка отказна одлука",
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
          proves:"Работодавачот навел дека немало одобрение за отсуство.",
          doesNotProve:"Не докажува сама по себе дека такво одобрение навистина не постоело.",
          verificationRequired:"Да се проверат целата постапка и сите релевантни документи."
        }
      },
      {
        id:"E-3",
        title:"Синтетичка е-пошта од раководител",
        verificationStatus:"unverified",
        source:{
          id:"SRC-E3",
          title:"Синтетичка е-пошта",
          locator:"порака од 26.08.2026",
          version:"test-v1",
          sha256:SHA_C,
          verificationStatus:"unverified"
        },
        analysis:{
          proves:"Содржи текст што може да укажува на дозволена работа од дома.",
          doesNotProve:"Не докажува автентичност, целосност на нишката или овластување на испраќачот.",
          verificationRequired:"Да се проверат headers, целата нишка и овластувањето на испраќачот."
        }
      }
    ],
    legalBases:[
      {
        id:"LB-1",
        proposition:"Да се провери релевантната правна основа за оспорување на отказ и враќање на работа.",
        status:"review_required",
        requiredForProfessional:true
      }
    ],
    arguments:[
      {
        id:"ARG-1",
        heading:"Фактичка и правна теза",
        text:"Постои материјална противречност меѓу образложението на отказот и содржината на синтетичката е-пошта. Таа противречност мора да се разреши пред професионално издание.",
        status:"working",
        factIds:["F-2"],
        evidenceIds:["E-2","E-3"],
        legalBasisIds:["LB-1"]
      }
    ],
    contradictions:[
      {
        id:"CON-1",
        summary:"Отказната одлука наведува дека немало одобрение, а е-поштата содржи текст што може да укажува на одобрение.",
        left:{type:"fact",id:"F-2"},
        right:{type:"evidence",id:"E-3"},
        status:"unresolved"
      }
    ],
    petitum:[
      {
        id:"PET-1",
        text:"Да се поништи синтетичката отказна одлука, доколку по правната проверка се утврдат законските и процесните претпоставки.",
        status:"draft"
      },
      {
        id:"PET-2",
        text:"Да се наложи враќање на работа во формулација што ќе биде одобрена од адвокат по проверката.",
        status:"draft"
      }
    ],
    attachments:[
      {id:"ATT-1",title:"Синтетички договор",evidenceId:"E-1"},
      {id:"ATT-2",title:"Синтетичка отказна одлука",evidenceId:"E-2"},
      {id:"ATT-3",title:"Синтетичка е-пошта",evidenceId:"E-3"}
    ],
    blockers:[
      {
        id:"BL-1",
        kind:"deadline",
        summary:"Рокот за поднесување мора да се провери од важечки официјален извор.",
        mandatory:true,
        status:"open"
      },
      {
        id:"BL-2",
        kind:"jurisdiction",
        summary:"Надлежноста мора да биде професионално проверена.",
        mandatory:true,
        status:"open"
      }
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
    proposition:"Синтетички потврдена правна теза за тестирање на export gate.",
    status:"verified",
    requiredForProfessional:true,
    citation:"SYNTHETIC VERIFIED AUTHORITY REF",
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
      text:"Адвокатот ја евидентирал противречноста и одобрил конкретна работна теза за синтетичкиот тест.",
      reviewer:"Synthetic Reviewer",
      decidedAt:"2026-10-24T17:20:00Z"
    }
  };
  for(const item of input.petitum) item.status="approved";
  for(const item of input.blockers){
    item.status="resolved";
    item.resolution="Синтетички разрешено за позитивниот тест."
  }
  input.humanGate={
    status:"approved",
    reviewer:"Synthetic Reviewer",
    decidedAt:"2026-10-24T17:30:00Z",
    decisionRef:"HG-SYN-001"
  };
  return input;
}

test("LDE-01 normalizes structured Legal Document AST and preserves required collections",()=>{
  const ast=normalizeLegalDocumentAst(workingFixture());
  assert.equal(ast.version,LEGAL_DOCUMENT_AST_VERSION);
  assert.equal(ast.facts.length,2);
  assert.equal(ast.evidence.length,3);
  assert.equal(ast.legalBases.length,1);
  assert.equal(ast.petitum.length,2);
  assert.equal(ast.attachments.length,3);
});

test("LDE-02 working export separates court document from internal Review Annex",()=>{
  const bundle=legalDocumentExportBundle(workingFixture(),{mode:"working"});
  assert.equal(bundle.courtReport.mode,"working");
  assert.equal(bundle.reviewAnnexReport.mode,"working");
  assert.ok(bundle.courtReport.sections.some(s=>s.id==="petitum"));
  assert.ok(!bundle.courtReport.sections.some(s=>s.id==="professional-blockers"));
  assert.ok(bundle.reviewAnnexReport.sections.some(s=>s.id==="professional-blockers"));
  assert.ok(bundle.reviewAnnexReport.title.includes("INTERNAL REVIEW ANNEX"));
});

test("LDE-03 unresolved contradiction remains formal and blocks professional export",()=>{
  const ast=normalizeLegalDocumentAst(workingFixture());
  assert.equal(ast.contradictions[0].status,"unresolved");
  const ready=legalDocumentReadiness(ast);
  assert.equal(ready.professionalReady,false);
  assert.ok(ready.blockers.some(x=>x.code==="unresolved_contradiction"&&x.objectId==="CON-1"));
  assert.throws(()=>legalDocumentExportBundle(ast,{mode:"professional"}),/legal_document_professional_blocked/);
});

test("LDE-04 Human Gate approval alone cannot bypass unresolved mandatory blockers",()=>{
  const input=workingFixture();
  input.humanGate={
    status:"approved",
    reviewer:"Synthetic Reviewer",
    decidedAt:"2026-10-24T17:30:00Z",
    decisionRef:"HG-SYN-SPOOF"
  };
  const ready=legalDocumentReadiness(input);
  assert.equal(ready.humanGate.status,"approved");
  assert.equal(ready.professionalReady,false);
  assert.ok(ready.blockers.some(x=>x.code==="mandatory_blocker_open"));
  assert.ok(ready.blockers.some(x=>x.code==="legal_basis_not_verified"));
});

test("LDE-05 PROFESSIONAL succeeds only after Human Gate and mandatory blockers are resolved",()=>{
  const bundle=legalDocumentExportBundle(professionalFixture(),{mode:"professional"});
  assert.equal(bundle.readiness.professionalReady,true);
  assert.equal(bundle.readiness.blockers.length,0);
  assert.equal(bundle.courtReport.mode,"professional");
  assert.equal(bundle.courtReport.humanGate.status,"approved");
});

test("LDE-06 unverified legal authority or citation cannot be promoted into the AST",()=>{
  const input=workingFixture();
  input.legalBases[0].citation="Член 999";
  input.legalBases[0].authority={
    id:"LAW-X",
    title:"Непроверен извор",
    locator:"x",
    verificationStatus:"unverified"
  };
  assert.throws(()=>normalizeLegalDocumentAst(input),/legal_document_unverified_authority_not_allowed/);
});

test("LDE-07 graph integrity fails closed on unknown evidence/fact references",()=>{
  const unknownEvidence=workingFixture();
  unknownEvidence.facts[0].evidenceIds=["E-MISSING"];
  assert.throws(()=>normalizeLegalDocumentAst(unknownEvidence),/fact_evidence_not_found/);

  const unknownContradiction=workingFixture();
  unknownContradiction.contradictions[0].left={type:"fact",id:"F-MISSING"};
  assert.throws(()=>normalizeLegalDocumentAst(unknownContradiction),/contradiction_ref_not_found/);
});

test("LDE-08 Review Annex states what evidence proves, does not prove, and still requires",()=>{
  const bundle=legalDocumentExportBundle(workingFixture());
  const section=bundle.reviewAnnexReport.sections.find(s=>s.id==="evidence-analysis");
  const email=section.items.find(x=>x.heading.includes("E-3"));
  assert.match(email.text,/Што поткрепува:/);
  assert.match(email.text,/Што не докажува:/);
  assert.match(email.text,/Што мора да се провери:/);
  assert.match(email.text,/headers/);
});

test("LDE-09 unverified legal propositions are not emitted as authoritative court citations",()=>{
  const bundle=legalDocumentExportBundle(workingFixture(),{mode:"working"});
  const legal=bundle.courtReport.sections.find(s=>s.id==="legal-bases");
  const text=legal.items.map(x=>x.text+" "+x.heading).join("\n");
  assert.doesNotMatch(text,/Член\s+\d+|чл\.\s*\d+/i);
  assert.match(text,/Нема потврдена правна основа/);
  const review=bundle.reviewAnnexReport.sections.find(s=>s.id==="legal-basis-review");
  assert.match(review.items[0].text,/Нема дозвола за авторитативно цитирање/);
});

test("LDE-10 DOCX structural audit preserves Cyrillic, warnings, and court/review separation",()=>{
  const out=renderLegalDocumentDocxBundle(workingFixture(),{mode:"working"});
  for(const bytes of [out.courtDocument,out.reviewAnnex]){
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes[0],0x50);
    assert.equal(bytes[1],0x4b);
    const text=new TextDecoder().decode(bytes);
    assert.match(text,/\[Content_Types\]\.xml/);
    assert.match(text,/word\/document\.xml/);
    assert.match(text,/word\/styles\.xml/);
    assert.match(text,/WORKING COPY — HUMAN GATE PENDING/);
  }
  const courtText=new TextDecoder().decode(out.courtDocument);
  const reviewText=new TextDecoder().decode(out.reviewAnnex);
  assert.match(courtText,/Фактичка основа/);
  assert.match(courtText,/Тужбено барање/);
  assert.doesNotMatch(courtText,/INTERNAL REVIEW ANNEX/);
  assert.match(reviewText,/INTERNAL REVIEW ANNEX/);
  assert.match(reviewText,/Противречности/);
});

test("LDE-11 semantic visual-control contract keeps warning first and annex separate",()=>{
  const visual=legalDocumentVisualControl(workingFixture());
  assert.deepEqual(visual,{
    warningFirst:true,
    courtHasFacts:true,
    courtHasPetitum:true,
    courtHasAttachments:true,
    courtContainsInternalReviewAnnex:false,
    reviewContainsInternalReviewAnnex:true,
    reviewHasContradictions:true,
    reviewHasBlockers:true
  });
});

test("LDE-12 existing CasePilot export contract remains executable and unchanged in version",()=>{
  assert.equal(CASE_EXPORT_VERSION,"1.0.0");
  const legacy=normalizeCaseExportReport({
    caseId:"CASE-LEGACY",
    title:"Постоечки CasePilot export contract",
    caseVersion:"1.0",
    generatedAt:"2026-10-24T17:00:00Z",
    sections:[{id:"s1",title:"Секција",items:[{text:"Тест",status:"WORKING",sources:[]}]}],
    sourceManifest:[],
    provenance:[],
    humanGate:{status:"pending"}
  },{mode:"working"});
  const bytes=renderCaseExportDocxBytes(legacy);
  assert.equal(legacy.exportVersion,"1.0.0");
  assert.ok(bytes.length>500);
});

test("LDE-13 server-supplied Human Gate overrides AST gate and cannot be spoofed by payload",()=>{
  const input=professionalFixture();
  const serverGate={status:"pending"};
  const ready=legalDocumentReadiness(input,{serverHumanGate:serverGate});
  assert.equal(ready.professionalReady,false);
  assert.equal(ready.humanGate.status,"pending");
  assert.ok(ready.blockers.some(x=>x.code==="human_gate_not_approved"));
  assert.throws(
    ()=>legalDocumentExportBundle(input,{mode:"professional",serverHumanGate:serverGate}),
    /legal_document_professional_blocked/
  );
});

test("LDE-14 PR-B module is provider-free, migration-free, and has no external transmission path",()=>{
  const source=fs.readFileSync(new URL("../src/legal-document-export.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/api\.openai\.com|OPENAI_API_KEY|\/v1\/responses|wrangler\s+deploy|wrangler\s+secret/i);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/CREATE\s+TABLE|ALTER\s+TABLE|INSERT\s+INTO|UPDATE\s+\w+\s+SET/i);
});

test("LDE-15 synthetic professional fixture never becomes a filing/signature/transmission action",()=>{
  const source=fs.readFileSync(new URL("../src/legal-document-export.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/submitToCourt|fileToCourt|electronicFiling|sendEmail|signDocument|digitalSignature/i);
  const bundle=legalDocumentExportBundle(professionalFixture(),{mode:"professional"});
  assert.equal(bundle.mode,"professional");
  assert.ok(bundle.courtReport);
  assert.ok(bundle.reviewAnnexReport);
});
