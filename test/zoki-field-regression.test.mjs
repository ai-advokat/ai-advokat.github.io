import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,
  buildAIAdvokatFreeFastPrompt
} from "../src/ai-advokat-central-prompt.js";
import {
  assessMacedonianOutput,
  normaliseMacedonianGeneratedText
} from "../src/macedonian-language-guard.js";
import {
  assessSpecificCaseLawClaims,
  redactUnsupportedSpecificCaseLawClaims
} from "../src/case-law-claim-guard.js";

const worker=fs.readFileSync("src/index.js","utf8");
const ui=fs.readFileSync("assets/standalone-bot-vnext.css","utf8");

test("ZOKI1 North Macedonian legal concepts do not import precedent lawmaking or a phantom Civil Code",()=>{
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/NORTH MACEDONIAN LEGAL-SYSTEM DEFAULT/);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/do not state that Macedonian laws are created through judicial precedents/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/NO PHANTOM CIVIL CODE/);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/Граѓански законик/);
});

test("ZOKI2 simple TRAINING legal concepts require GPT-like explanatory depth instead of 4-8 generic sentences",()=>{
  const prompt=buildAIAdvokatFreeFastPrompt({
    userText:"Што е граѓанско право?",
    missionProfile:"L0_INFORMATIONAL",
    corpusContext:[],
    additionalRules:[]
  });
  assert.match(prompt,/definition/i);
  assert.match(prompt,/key characteristics or scope/i);
  assert.match(prompt,/practical example/i);
  assert.match(prompt,/short conclusion/i);
  assert.doesNotMatch(prompt,/4-8 concise sentences/i);
});

test("ZOKI3 zero-corpus L2-L3 analysis remains useful while current-law specifics stay source-first",()=>{
  assert.match(worker,/ZERO-GOVERNED-CONTEXT ANALYSIS SAFETY/);
  assert.match(worker,/substantive working analysis of the facts, competing arguments, evidence, burden\/causation issues, risks and process strategy/i);
  assert.match(worker,/Do not invent statute names, article numbers, deadlines, court competence or legal effects/i);
  assert.doesNotMatch(worker,/ZERO-GOVERNED-CONTEXT SAFETY: no governed current-law source matched this L2\/L3 request\. Produce only a structural working template/);
});

test("ZOKI4 reported Bulgarian and malformed forms are repaired before release",()=>{
  const raw="Во предоставлените извори далее се наведува дека правилата определјаат де-факто состојба.";
  const clean=normaliseMacedonianGeneratedText(raw);
  assert.doesNotMatch(clean,/предоставлените|далее|определјаат/iu);
  assert.match(clean,/достапните/u);
  assert.match(clean,/определуваат/u);
  assert.equal(assessMacedonianOutput(clean,{userText:"Одговори на македонски."}).ok,true);
});

test("ZOKI5 one unverified judgment does not destroy the rest of a useful legal answer",()=>{
  const draft=[
    "Фактичката основа е спорна и треба да се докаже.",
    "Пресуда на Врховниот суд бр. 123/2020 наводно го потврдува ставот.",
    "Потребно е да се обезбедат договорот, исплатата и комуникацијата."
  ].join("\n");
  const gate=assessSpecificCaseLawClaims(draft);
  assert.equal(gate.ok,false);
  const safe=redactUnsupportedSpecificCaseLawClaims(draft,gate);
  assert.equal(safe.changed,true);
  assert.match(safe.text,/Фактичката основа е спорна/u);
  assert.match(safe.text,/проверен официјален извор на судска практика/u);
  assert.match(safe.text,/Потребно е да се обезбедат договорот/u);
  assert.doesNotMatch(safe.text,/123\/2020/u);
  assert.equal(assessSpecificCaseLawClaims(safe.text).ok,true);
});

test("ZOKI6 clean conversation has explicit readable dark and light question bubbles",()=>{
  assert.match(ui,/data-vnext-theme="dark"\]\[data-external-experience="conversation"\] \.message\.user/);
  assert.match(ui,/background:#26394c!important/);
  assert.match(ui,/color:#f7fbff!important/);
  assert.match(ui,/data-vnext-theme="light"\]\[data-external-experience="conversation"\] \.message\.user/);
  assert.match(ui,/background:#e8eef3!important/);
  assert.match(ui,/color:#102233!important/);
});
