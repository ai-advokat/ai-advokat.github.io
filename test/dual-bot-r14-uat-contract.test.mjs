import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source=fs.readFileSync("scripts/ai-advokat-dual-bot-r14-uat.mjs","utf8");
const workflow=fs.readFileSync(".github/workflows/ai-advokat-dual-bot-r14-uat.yml","utf8");

test("R14 shared UAT treats every required answer pattern as a hard release gate",()=>{
  assert.match(source,/for\(const re of tc\.must\|\|\[\]\) if\(!re\.test\(answer\)\) hard\.push\("missing_required:"\+re\.source\)/);
  assert.doesNotMatch(source,/tc\.must[\s\S]{0,100}quality\.push\("missing:/);
  assert.match(source,/mandatoryAnswerChecks:"HARD_GATE"/);
  assert.match(source,/if\(summary\.hardFailures>0\|\|cross\.some/);
});

test("R14 UAT contains the approved shared-scenario legal gates",()=>{
  for(const id of [
    "R14-ZRO12","R14-GAZETTE","R14-AMBIGUOUS-12","R14-DIVORCE",
    "R14-DEBT-150K","R14-ECHR","R14-DETENTION","R14-JUDGMENT-TAXONOMY"
  ]) assert.ok(source.includes(id),"missing shared scenario "+id);
  assert.match(source,/одбивателна\\s\+пресуда/);
  assert.match(source,/ослободителна\\s\+пресуда/);
  assert.match(source,/осудителна\\s\+пресуда/);
  assert.match(source,/forbidden_detention_terminology/);
});

test("R14 production workflow verifies both live frontend parity and both governed bot surfaces",()=>{
  assert.match(workflow,/Verify live standalone bundle parity surface/);
  assert.match(workflow,/Verify governed toolkit APIs/);
  assert.match(workflow,/Run shared-scenario live UAT against both bots/);
  assert.match(source,/path:"\/api\/chat"/);
  assert.match(source,/path:"\/api\/bot"/);
  assert.match(workflow,/environment: production/);
});


test("R14 production UAT retriggers when the shared core runtime changes",()=>{
  assert.match(workflow,/paths:\n\s+- "src\/index\.js"/);
});


test("newest production commit replaces stale pending UAT",()=>{
  assert.match(workflow,/group: ai-advokat-dual-bot-r14-production-uat/);
  assert.match(workflow,/cancel-in-progress: true/);
});
