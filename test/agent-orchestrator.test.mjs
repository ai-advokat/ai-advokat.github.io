import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_ROLES,
  ORCHESTRATOR_MODES,
  buildAgentPlan,
  openAIOrchestratorConfigured,
  extractOpenAIResponseText,
  orchestratorInstructions
} from "../src/agent-orchestrator.js";

describe("AI Advokat GPT orchestrator foundation", () => {
  test("native corpus mode is corpus-first and keeps Macedonian specialist", () => {
    const plan=buildAgentPlan("Што пишува во упатството на Зоран?",{preferCorpus:true});
    assert.equal(plan.mode,ORCHESTRATOR_MODES.PASSIVE_CORPUS);
    assert.ok(plan.agents.includes(AGENT_ROLES.corpus.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.mk.id));
    assert.equal(plan.rules.corpusFirst,true);
    assert.equal(plan.rules.preserveJurisdictionBoundaries,true);
  });

  test("comparative query routes distinct EU, ECHR and common-law specialists", () => {
    const plan=buildAgentPlan("Спореди македонско право со EU, ECHR/HUDOC и UK common law precedent.");
    assert.equal(plan.mode,ORCHESTRATOR_MODES.COMPARATIVE);
    assert.ok(plan.agents.includes(AGENT_ROLES.mk.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.eu.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.echr.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.common.id));
    assert.equal(plan.verifier,AGENT_ROLES.verify.id);
  });

  test("Macedonian Cyrillic jurisdiction names route the right specialists", () => {
    const eu=buildAgentPlan("Што вели правото на Европската Унија?");
    assert.ok(eu.agents.includes(AGENT_ROLES.eu.id));
    assert.equal(eu.mode,ORCHESTRATOR_MODES.COMPARATIVE);

    const echr=buildAgentPlan("Што вели Европскиот суд за човекови права?");
    assert.ok(echr.agents.includes(AGENT_ROLES.echr.id));
    assert.equal(echr.mode,ORCHESTRATOR_MODES.COMPARATIVE);
  });

  test("provider activation fails closed unless gate, key and model are all present", () => {
    assert.equal(openAIOrchestratorConfigured({}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"true",OPENAI_API_KEY:"x".repeat(40)}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"false",OPENAI_API_KEY:"x".repeat(40),OPENAI_MODEL:"gpt-x"}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"true",OPENAI_API_KEY:"x".repeat(40),OPENAI_MODEL:"gpt-x"}),true);
  });

  test("Responses API output text is extracted without accepting arbitrary fields", () => {
    assert.equal(extractOpenAIResponseText({status:"completed",output_text:"  Одговор  "}),"Одговор");
    assert.equal(extractOpenAIResponseText({output:[{type:"message",content:[{type:"output_text",text:"A"},{type:"output_text",text:"B"}]}]}),"A\n\nB");
    assert.equal(extractOpenAIResponseText({answer:"unsafe-shape"}),null);
  });

  test("orchestrator contract states corpus and jurisdiction boundaries", () => {
    const rules=orchestratorInstructions(buildAgentPlan("EU и македонско право"));
    assert.match(rules,/Never merge jurisdictions/);
    assert.match(rules,/corpus content and exact provenance come first/);
    assert.match(rules,/Human Gate/);
  });
});
