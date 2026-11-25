import test from "node:test";
import assert from "node:assert/strict";
import {caseDraftAct,isDirectAppealResponseRequest,checkCaseDraftAct,caseDraftExportContent} from "../src/case-draft-act.js";

const response=caseDraftAct("response"), appeal=caseDraftAct("appeal");
const body="Жалителот тврди уплата од 12.000 денари. Нема приложена потврда; прашањето останува отворено.";
const text=(act)=>act.heading+"\n\n"+body;

test("response and appeal are distinct selected acts",()=>{
  assert.notEqual(response.heading,appeal.heading);
  assert.notEqual(response.title,appeal.title);
  assert.equal(caseDraftAct("lawsuit"),null);
  assert.equal(caseDraftAct("__proto__"),null);
});
test("explicit response request outranks the appeal keyword",()=>{
  for(const q of ["Подготви работен "+response.title+". Разграничи ги фактите.",response.title,"podgotvi mi raboten odgovor na zalba"]){
    assert.equal(isDirectAppealResponseRequest(q),true,q);
  }
});
test("an appeal or analytical mention is not a direct response request",()=>{
  assert.equal(isDirectAppealResponseRequest("Подготви жалба против решението."),false);
  assert.equal(isDirectAppealResponseRequest("Анализирај "+response.title),false);
});
for(const [type,act,other] of [["response",response,appeal],["appeal",appeal,response]]){
  test(type+" preserves the exact body and selected title",()=>{
    const saved=text(act), out=caseDraftExportContent(type,saved);
    assert.equal(out.title,act.title);
    assert.equal(out.sections[0].items[0].text,saved);
    assert.equal(checkCaseDraftAct(saved,type).text,saved);
  });
  test(type+" rejects the opposing title, without relabeling",()=>{
    const wrong=text(other), verdict=checkCaseDraftAct(wrong,type,{addMissing:true});
    assert.equal(verdict.ok,false);
    assert.equal(verdict.error,"case_draft_instrument_mismatch");
    assert.equal(verdict.text,wrong);
    assert.throws(()=>caseDraftExportContent(type,wrong),/case_draft_instrument_mismatch/);
  });
  test(type+" adds a missing heading at generation only",()=>{
    assert.equal(checkCaseDraftAct(body,type,{addMissing:true}).text,text(act));
    assert.equal(checkCaseDraftAct(body,type).error,"case_draft_instrument_heading_required");
    assert.throws(()=>caseDraftExportContent(type,body),/case_draft_instrument_heading_required/);
    assert.equal(checkCaseDraftAct("",type,{addMissing:true}).ok,false);
  });
  test(type+" recognises an existing heading after banner, with Markdown and CRLF",()=>{
    for(const heading of [act.title,"**"+act.heading+"**","## "+act.heading+":"]){
      const saved="WORKING DRAFT - HUMAN GATE REQUIRED\r\n\r\n"+heading+"\r\n\r\n"+body;
      assert.equal(checkCaseDraftAct(saved,type,{addMissing:true}).text,saved);
    }
  });
  test(type+" rejects contradictory double headings and extended uppercase title",()=>{
    assert.equal(checkCaseDraftAct(act.heading+"\n\n"+other.heading+"\n\n"+body,type).ok,false);
    assert.equal(checkCaseDraftAct(other.heading+" ПРОТИВ РЕШЕНИЕ\n\n"+body,type,{addMissing:true}).ok,false);
  });
}
test("ordinary narrative reference and unselected legacy acts are preserved",()=>{
  const saved=response.heading+"\n\nЖалба против решението е поднесена.";
  assert.equal(checkCaseDraftAct(saved,"response").text,saved);
  assert.equal(checkCaseDraftAct(body,"lawsuit").text,body);
});
