import test from "node:test";
import assert from "node:assert/strict";
import {requestedFormalDraftHeading,finaliseFormalLegalDraft} from "../src/response-quality.js";
import {caseDraftAct,caseDraftExportContent} from "../src/case-draft-act.js";
import {normalizeCaseExportReport,caseExportBlocks,renderCaseExportDocxBytes} from "../src/case-export.js";

test("shared classifier distinguishes response and appeal and honors explicit case type",()=>{
  assert.equal(requestedFormalDraftHeading("Подготви работен одговор на жалба. Разграничи ги фактите."),"ОДГОВОР НА ЖАЛБА");
  assert.equal(requestedFormalDraftHeading("Подготви жалба против решението."),"ЖАЛБА");
  assert.equal(requestedFormalDraftHeading("Опиши ја тужбата и жалбата.",{draftType:"response"}),"ОДГОВОР НА ЖАЛБА");
  assert.equal(requestedFormalDraftHeading("Подготви одговор на жалба.",{draftType:"appeal"}),"ЖАЛБА");
});

for(const type of ["response","appeal"]){
  test(type+" shares exact body and canonical title in DOCX and PDF block model",()=>{
    const act=caseDraftAct(type);
    const body=act.heading+"\n\nЖалителот тврди уплата од 12.000 денари. Нема приложена потврда. Прашањето останува отворено.";
    const final=finaliseFormalLegalDraft(body,{draftType:type,userText:"Подготви работен поднесок."});
    assert.equal(final,body);
    const model=normalizeCaseExportReport({caseId:"CASE-SYNTHETIC",generatedAt:"2026-11-25T00:00:00Z",...caseDraftExportContent(type,final)});
    const blocks=caseExportBlocks(model);
    assert.equal(blocks[0].text,act.title);
    assert.ok(blocks.some(block=>block.kind==="body" && block.text===body));
    const docx=new TextDecoder().decode(renderCaseExportDocxBytes(model));
    assert.ok(docx.includes(act.title));
    assert.ok(docx.includes(act.heading));
    assert.ok(docx.includes("12.000 денари"));
    assert.ok(docx.includes("Нема приложена потврда."));
    assert.throws(()=>caseDraftExportContent(type,caseDraftAct(type==="response"?"appeal":"response").heading+"\n\n"+body),/case_draft_instrument_mismatch/);
  });
}
