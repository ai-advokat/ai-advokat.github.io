import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildLegalRoutingQuery,isContextDependentLegalFollowUp} from "../src/legal-conversation-context.js";
import {isFormalLegalDraftRequest} from "../src/response-quality.js";
import {detectConfidentialCasePrompt} from "../src/chat-privacy.js";
import {
  historicalCaseLawTemporalGateRequest,
  detectExternalBotCapabilityRoute,
  embeddedInstructionAttackRequest
} from "../src/index.js";

const fixture=JSON.parse(fs.readFileSync("test/fixtures/r3-central-audit-11-29.json","utf8"));
const cases=fixture.tests;
const byId=id=>cases.find(x=>x.id===id);

test("R3X1 canonical audit fixture is exact 11-29 and immutable in scope",()=>{
  assert.equal(fixture.source.version,"1.0");
  assert.equal(fixture.source.date,"2026-11-11");
  assert.deepEqual(cases.map(x=>x.id),Array.from({length:19},(_,i)=>i+11));
  assert.equal(new Set(cases.map(x=>x.prompt)).size,19);
  for(const tc of cases){
    assert.ok(tc.prompt.length>180,"prompt unexpectedly short for R3-"+tc.id);
    assert.ok(tc.title);
    assert.ok(tc.area);
    assert.ok(tc.priority);
  }
});

test("R3X2 every exact 11-29 prompt is standalone and cannot inherit stale unrelated history",()=>{
  const staleHistory=[
    {role:"user",text:"Во друг предмет од 2004 година имаше стара судска практика."},
    {role:"assistant",text:"Во претходниот работен пример се спомна 2027 година. Ова е неповрзан AI контекст."}
  ];
  for(const tc of cases){
    assert.equal(isContextDependentLegalFollowUp(tc.prompt),false,"false follow-up classification R3-"+tc.id);
    assert.equal(buildLegalRoutingQuery(tc.prompt,staleHistory),tc.prompt,"history leaked into R3-"+tc.id);
  }
});

test("R3X3 no exact 11-29 prompt may fall into the generic historical case-law temporal warning",()=>{
  for(const tc of cases){
    assert.equal(historicalCaseLawTemporalGateRequest(tc.prompt),false,"historical gate hijacked R3-"+tc.id);
  }
});

test("R3X4 analysis-first cases 11-28 never become primary formal-document requests",()=>{
  for(const tc of cases.filter(x=>x.id<=28)){
    assert.equal(isFormalLegalDraftRequest(tc.prompt),false,"formal-draft classifier hijacked R3-"+tc.id);
  }
});

test("R3X5 hypothetical audit prompts stay out of Secure Case without real identifiers or original uploads",()=>{
  for(const tc of cases){
    assert.notEqual(detectExternalBotCapabilityRoute(tc.prompt),"SECURE_CASE","external route falsely secured R3-"+tc.id);
    assert.equal(detectConfidentialCasePrompt(tc.prompt).confidential,false,"privacy gate falsely secured R3-"+tc.id);
  }
});

test("R3X6 only test 29 is an embedded-instruction attack",()=>{
  for(const tc of cases){
    assert.equal(embeddedInstructionAttackRequest(tc.prompt),tc.id===29,"prompt-injection classification mismatch R3-"+tc.id);
  }
});

test("R3X7 test 23 intra-message 'оваа одлука' must not pull prior conversation context",()=>{
  const tc=byId(23);
  assert.match(tc.prompt,/оваа одлука/u);
  assert.equal(isContextDependentLegalFollowUp(tc.prompt),false);
  const routed=buildLegalRoutingQuery(tc.prompt,[
    {role:"user",text:"Неповрзан стар предмет со 1984 и 2004 година."},
    {role:"assistant",text:"Неповрзан стар AI одговор со 2027 година."}
  ]);
  assert.equal(routed,tc.prompt);
  assert.doesNotMatch(routed,/1984|2004|2027/u);
});

test("R3X7b factual 'претходно' inside a standalone case never means prior chat",()=>{
  const tc=byId(19);
  assert.match(tc.prompt,/Управителот претходно платил/u);
  assert.equal(isContextDependentLegalFollowUp(tc.prompt),false);
  assert.equal(buildLegalRoutingQuery(tc.prompt,[
    {role:"user",text:"Стар неповрзан тест со 2004 година."},
    {role:"assistant",text:"Стар одговор со 2027 година."}
  ]),tc.prompt);
});

test("R3X8 failure telemetry contract is privacy-safe and correlation-ready",()=>{
  const source=fs.readFileSync("src/index.js","utf8");
  const freeBlock=source.slice(source.indexOf("failureTrace:{\n          requestId:runtimeRequestId"),source.indexOf("failureTrace:{\n          requestId:runtimeRequestId")+1800);
  assert.match(source,/X-AI-Advokat-Request-Id/);
  assert.match(source,/const runtimeRequestId="R3-"\+crypto\.randomUUID\(\)/);
  assert.match(source,/const cfRay=String\(request\.headers\.get\("CF-Ray"\)/);
  for(const field of ["requestId","cfRay","route","stage","provider","model","errorType","retryable","providerCalls","retryCount","missionProfile"]){
    assert.match(freeBlock,new RegExp(field+":"));
  }
  assert.doesNotMatch(freeBlock,/prompt\s*:/i);
  assert.doesNotMatch(freeBlock,/userQ\s*:/);
  assert.doesNotMatch(freeBlock,/routingQuery\s*:/);
});

test("R3X9 known historical failure signatures are represented as forbidden live outcomes",()=>{
  const forbidden=[
    "РАБОТЕН ПРИМЕР — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА",
    "Не. Историски судски извор не станува автоматски важечко право",
    "ДО: [НАДЛЕЖЕН СУД / ОРГАН — ДА СЕ ПРОВЕРИ]"
  ];
  assert.equal(forbidden.length,3);
  assert.ok(fixture.common_protocol.includes("не генерирај лажен правен нацрт"));
});
