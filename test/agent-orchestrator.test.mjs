import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_ROLES,
  ORCHESTRATOR_MODES,
  ORCHESTRATION_PATTERN,
  buildAgentPlan,
  buildExecutionGraph,
  validateExecutionPreconditions,
  specialistInstructions,
  openAIOrchestratorConfigured,
  orchestratorRuntimeReadiness,
  extractOpenAIResponseText,
  orchestratorInstructions
} from "../src/agent-orchestrator.js";
import {
  KNOWLEDGE_CLASSES,
  createKnowledgeIntakeRecord,
  knowledgeCorpusAnswerPolicy
} from "../src/knowledge-intake.js";

describe("AI Advokat governed legal-agent architecture v2", () => {
  test("native corpus mode is corpus-first and keeps Macedonian verifier specialist", () => {
    const plan=buildAgentPlan("Што пишува во упатството на Зоран?",{preferCorpus:true});
    assert.equal(plan.mode,ORCHESTRATOR_MODES.PASSIVE_CORPUS);
    assert.ok(plan.agents.includes(AGENT_ROLES.corpus.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.mk.id));
    assert.equal(plan.rules.corpusFirst,true);
    assert.equal(plan.rules.corpusMissingMustBeSaidExplicitly,true);
    assert.equal(plan.rules.preserveJurisdictionBoundaries,true);
    assert.equal(plan.rules.externalResearchIsSeparateStep,true);
  });

  test("comparative query routes distinct MK, EU, ECHR and common-law specialists", () => {
    const plan=buildAgentPlan("Спореди македонско право со EU, ECHR/HUDOC и UK common law precedent.");
    assert.equal(plan.mode,ORCHESTRATOR_MODES.COMPARATIVE);
    assert.ok(plan.agents.includes(AGENT_ROLES.mk.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.eu.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.echr.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.common.id));
    assert.equal(plan.verifier,AGENT_ROLES.verify.id);
  });

  test("single foreign jurisdiction routes only its specialist unless comparison is requested", () => {
    const eu=buildAgentPlan("Што вели правото на Европската Унија?");
    assert.deepEqual(eu.agents,[AGENT_ROLES.eu.id]);
    assert.equal(eu.mode,ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);

    const echr=buildAgentPlan("Што вели Европскиот суд за човекови права?");
    assert.deepEqual(echr.agents,[AGENT_ROLES.echr.id]);
    assert.equal(echr.mode,ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);
  });

  test("manager pattern keeps one user-facing chief and mandatory verifier", () => {
    const plan=buildAgentPlan("Спореди македонско право со EU право.");
    const graph=buildExecutionGraph(plan);
    assert.equal(plan.pattern,"manager_agents_as_tools");
    assert.equal(ORCHESTRATION_PATTERN.userFacingAgent,AGENT_ROLES.chief.id);
    assert.equal(graph.userFacingAgent,AGENT_ROLES.chief.id);
    assert.equal(graph.finalAnswerOwner,AGENT_ROLES.chief.id);
    assert.equal(graph.handoffPolicy,"disabled_by_default");
    assert.equal(graph.phases[1].agent,AGENT_ROLES.verify.id);
    assert.equal(graph.phases[2].agent,AGENT_ROLES.chief.id);
  });

  test("knowledge specialist refuses silent model fallback", () => {
    const rules=specialistInstructions(AGENT_ROLES.corpus.id);
    assert.match(rules,/Native AI Advokat corpus comes first/);
    assert.match(rules,/Do not replace missing corpus support with model knowledge/);
    assert.match(rules,/CORPUS_NOT_SUPPORTED/);
    assert.match(rules,/External legal research/);
  });

  test("execution preflight fails closed when passive corpus lacks governed context", () => {
    const plan=buildAgentPlan("Што пишува во упатството на Зоран?",{preferCorpus:true});
    const blocked=validateExecutionPreconditions(plan,{corpusContext:[]});
    assert.equal(blocked.ok,false);
    assert.ok(blocked.problems.includes("native_corpus_context_required"));
    assert.ok(blocked.problems.includes("knowledge_agent_has_no_governed_context"));

    const ready=validateExecutionPreconditions(plan,{corpusContext:[{source:"doc-1",text:"x"}]});
    assert.equal(ready.ok,true);
  });

  test("external research context requires separate authorization", () => {
    const plan=buildAgentPlan("Што вели EU право?");
    const blocked=validateExecutionPreconditions(plan,{
      externalContext:[{source:"EUR-Lex",text:"x"}],
      externalResearchEnabled:false
    });
    assert.equal(blocked.ok,false);
    assert.ok(blocked.problems.includes("external_research_not_authorized"));
  });

  test("provider activation fails closed unless gate, key and model are all present", () => {
    assert.equal(openAIOrchestratorConfigured({}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"true",OPENAI_API_KEY:"x".repeat(40)}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"false",OPENAI_API_KEY:"x".repeat(40),OPENAI_MODEL:"gpt-x"}),false);
    assert.equal(openAIOrchestratorConfigured({OPENAI_ORCHESTRATOR_ENABLED:"true",OPENAI_API_KEY:"x".repeat(40),OPENAI_MODEL:"gpt-x"}),true);
    assert.equal(orchestratorRuntimeReadiness({}).provider,"locked");
  });

  test("Responses API output text is extracted without accepting arbitrary fields", () => {
    assert.equal(extractOpenAIResponseText({status:"completed",output_text:"  Одговор  "}),"Одговор");
    assert.equal(extractOpenAIResponseText({output:[{type:"message",content:[{type:"output_text",text:"A"},{type:"output_text",text:"B"}]}]}),"A\n\nB");
    assert.equal(extractOpenAIResponseText({answer:"unsafe-shape"}),null);
  });

  test("orchestrator contract states corpus, external-research and jurisdiction boundaries", () => {
    const rules=orchestratorInstructions(buildAgentPlan("Спореди EU и македонско право"));
    assert.match(rules,/Never merge jurisdictions/);
    assert.match(rules,/corpus content and exact provenance come first/);
    assert.match(rules,/Do not silently fall back/);
    assert.match(rules,/External legal research/);
    assert.match(rules,/Verification & Citation Agent/);
    assert.match(rules,/Human Gate/);
  });

  test("incoming author materials remain immutable and unpromoted by default", () => {
    const record=createKnowledgeIntakeRecord({
      id:"zoran-instruction-001",
      title:"Упатство 1",
      sourceSha256:"a".repeat(64),
      classification:KNOWLEDGE_CLASSES.INTERNAL_INSTRUCTION,
      authorityRole:"internal_operating_instruction"
    });
    assert.equal(record.originalPreservation.readOnlyOriginal,true);
    assert.equal(record.originalPreservation.contentMutation,"not_authorized");
    assert.equal(record.gates.ragEligibility,"not_authorized");
    assert.equal(record.gates.productionCorpusWrite,"not_authorized");
    assert.match(record.usePolicy.internalInstruction,/explicit_author_approval/);
  });

  test("native knowledge miss cannot silently become model knowledge", () => {
    const blocked=knowledgeCorpusAnswerPolicy({nativeSupport:false,externalResearchAuthorized:false});
    assert.equal(blocked.route,"corpus_not_supported");
    assert.equal(blocked.allowSynthesis,false);

    const external=knowledgeCorpusAnswerPolicy({nativeSupport:false,externalResearchAuthorized:true});
    assert.equal(external.route,"external_research_separate");
    assert.equal(external.label,"External legal research");
  });
});
