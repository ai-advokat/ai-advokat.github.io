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
  assert.match(source,/правен акт\|идентификува/);
});

test("R14 production workflow verifies both live frontend parity and both governed bot surfaces",()=>{
  assert.match(workflow,/Verify live standalone bundle parity surface/);
  assert.match(workflow,/Verify governed toolkit APIs/);
  assert.match(workflow,/Run shared-scenario live UAT against both bots/);
  assert.match(source,/path:"\/api\/chat"/);
  assert.match(source,/path:"\/api\/bot"/);
  assert.match(workflow,/environment: production/);
});


test("R14 production UAT runs only after successful production runtime sync and checks the deployed SHA",()=>{
  assert.match(workflow,/workflow_run:/);
  assert.match(workflow,/workflows: \["AI Advokat production runtime sync"\]/);
  assert.match(workflow,/types: \[completed\]/);
  assert.match(workflow,/github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow,/github\.event\.workflow_run\.head_sha/);
  assert.match(workflow,/workflow_dispatch:/);
});


test("R14 UAT classifies verified internal Workers-AI plus OpenAI spend-limit exhaustion as operational capacity",()=>{
  assert.match(source,/isOpenAIProviderCapacityStatus/);
  assert.match(source,/fallbackProviderFailure/);
  assert.match(source,/recovery\.direction==="workers_ai_to_openai"/);
  assert.match(source,/fallback\.provider==="openai"/);
  assert.match(source,/Number\(fallback\.httpStatus\)===429/);
  assert.match(source,/PROVIDER_CAPACITY_BLOCKED/);
  assert.match(source,/fallbackCapacityReason:String\(fallback\.responseStatus\|\|""\)/);
});

test("R14 UAT still requires a fail-closed empty answer before capacity classification",()=>{
  assert.match(source,/!String\(d\?\.answer\|\|""\)\.trim\(\)/);
});


test("R14 UAT retries only fast transport failures without masking provider HTTP failures",()=>{
  assert.match(source,/function retryableFastTransportFailure/);
  assert.match(source,/Number\(elapsedMs\)<5000/);
  assert.match(source,/attempt<2 && retryableFastTransportFailure\(message,ms\)/);
  assert.match(source,/transportAttempts:res\.attempts\|\|1/);
});
