import test from "node:test";
import assert from "node:assert/strict";
import {isContextDependentLegalFollowUp,buildLegalRoutingQuery} from "../src/legal-conversation-context.js";

test("contextual case prediction inherits recent user and AI working context without promoting it to fact",()=>{
  const history=[
    {role:"user",text:"Направи пример тужба за клевета со измислени имиња."},
    {role:"assistant",text:"Работен пример: тужениот јавно тврдел дека тужителот присвоил 60.000 денари; примерот е измислен."},
    {role:"user",text:"Кој член го покрива ова?"}
  ];
  const q="Направи ми предикција за овој предмет.";
  assert.equal(isContextDependentLegalFollowUp(q),true);
  const routed=buildLegalRoutingQuery(q,history);
  assert.match(routed,/60\.000 денари/);
  assert.match(routed,/PRIOR AI WORKING CONTEXT/);
  assert.match(routed,/not verified fact or legal authority/);
  assert.match(routed,/CURRENT FOLLOW-UP/);
});

test("whole-case follow-up is context dependent",()=>{
  assert.equal(isContextDependentLegalFollowUp("Направи ми анализа за целиот предмет."),true);
});

test("ordinary standalone query is not expanded with old history",()=>{
  const q="Кој е главен град на Франција?";
  assert.equal(buildLegalRoutingQuery(q,[{role:"user",text:"стар правен разговор"}]),q);
});


test("plural demonstrative follow-up preserves prior ECHR request context",()=>{
  const history=[
    {role:"user",text:"Сакам да ги добијам сите пресуди на ЕСЧП против Република Македонија."},
    {role:"assistant",text:"Достапен е официјален индекс на Бирото за застапување пред ЕСЧП."}
  ];
  const q="Токму на тие мислев, ве молам дајте ми ги тие податоци.";
  assert.equal(isContextDependentLegalFollowUp(q),true);
  const routed=buildLegalRoutingQuery(q,history);
  assert.match(routed,/ЕСЧП/);
  assert.match(routed,/Република Македонија/);
  assert.match(routed,/CURRENT FOLLOW-UP/);
});


test("R3 standalone analytical references to outcomes do not inherit unrelated history",()=>{
  const history=[
    {role:"user",text:"Во 1984 година започнала друга сосема различна правна состојба."},
    {role:"assistant",text:"Претходен работен одговор за друг предмет."}
  ];
  const q="Понуди два можни исхода, план за обезбедување докази и нацрт на клучните барања.";
  assert.equal(isContextDependentLegalFollowUp(q),false);
  assert.equal(buildLegalRoutingQuery(q,history),q);
});

test("R3 generic use of the noun предмет is not enough to import old conversation context",()=>{
  const q="Определи што зависи од видот и предметот на тужбеното барање.";
  assert.equal(isContextDependentLegalFollowUp(q),false);
});

test("R3 explicit anaphoric legal follow-ups still inherit bounded context",()=>{
  assert.equal(isContextDependentLegalFollowUp("Продолжи со анализа на овој предмет."),true);
  assert.equal(isContextDependentLegalFollowUp("Кој е исходот?"),true);
});
