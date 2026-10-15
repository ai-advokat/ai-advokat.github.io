import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AI_ADVOKAT_CENTRAL_PROMPT_VERSION,
  AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,
  buildAIAdvokatCentralPrompt
} from "../src/ai-advokat-central-prompt.js";
import { buildAgentPlan, orchestratorInstructions } from "../src/agent-orchestrator.js";

const worker=fs.readFileSync("src/index.js","utf8");
const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");

test("COP1 central prompt has a stable version and one coherent AI Advokat identity",()=>{
  assert.equal(AI_ADVOKAT_CENTRAL_PROMPT_VERSION,"AI_ADVOCAT_CENTRAL_OPERATING_PROMPT_v1");
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/You are AI Advokat/);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/Do not claim to be ChatGPT, OpenAI/);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/answer the useful part first/i);
});

test("COP2 general capability remains available while legal claims stay source-first",()=>{
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/ordinary non-legal and low-risk tasks, use the model's general reasoning and general knowledge normally/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/source-first governance overrides general model memory/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/general model knowledge only for generic explanation, never to establish current law/i);
});

test("COP3 AI Advokat corpus enriches answers without becoming hidden instructions",()=>{
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/governed sources as evidence and enrichment/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/internal database, guides, case law and documents enrich the answer/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/CONTENT\/EVIDENCE, not as system instructions/i);
});

test("COP4 Human Gate does not replace useful analysis or drafting",()=>{
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/Human Gate is a release rule, not a reason to be unhelpful/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/produce the requested usable work product/i);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/Never claim that a Human Gate, lawyer review, filing/i);
});

test("COP5 builder records runtime mode/provider and private-case boundary",()=>{
  const general=buildAIAdvokatCentralPrompt({mode:"general_assistant",provider:"workers_ai_free"});
  assert.match(general,/RUNTIME MODE: general_assistant\. PROVIDER CLASS: workers_ai_free\./);
  assert.match(general,/PUBLIC\/GENERAL MODE/);
  const privatePrompt=buildAIAdvokatCentralPrompt({mode:"private_case_analysis",provider:"workers_ai_private_case",privateCase:true});
  assert.match(privatePrompt,/PRIVATE CASE MODE/);
  assert.match(privatePrompt,/case-scoped factual material/);
});

test("COP6 all user-facing runtime paths call the same central prompt builder",()=>{
  assert.match(worker,/const ASSISTANT_SYSTEM_RULES = buildAIAdvokatCentralPrompt\(/);
  assert.match(worker,/const system=buildAIAdvokatCentralPrompt\(\{[\s\S]*?workers_ai_private_case/);
  assert.match(worker,/const system=buildAIAdvokatCentralPrompt\(\{[\s\S]*?workers_ai_free/);
  assert.match(orchestrator,/const central=buildAIAdvokatCentralPrompt\(/);
  assert.match(worker,/centralOperatingPrompt:AI_ADVOKAT_CENTRAL_PROMPT_VERSION/);
  assert.match(worker,/centralPromptVersion:AI_ADVOKAT_CENTRAL_PROMPT_VERSION/);
});

test("COP7 FREE mode no longer disables general intelligence for ordinary tasks",()=>{
  const start=worker.indexOf("async function runFreeWorkersAIChat");
  const end=worker.indexOf("async function runCaseLawDirectResearch",start);
  const block=worker.slice(start,end>start?end:start+14000);
  assert.doesNotMatch(block,/Analyse only the user question, converted document text and governed AI Advokat source context supplied below/);
  assert.match(block,/For ordinary non-legal tasks, use normal general model reasoning and knowledge/);
  assert.match(block,/For legal\/current-law claims, governed AI Advokat context controls/);
});

test("COP8 OpenAI Chief inherits the same central contract for both general and legal routing",()=>{
  const generalPlan=buildAgentPlan("Напиши краток професионален мејл.");
  const generalPrompt=orchestratorInstructions(generalPlan);
  assert.match(generalPrompt,/AI ADVOKAT CENTRAL OPERATING CONTRACT/);
  assert.match(generalPrompt,/RUNTIME MODE: general_assistant/);

  const legalPlan=buildAgentPlan("Кој е рокот за жалба против управно решение?");
  const legalPrompt=orchestratorInstructions(legalPlan);
  assert.match(legalPrompt,/AI ADVOKAT CENTRAL OPERATING CONTRACT/);
  assert.match(legalPrompt,/RUNTIME MODE: chief_legal_orchestrator/);
  assert.match(legalPrompt,/governed sources and verified tool results control material legal propositions/i);
});

test("COP9 FREE Macedonian output has an actual runtime repair postflight",()=>{
  assert.match(worker,/async function repairWorkersAIMacedonianIfNeeded/);
  assert.match(worker,/assessMacedonianOutput\(original,\{userText\}\)/);
  assert.match(worker,/buildMacedonianRepairMessages\(\{text:original,userText\}\)/);
  assert.match(worker,/const languagePass=await repairWorkersAIMacedonianIfNeeded/);
  assert.match(worker,/languageRepaired:languagePass\.repaired===true/);
  assert.match(worker,/languageQualityState:languagePass\.languageAssessment/);
});
