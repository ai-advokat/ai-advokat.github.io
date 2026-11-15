import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  CASE_EXPORT_FORMATS,
  normalizeCaseExportReport,
  caseExportMime,
  renderCaseExportCsv,
  renderCaseExportJson,
  renderCaseExportMarkdown,
  renderCaseExportDocxBytes
} from "../src/case-export.js";
import {
  CASE_WORKSPACE_ALLOWED_MIME_TYPES,
  validateCaseDocumentUploadMetadata
} from "../src/case-workspace.js";

const src=(path)=>readFileSync(path,"utf8");
const base={
  caseId:"CASE-SYNTHETIC-ONLY",
  caseVersion:"working-1",
  title:"Синтетички тест — адвокатска белешка",
  summary:"=2+2\nПроверка на изворите и претпоставките.",
  sections:[{id:"test",title:"Тест",items:[{
    heading:"+SUM(2,3)",text:"@COMMAND\nПроверете важечка верзија без измислен член.",
    status:"UNVERIFIED",sources:[]
  }]}],
  humanGate:{status:"pending"}
};
const rpt=normalizeCaseExportReport(base,{mode:"working"});

test("six requested output types are real and DOC maps to modern DOCX",()=>{
  for(const fmt of ["pdf","json","md","docx","csv","jpg"]){
    assert.ok(CASE_EXPORT_FORMATS.includes(fmt),fmt);
    assert.ok(caseExportMime(fmt).length>4);
  }
  assert.ok(src("assets/ai-advokat-chat.js").includes('formats.push("docx")'));
  assert.ok(src("assets/ai-advokat-chat.js").includes("requestedExports.slice(0,8)"));
  assert.match(src("assets/standalone-bot.js"),/function requestedExternalExportFormats/);
  assert.match(src("assets/standalone-bot.js"),/renderRequestedExportActions\(article,outboundQ\)/);
  assert.match(src("assets/standalone-bot.js"),/casepilot-export\.js/);
  const external=src("bot/index.html");
  for(const fmt of ["docx","pdf","json","md","csv","jpg"])
    assert.ok(external.includes('data-export="'+fmt+'"'),fmt);
  const internal=src("index.html");
  for(const fmt of ["docx","pdf","json","md","csv","jpg"])
    assert.ok(internal.includes('data-chat-export="'+fmt+'"'),fmt);
});

test("CSV formula injection is neutralised while JSON/MD/DOCX preserve the source",()=>{
  const csv=renderCaseExportCsv(rpt);
  assert.match(csv,/"'=2\+2/);
  assert.match(csv,/"'\+SUM\(2,3\)"/);
  assert.match(csv,/"'@COMMAND/);
  assert.doesNotMatch(csv,/"=2\+2/);
  assert.doesNotMatch(csv,/"\+SUM\(2,3\)"/);
  assert.equal(JSON.parse(renderCaseExportJson(rpt)).summary,base.summary);
  assert.ok(renderCaseExportMarkdown(rpt).includes(base.summary));
  const docx=renderCaseExportDocxBytes(rpt);
  assert.equal(docx[0],0x50);assert.equal(docx[1],0x4b);
  assert.ok(new TextDecoder().decode(docx).includes("+SUM(2,3)"));
});

test("user files are secured: text formats only in authenticated Case workspace",()=>{
  for(const [name,mime] of [
    ["document.json","application/json"],["legal-notes.md","text/markdown"],
    ["rows.csv","text/csv"],["source.txt","text/plain"],
    ["letter.doc","application/msword"],["letter.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["photo.jpg","image/jpeg"],["report.pdf","application/pdf"]
  ]){
    assert.ok(CASE_WORKSPACE_ALLOWED_MIME_TYPES.includes(mime),mime);
    assert.equal(validateCaseDocumentUploadMetadata({name,mimeType:mime}).ok,true,name);
  }
  assert.equal(validateCaseDocumentUploadMetadata({name:"malicious.html",mimeType:"text/plain"}).ok,false);
  assert.equal(validateCaseDocumentUploadMetadata({name:"fake.jpg",mimeType:"application/pdf"}).ok,false);
  assert.doesNotMatch(src("assets/ai-advokat-chat.js"),/publicChatAllowsUserFiles=true/);
  assert.match(src("assets/ai-advokat-chat.js"),/openSecureAttachmentWorkspace/);
  assert.match(src("assets/standalone-bot.js"),/attachments:\[\]/);
  assert.match(src("casepilot-workspace.html"),/\.json,\.md,\.csv,\.txt/);
});

test("PDF and image exports reject clipping rather than pretending to be complete",()=>{
  const exporter=src("assets/casepilot-export.js");
  assert.match(exporter,/case_export_image_too_long_use_pdf/);
  assert.match(exporter,/Long URLs, identifiers or base64-like runs must wrap/);
  assert.match(src("assets/standalone-bot.js"),/JPG слика изберете PDF/);
});

test("translator distinguishes daily Neuron exhaustion, temporary capacity and rate limit",()=>{
  const root=src("index.html");
  assert.match(root,/function classifiedUiTranslationFailure/);
  for(const code of ["daily_quota","provider_capacity","rate_limit","network"])
    assert.ok(root.includes('translationFailureCode="'+code+'"')||root.includes('code:"'+code+'"'),code);
  assert.match(root,/UI_TRANSLATION_INITIAL_MAX_BATCHES=6/);
  assert.match(src("src/index.js"),/UI_TRANSLATION_ENABLE_PAID_FALLBACK/);
  assert.match(root,/translationFailureMessage/);
});
