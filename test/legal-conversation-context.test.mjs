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
