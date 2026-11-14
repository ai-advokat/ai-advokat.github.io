import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PROACTIVE_CONVERSATION_VERSION,suggestLegalNextTurns} from "../assets/ai-advokat-proactive.mjs";

test("R22 deterministic proactivity asks a topical clarification and offers three explicit next turns",()=>{
  assert.equal(PROACTIVE_CONVERSATION_VERSION,"AI_ADVOCAT_PROACTIVE_CONVERSATION_R22");
  const examples=[
    ["Што значи жалба против решение во постапка?","procedural"],
    ["Имам прашање за отказ од работен однос.","employment"],
    ["Како да составам тужба за измислени факти?","formal"],
    ["Ми треба проверка на договор и клаузули.","contract"],
    ["Што е полномошно?","general"]
  ];
  for(const [question,category] of examples){
    const next=suggestLegalNextTurns({question,answer:"Ова е примерен AI одговор за работна употреба и човечка проверка."});
    assert.equal(next.category,category);
    assert.ok(next.question.length>20);
    assert.equal(next.options.length,3);
    assert.ok(next.options.every(x=>x.prompt.length>35&&x.label.length>4));
    assert.equal(next.requiresUserClick,true);
    assert.equal(next.sendsAutomatically,false);
    assert.equal(next.humanReviewRequired,true);
  }
});

test("R22 follow-ups never echo confidential user facts, model output or identifiers",()=>{
  const sensitive="ЕМБГ 0101999450012; приватна адреса Пример 11, +389 70123456";
  const answer="Ова е правен одговор што треба дополнително да се провери кај надлежно лице.";
  const next=suggestLegalNextTurns({question:"Прашање за договор "+sensitive,answer,language:"mk"});
  const rendered=JSON.stringify(next);
  assert.doesNotMatch(rendered,/0101999450012|70123456|Пример 11/);
  assert.ok(!rendered.includes(answer));
  assert.equal(next.language,"mk");
});

test("R22 does not show misleading proactive actions on failed or blocked provider replies",()=>{
  for(const answer of ["","Нет","AI одговор не е издаден. Сервисот е недостапен.","No AI answer was issued."]){
    assert.equal(suggestLegalNextTurns({question:"Како?",answer}),null);
  }
});

test("R22 uses English-safe suggestions for non-Macedonian interface languages",()=>{
  const a=suggestLegalNextTurns({question:"A question about an appeal deadline",answer:"This is a working answer requiring verification.",language:"en"});
  const b=suggestLegalNextTurns({question:"A question about an appeal deadline",answer:"This is a working answer requiring verification.",language:"sq"});
  assert.equal(a.language,"en");
  assert.equal(b.language,"en");
  assert.equal(a.category,"procedural");
  assert.match(a.options[0].prompt,/Ask up to three questions/);
});

test("R22 both UIs only render suggestions after an actual API success and never auto-submit them",()=>{
  const internal=readFileSync("assets/ai-advokat-chat.js","utf8");
  const external=readFileSync("assets/standalone-bot.js","utf8");
  const pages=readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
  const probe=readFileSync("scripts/dual-chat-browser-candidate-regression.mjs","utf8");
  assert.match(internal,/proactiveConversation=import\("\.\/ai-advokat-proactive\.mjs/);
  assert.match(external,/proactiveConversation=import\("\.\/ai-advokat-proactive\.mjs/);
  assert.match(internal,/if\(r\.ok&&d\?\.ok\)/);
  assert.match(internal,/proactiveNextTurns=await proactiveConversation/);
  assert.match(external,/renderProactiveNextTurns\(article,nextTurns\)/);
  assert.match(external,/if\(pending\) return;/);
  assert.match(internal,/if\(abortController\) return;/);
  assert.match(pages,/assets\/ai-advokat-proactive\.mjs/);
  assert.match(probe,/silently sent a paid AI request/);
  assert.match(probe,/explicitly approved follow-up/);
});
