import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOperatingPlan, listOperatingTasks } from "../src/operating-desk-router.js";
import { WORKFLOW_TEMPLATES } from "../src/proactive-legal-agents.js";

test("Operating Desk exposes a bounded task catalogue",()=>{
  const tasks=listOperatingTasks();
  assert.ok(tasks.length>=10);
  assert.ok(tasks.some(x=>x.id==="contract_review"));
  assert.ok(tasks.some(x=>x.id==="training"));
});

test("confidential contract work routes through Secure Case first",()=>{
  const plan=buildOperatingPlan("contract_review",{sensitivity:"confidential"});
  assert.equal(plan.firstAction.href,"/casepilot-workspace.html");
  assert.equal(plan.workflowTemplate,"contract_review");
  assert.equal(plan.humanGate.externalTransmission,"locked");
  assert.equal(plan.humanGate.contractAcceptance,"locked");
  assert.equal(plan.privacyRoute,"secure_case_first");
  assert.match(plan.nextActions[0].label,/редигиран\/одобрен/);
});

test("confidential new matter remains explicitly Secure Case routed",()=>{
  const plan=buildOperatingPlan("new_matter",{sensitivity:"confidential"});
  assert.equal(plan.firstAction.href,"/casepilot-workspace.html");
  assert.equal(plan.privacyRoute,"secure_case_first");
});

test("public legal research routes to Hybrid and a valid research workflow",()=>{
  const plan=buildOperatingPlan("legal_research",{sensitivity:"public"});
  assert.equal(plan.firstAction.href,"/hybrid-legal-intelligence.html");
  assert.ok(WORKFLOW_TEMPLATES[plan.workflowTemplate]);
  assert.match(plan.nextActions.find(x=>x.id==="agent_runtime").href,/template=legal_research_memo/);
});

test("direct training mode does not invent an agent workflow",()=>{
  const plan=buildOperatingPlan("training",{sensitivity:"public"});
  assert.equal(plan.workflowTemplate,null);
  assert.equal(plan.firstAction.href,"/zoki-legal-ai-guide.html");
  assert.equal(plan.humanGate.required,true);
});

test("every referenced agent workflow exists",()=>{
  for(const task of listOperatingTasks()){
    if(task.workflow) assert.ok(WORKFLOW_TEMPLATES[task.workflow],task.id+" has an invalid workflow");
  }
});

test("Operating Desk is wired into production assets and primary navigation",()=>{
  const assetsIgnore=readFileSync(new URL("../.assetsignore",import.meta.url),"utf8");
  const page=readFileSync(new URL("../operating-desk.html",import.meta.url),"utf8");
  const bot=readFileSync(new URL("../bot/index.html",import.meta.url),"utf8");
  const home=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(assetsIgnore,/!src\/operating-desk-router\.js/);
  assert.match(page,/\/assets\/operating-desk\.js/);
  assert.match(bot,/\/operating-desk\.html/);
  assert.match(home,/\/operating-desk\.html/);
});

test("unknown tasks and sensitivity fail closed",()=>{
  assert.throws(()=>buildOperatingPlan("not-a-task"),/unknown_task/);
  assert.throws(()=>buildOperatingPlan("training",{sensitivity:"secretish"}),/invalid_sensitivity/);
});
