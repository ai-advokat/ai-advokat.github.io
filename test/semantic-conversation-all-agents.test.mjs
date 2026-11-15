import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  isContextDependentLegalFollowUp,
  buildLegalRoutingQuery,
  buildLegalPlanningQuestion
} from "../src/legal-conversation-context.js";
import {
  AI_ADVOKAT_CONVERSATIONAL_SEMANTICS_VERSION,
  buildAIAdvokatFreeFastPrompt,
  buildAIAdvokatCentralPrompt
} from "../src/ai-advokat-central-prompt.js";
import {AGENT_ROLES,specialistInstructions} from "../src/agent-orchestrator.js";
import {suggestLegalNextTurns} from "../assets/ai-advokat-proactive.mjs";
import {
  buildProactiveRun,
  planParallelTasks
} from "../src/proactive-legal-agents.js";

const history=[
  {role:"user",text:"Во измислен случај, работодавачот дал отказ без писмено решение."},
  {role:"assistant",text:"Само како хипотетичка илустрација спомнав Закон број 9999, што НЕ Е проверен правен извор."}
];

test("short conversational ellipses inherit supplied context; standalone questions do not",()=>{
  for(const q of ["А зошто?","А што со рокот?","Не, мислев на договорот.","What if the decision arrived yesterday?","Why is that?","A zosto?","Sto so rokot?","Ne, mislev na dogovorot."]){
    assert.equal(isContextDependentLegalFollowUp(q),true,q);
  }
  for(const q of ["Како да се подготви жалба?","Кој е главен град на Франција?","Explain contract clauses for a new agreement."]){
    assert.equal(isContextDependentLegalFollowUp(q),false,q);
  }
});

test("semantic planning selects last user-authored topic, not invented AI law",()=>{
  const routing=buildLegalPlanningQuestion("А зошто?",history);
  assert.match(routing,/работодавачот дал отказ/);
  assert.match(routing,/CURRENT FOLLOW-UP/);
  assert.doesNotMatch(routing,/Закон број 9999/);
  assert.doesNotMatch(routing,/assistant/iu);
  const research=buildLegalRoutingQuery("А зошто?",history);
  assert.match(research,/PRIOR AI WORKING CONTEXT/);
  assert.match(research,/not verified fact or legal authority/);
  assert.match(research,/Закон број 9999/);
});

test("user correction of the topic is preserved in current conversational focus",()=>{
  const q="Не, мислев на договорот, не на отказот.";
  const plan=buildLegalPlanningQuestion(q,history);
  assert.match(plan,/CURRENT FOLLOW-UP:\nНе, мислев на договорот/);
  assert.match(plan,/PRIOR USER TOPIC/);
});

test("professional, free and every specialist share one semantic dialogue contract",()=>{
  assert.equal(AI_ADVOKAT_CONVERSATIONAL_SEMANTICS_VERSION,"AI_ADVOCAT_CONVERSATIONAL_SEMANTICS_V1");
  for(const prompt of [
    buildAIAdvokatCentralPrompt({mode:"chief_legal_orchestrator"}),
    buildAIAdvokatFreeFastPrompt({missionProfile:"L0_INFORMATIONAL"}),
    specialistInstructions(AGENT_ROLES.mk.id),
    specialistInstructions(AGENT_ROLES.verify.id),
    specialistInstructions(AGENT_ROLES.general.id)
  ]){
    assert.match(prompt,/SEMANTIC TURN UNDERSTANDING/);
    assert.match(prompt,/DIALOGUE CONTINUITY/);
    assert.match(prompt,/previous AI wording as unverified working context/);
    assert.match(prompt,/do not execute legal actions|Do not execute legal actions/i);
  }
});

test("both public chat surfaces feed bounded history to semantic next-turn suggestions",()=>{
  const main=readFileSync("assets/ai-advokat-chat.js","utf8");
  const external=readFileSync("assets/standalone-bot.js","utf8");
  const worker=readFileSync("src/index.js","utf8");
  assert.match(main,/suggestLegalNextTurns\?\.\(\{question:q,answer:d\.answer,language:selectedLanguageMeta\(\)\.code,history:historyForApi\}\)/);
  assert.match(external,/suggestLegalNextTurns\?\.\(\{question:outboundQ,answer:data\.answer,language:selectedLanguageMeta\(\)\.code,history:history\.slice\(-8\)\}\)/);
  assert.match(worker,/semanticPlanningQuery=contextualFollowUp/);
  assert.match(worker,/buildAgentPlan\(semanticPlanningQuery\)/);
  assert.match(worker,/buildAgentPlan\(contextualFollowUp \? semanticPlanningQuery : q,\{preferCorpus\}\)/);
});

test("context-derived proactive prompts do not echo facts or assistant content",()=>{
  const previous=[
    {role:"user",text:"Ми дадоа отказ од работен однос, ЕМБГ 0101999450012."},
    {role:"assistant",text:"Непроверено AI тврдење за измислен член 9999."}
  ];
  const next=suggestLegalNextTurns({question:"А зошто?",answer:"Работна анализа со извори и човечка проверка.",history:previous});
  assert.equal(next.category,"employment");
  assert.equal(next.requiresUserClick,true);
  assert.equal(next.sendsAutomatically,false);
  assert.equal(next.humanReviewRequired,true);
  const text=JSON.stringify(next);
  assert.doesNotMatch(text,/0101999450012|измислен член 9999|Ми дадоа отказ/);
  const latin=suggestLegalNextTurns({question:"A zosto?",answer:"Ova e rabotna analiza so covecka proverka.",history:[{role:"user",text:"Prasanje za otkaz od raboten odnos."}]});
  assert.equal(latin.category,"employment");
  const changed=suggestLegalNextTurns({question:"Не, мислев на договорот.",answer:"Ова е работна анализа.",history:previous});
  assert.equal(changed.category,"contract");
  const standalone=suggestLegalNextTurns({question:"Објасни договорна клаузула.",answer:"Ова е работна анализа.",history:previous});
  assert.equal(standalone.category,"contract");
});

test("proactive specialist tasks retain semantic intent and remain human-gated",()=>{
  const run=buildProactiveRun({runId:"SEMANTIC-R1",templateId:"contract_review",objective:"Разјасни ги спорните договорни клаузули."});
  const tasks=planParallelTasks(run);
  assert.equal(tasks.length,3);
  for(const task of tasks){
    assert.equal(task.semanticResponsePolicy.userGoalFirst,true);
    assert.equal(task.semanticResponsePolicy.priorAiClaimsNeverAuthority,true);
    assert.equal(task.semanticResponsePolicy.humanReviewRequired,true);
    assert.equal(task.semanticResponsePolicy.autonomousExternalActions,false);
    assert.equal(task.reviewRequired,true);
  }
});
