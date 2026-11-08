import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProactiveRun,
  planParallelTasks,
  assertAgentAction,
  createHumanNudge,
  verifyRunForReview,
  sanitizePreferenceMemory
} from "../src/proactive-legal-agents.js";

test("builds a source-first proactive legal run with Human Gate locked",()=>{
  const run=buildProactiveRun({
    runId:"RUN-001",
    templateId:"regulatory_change_review",
    matterId:"MATTER-1",
    objective:"Провери промени во законодавство и подготви review queue.",
    sourceUniverse:["Official Gazette","Sobranie"],
    userPreferences:{outputLanguage:"mk",citationStyle:"source-first"}
  });
  assert.equal(run.state,"planned");
  assert.equal(run.humanGate.consequentialActions,"locked");
  assert.equal(run.humanGate.externalTransmission,"forbidden");
  assert.equal(run.agents.length,3);
});

test("plans independent agents in parallel but all remain review-bound",()=>{
  const run=buildProactiveRun({
    runId:"RUN-002",templateId:"contract_review",
    objective:"Спореди договор со одобрен playbook."
  });
  const tasks=planParallelTasks(run);
  assert.equal(tasks.length,3);
  assert.ok(tasks.every(t=>t.reviewRequired===true));
});

test("forbids consequential actions and unknown mandates",()=>{
  assert.deepEqual(assertAgentAction("contract_reviewer","extract_terms"),{
    allowed:true,reason:"bounded_agent_action"
  });
  assert.equal(assertAgentAction("contract_reviewer","sign_contract").allowed,false);
  assert.equal(assertAgentAction("contract_reviewer","contact_court").allowed,false);
});

test("scheduled execution requires separate runtime authorization",()=>{
  const run=buildProactiveRun({
    runId:"RUN-003",templateId:"regulatory_change_review",
    objective:"Следи регулаторни промени.",
    requestedSchedule:{cadence:"daily",timezone:"Europe/Skopje"}
  });
  assert.equal(run.schedule.enabled,false);
  assert.equal(run.schedule.activation,"requires_separate_runtime_authorization");
});

test("litigation workflow rejects unsupported scheduling",()=>{
  assert.throws(()=>buildProactiveRun({
    runId:"RUN-004",templateId:"litigation_case_review",
    objective:"Анализирај спор.",
    requestedSchedule:{cadence:"daily",timezone:"Europe/Skopje"}
  }),/schedule_not_allowed/);
});

test("human nudges stop at judgment points",()=>{
  const n=createHumanNudge({
    runId:"RUN-005",
    reason:"conflicting_authority",
    question:"Кој извор да има предност по дополнителна проверка?",
    sourceRefs:["SRC-1","SRC-2"]
  });
  assert.equal(n.state,"awaiting_human_judgment");
  assert.equal(n.blocking,true);
});

test("verification must complete before human review",()=>{
  const run=buildProactiveRun({
    runId:"RUN-006",templateId:"litigation_case_review",
    objective:"Подготви стратегиски review."
  });
  const blocked=verifyRunForReview(run,{citationsComplete:true,sourceVersionsChecked:true});
  assert.equal(blocked.readyForHumanReview,false);
  assert.ok(blocked.blockers.includes("adverse_authority_check_incomplete"));
  const ready=verifyRunForReview(run,{
    citationsComplete:true,sourceVersionsChecked:true,adverseAuthorityChecked:true
  });
  assert.equal(ready.readyForHumanReview,true);
  assert.equal(ready.releaseState,"ready_for_human_review_not_release");
});

test("preference memory is bounded and excludes matter facts",()=>{
  const m=sanitizePreferenceMemory({
    outputLanguage:"mk",
    citationStyle:"source-first",
    summaryStyle:"concise",
    preferredStructure:["Issue","Rule","Analysis","Human Gate"],
    clientName:"SHOULD_NOT_PERSIST"
  });
  assert.equal(m.outputLanguage,"mk");
  assert.equal("clientName" in m,false);
});
