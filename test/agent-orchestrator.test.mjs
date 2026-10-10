import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AGENT_ROLES,
  ORCHESTRATOR_MODES,
  ORCHESTRATION_PATTERN,
  LEGAL_OPERATING_PROTOCOL,
  ACCURACY_FIRST_DOCTRINE,
  buildAgentPlan,
  buildExecutionGraph,
  validateExecutionPreconditions,
  specialistInstructions,
  openAIOrchestratorConfigured,
  orchestratorRuntimeReadiness,
  extractOpenAIResponseText,
  extractOpenAIWebCitations,
  extractOpenAIUsage,
  orchestratorInstructions,
  specialistExecutionRequired,
  runBoundedSpecialists,
  runLegalPostflightVerifier
} from "../src/agent-orchestrator.js";
import {
  KNOWLEDGE_CLASSES,
  createKnowledgeIntakeRecord,
  knowledgeCorpusAnswerPolicy
} from "../src/knowledge-intake.js";

const architectureManifest=JSON.parse(fs.readFileSync("data/agent-architecture-v2.json","utf8"));
const intakeManifest=JSON.parse(fs.readFileSync("data/knowledge-intake-policy.json","utf8"));
const architecturePage=fs.readFileSync("agent-architecture.html","utf8");
const workerSource=fs.readFileSync("src/index.js","utf8");
const wranglerConfig=fs.readFileSync("wrangler.jsonc","utf8");
const agentSource=fs.readFileSync("src/agent-orchestrator.js","utf8");

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

  test("general non-legal tasks route to GPT General Assistant instead of pretending to be Macedonian law", () => {
    const plan=buildAgentPlan("Напиши ми кратка деловна порака за состанок.");
    assert.equal(plan.mode,ORCHESTRATOR_MODES.GENERAL);
    assert.deepEqual(plan.agents,[AGENT_ROLES.general.id]);
    assert.equal(plan.rules.corpusFirst,false);
  });

  test("single foreign jurisdiction routes only its specialist unless comparison is requested", () => {
    const eu=buildAgentPlan("Што вели правото на Европската Унија?");
    assert.deepEqual(eu.agents,[AGENT_ROLES.eu.id]);
    assert.equal(eu.mode,ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);

    const echr=buildAgentPlan("Што вели Европскиот суд за човекови права?");
    assert.deepEqual(echr.agents,[AGENT_ROLES.echr.id]);
    assert.equal(echr.mode,ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);
  });

  test("AI Advokat corpus legal question keeps Macedonian law specialist for domestic article retrieval", () => {
    const plan=buildAgentPlan("Објасни што уредува член 1 од Законот за работните односи врз основа на AI Advokat article-level corpus.");
    assert.ok(plan.agents.includes(AGENT_ROLES.corpus.id));
    assert.ok(plan.agents.includes(AGENT_ROLES.mk.id));
    assert.equal(plan.mode,ORCHESTRATOR_MODES.PASSIVE_CORPUS);
  });

  test("manager pattern keeps one user-facing chief and mandatory verifier", () => {
    const plan=buildAgentPlan("Спореди македонско право со EU право.");
    const graph=buildExecutionGraph(plan);
    assert.equal(plan.pattern,"manager_agents_as_tools");
    assert.equal(ORCHESTRATION_PATTERN.userFacingAgent,AGENT_ROLES.chief.id);
    assert.equal(graph.userFacingAgent,AGENT_ROLES.chief.id);
    assert.equal(graph.finalAnswerOwner,AGENT_ROLES.chief.id);
    assert.equal(graph.handoffPolicy,"disabled_by_default");
    assert.equal(graph.phases[0].id,"legal_operating_protocol");
    assert.equal(graph.phases[1].id,"legal_intelligence_engine");
    assert.equal(graph.phases[2].id,"specialist_research");
    assert.equal(graph.phases[3].agent,AGENT_ROLES.verify.id);
    assert.equal(graph.phases[4].agent,AGENT_ROLES.chief.id);
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

  test("Accuracy-First doctrine treats 99.99% as aspiration, not an unsupported guarantee",()=>{
  assert.equal(ACCURACY_FIRST_DOCTRINE.guarantee,false);
  assert.match(ACCURACY_FIRST_DOCTRINE.aspirationalTarget,/99\.99_percent_directional_quality_goal_not_SLA/);
  const plan=buildAgentPlan("Што е најточниот правен одговор за овој предмет?",{explicitMode:ORCHESTRATOR_MODES.PROACTIVE_RESEARCH});
  const text=orchestratorInstructions(plan);
  assert.match(text,/ACCURACY-FIRST DOCTRINE/);
  assert.match(text,/99\.99% as an aspirational directional quality target/);
  assert.match(text,/SOURCE-BACKED FACT, INFERENCE, LEGAL PROPOSITION, STRATEGIC JUDGMENT and UNKNOWN/);
  assert.match(text,/Actively look for adverse facts, contradictory documents, superseded law/);
  assert.match(text,/Verification & Citation Agent performs a separate accuracy pass/);
  assert.equal(plan.rules.accuracyGuarantee,false);
});

test("chief instructions require answer-first substantive help without inventing unsupported law",()=>{
  const plan=buildAgentPlan("Помогни ми да подготвам што ми треба за правна постапка.",{explicitMode:ORCHESTRATOR_MODES.PROACTIVE_RESEARCH});
  const text=orchestratorInstructions(plan);
  assert.match(text,/ANSWER-FIRST QUALITY CONTRACT/);
  assert.match(text,/most useful substantive answer/);
  assert.match(text,/never invent current law, deadlines, jurisdiction, mandatory documents or legal effect/i);
  assert.match(text,/non-authoritative practical orientation/i);
  assert.match(text,/ordinarily no more than three/i);
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

  test("Responses API web citations are extracted as safe source metadata", () => {
    const citations=extractOpenAIWebCitations({
      output:[{type:"message",content:[{type:"output_text",text:"x",annotations:[
        {type:"url_citation",url:"https://example.com/a",title:"Example A"},
        {type:"url_citation",url:"javascript:alert(1)",title:"Unsafe"},
        {type:"url_citation",url:"https://example.com/a",title:"Duplicate"}
      ]}]}]
    });
    assert.deepEqual(citations,[{url:"https://example.com/a",title:"Example A"}]);
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
  test("architecture registry and public page expose the exact governed specialist set",()=>{
    assert.equal(architectureManifest.architecture_id,"AI_ADVOKAT_GOVERNED_AGENT_ARCHITECTURE_v2");
    assert.equal(architectureManifest.orchestration_pattern,"manager_agents_as_tools");
    assert.equal(architectureManifest.current_runtime.public_provider_activation,false);
    assert.equal(architectureManifest.agents.length,9);
    assert.match(architecturePage,/Chief Legal Orchestrator/);
    assert.match(architecturePage,/AI Advokat Knowledge Agent/);
    assert.match(architecturePage,/Verification & Citation Agent/);
    assert.match(architecturePage,/provider execution · separate activation/);
    assert.match(architecturePage,/GPT General Assistant/);
    assert.match(architecturePage,/GPT-style workspace/);
    assert.equal(architectureManifest.product_experience.backend_contract.endpoint,"/api/chat");
    assert.equal(architectureManifest.product_experience.backend_contract.conversations_api,false);
    assert.equal(architectureManifest.product_experience.backend_contract.responses_store,false);
    assert.equal(architectureManifest.product_experience.backend_contract.conversation_state,"browser_session_history_replayed_as_context");
    assert.equal(architectureManifest.product_experience.current_activation.provider_execution,false);
  });

  test("knowledge intake registry preserves originals and leaves downstream gates closed",()=>{
    assert.equal(intakeManifest.policy_id,"AI_ADVOKAT_KNOWLEDGE_INTAKE_POLICY_v1");
    assert.ok(intakeManifest.doctrine.includes("read_before_edit"));
    assert.ok(intakeManifest.doctrine.includes("preserve_original"));
    assert.equal(intakeManifest.default_gates.rag_eligibility,false);
    assert.equal(intakeManifest.default_gates.production_corpus_write,false);
    assert.equal(intakeManifest.default_gates.legal_corpus_promotion,false);
  });

  test("worker exposes planning and policy endpoints without public provider execution",()=>{
    assert.match(workerSource,/\/api\/orchestrator\/plan/);
    assert.match(workerSource,/\/api\/knowledge-intake-policy/);
    assert.match(workerSource,/execution:"planning_only"/);
    assert.match(workerSource,/providerExecution:"separate_activation_required"/);
  });

  test("approved GPT-6.1 Sol target model is recorded with explicit production authorization pending preflight",()=>{
    assert.equal(architectureManifest.model_selection.primary_model_id,"gpt-6.1-sol");
    assert.equal(architectureManifest.model_selection.api,"OpenAI Responses API");
    assert.equal(architectureManifest.model_selection.default_reasoning_effort,"medium");
    assert.equal(architectureManifest.model_selection.escalation_reasoning_effort,"high");
    assert.equal(architectureManifest.model_selection.production_provider_activation,"authorized_pending_preflight");
    assert.equal(architectureManifest.current_runtime.approved_target_model,"gpt-6.1-sol");
    assert.equal(architectureManifest.current_runtime.public_provider_activation,false);
    assert.match(wranglerConfig,/"OPENAI_MODEL"\s*:\s*"gpt-6\.1-sol"/);
    assert.match(wranglerConfig,/"OPENAI_ORCHESTRATOR_ENABLED"\s*:\s*"true"/);
    assert.match(wranglerConfig,/"OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED"\s*:\s*"true"/);
    assert.match(wranglerConfig,/"OPENAI_FILE_INPUT_ENABLED"\s*:\s*"true"/);
    assert.doesNotMatch(wranglerConfig,/OPENAI_API_KEY/);
    assert.equal(architectureManifest.model_selection.activation_progress.production_provider_live,false);
  });
});


test('legal operating protocol does not create legal authority or bypass Human Gate',()=>{
  const plan=buildAgentPlan('Подготви правна анализа според важечко македонско право');
  assert.equal(LEGAL_OPERATING_PROTOCOL.createsLegalAuthority,false);
  assert.equal(LEGAL_OPERATING_PROTOCOL.humanGateUnchanged,true);
  assert.deepEqual(plan.legalOperatingProtocol.cycle.slice(0,4),['intake','knowledge','system_map','diagnosis']);
  const graph=buildExecutionGraph(plan);
  assert.equal(graph.phases[0].id,'legal_operating_protocol');
});


test("LIOE mission depth is integrated without creating legal authority",()=>{
  const current=buildAgentPlan("Што вели важечкото македонско право денес?");
  assert.equal(current.legalIntelligenceEngine.mission_profile.id,"L1_VERIFIED_RESEARCH");
  assert.equal(current.legalIntelligenceEngine.knowledge.current_law_verification_required,true);
  assert.equal(current.rules.minimalSufficientSpecialistActivation,true);

  const consequential=buildAgentPlan("Подготви финален поднесок за поднесување до суд и испрати го.");
  assert.equal(consequential.legalIntelligenceEngine.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(consequential.legalIntelligenceEngine.implementation.no_autonomous_filing,true);
  assert.equal(consequential.rules.runRecordRequired,true);

  const general=buildAgentPlan("Напиши ми кратка деловна порака.");
  assert.equal(general.legalIntelligenceEngine.mission_profile.id,"GENERAL_BYPASS");
  assert.equal(general.legalIntelligenceEngine.engaged,false);
});


test("OpenAI usage extraction is explicit and bounded",()=>{
  assert.deepEqual(extractOpenAIUsage({usage:{input_tokens:120,output_tokens:30,total_tokens:150}}),{
    inputTokens:120,outputTokens:30,totalTokens:150
  });
});

test("structured legal postflight revises once and then passes",async()=>{
  const originalFetch=globalThis.fetch;
  const responses=[
    {
      status:"completed",
      output_text:JSON.stringify({
        verdict:"REVISE",stress_test:"PASS",adversarial_review:"PASS",
        source_integrity:"VERIFIED",temporal_integrity:"NOT_REQUIRED",
        jurisdiction_integrity:"VERIFIED",human_gate:"REQUIRED",
        issues:["remove execution overclaim"],corrected_answer:"Безбедна правна верзија."
      }),
      usage:{input_tokens:100,output_tokens:40,total_tokens:140}
    },
    {
      status:"completed",
      output_text:JSON.stringify({
        verdict:"PASS",stress_test:"PASS",adversarial_review:"PASS",
        source_integrity:"VERIFIED",temporal_integrity:"NOT_REQUIRED",
        jurisdiction_integrity:"VERIFIED",human_gate:"REQUIRED",
        issues:[],corrected_answer:"Безбедна правна верзија."
      }),
      usage:{input_tokens:80,output_tokens:20,total_tokens:100}
    }
  ];
  let i=0;
  globalThis.fetch=async()=>new Response(JSON.stringify(responses[i++]),{status:200,headers:{"content-type":"application/json"}});
  try{
    const plan=buildAgentPlan("Спореди ги опциите и процесниот ризик за жалба.");
    const verdict=await runLegalPostflightVerifier({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test"
    },{
      plan,
      draft:"Нацрт што треба да се поправи.",
      corpusContext:[{source:"official",locator:"чл. 1",version:"v1",text:"test"}],
      webSources:[],
      maxAttempts:2
    });
    assert.equal(verdict.ok,true);
    assert.equal(verdict.verdict,"PASS");
    assert.equal(verdict.attempts,2);
    assert.equal(verdict.firstPass,false);
    assert.equal(verdict.corrected_answer,"Безбедна правна верзија.");
    assert.equal(verdict.usage.totalTokens,240);
  }finally{
    globalThis.fetch=originalFetch;
  }
});


test("single-pass legal postflight may release verifier-corrected text only as REVISE provisional",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    status:"completed",
    output_text:JSON.stringify({
      verdict:"REVISE",stress_test:"PASS",adversarial_review:"PASS",
      source_integrity:"VERIFIED",temporal_integrity:"NOT_REQUIRED",
      jurisdiction_integrity:"VERIFIED",human_gate:"REQUIRED",
      issues:["keep Human Gate warning"],corrected_answer:"Коригиран нацрт само за човечка проверка."
    }),
    usage:{input_tokens:60,output_tokens:25,total_tokens:85}
  }),{status:200,headers:{"content-type":"application/json"}});
  try{
    const plan=buildAgentPlan("Подготви тужба за развод со placeholders.");
    const verdict=await runLegalPostflightVerifier({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test"
    },{
      plan,
      draft:"Нацрт.",
      corpusContext:[],
      webSources:[],
      maxAttempts:1
    });
    assert.equal(verdict.ok,true);
    assert.equal(verdict.verdict,"REVISE");
    assert.equal(verdict.provisionalRevision,true);
    assert.equal(verdict.attempts,1);
    assert.equal(verdict.corrected_answer,"Коригиран нацрт само за човечка проверка.");
  }finally{
    globalThis.fetch=originalFetch;
  }
});



test("postflight PASS is compact and preserves the original draft without echoing it",async()=>{
  const originalFetch=globalThis.fetch;
  let captured=null;
  globalThis.fetch=async(_url,options)=>{
    captured=JSON.parse(options.body);
    return new Response(JSON.stringify({
      status:"completed",
      output_text:JSON.stringify({
        verdict:"PASS",stress_test:"PASS",adversarial_review:"PASS",
        source_integrity:"PARTIAL",temporal_integrity:"PARTIAL",
        jurisdiction_integrity:"PARTIAL",human_gate:"REQUIRED",
        issues:[],corrected_answer:""
      }),
      usage:{input_tokens:40,output_tokens:12,total_tokens:52}
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  try{
    const plan=buildAgentPlan("Подготви тужба за развод со placeholders.");
    const original="Оригинален проверен нацрт што мора да се зачува.";
    const verdict=await runLegalPostflightVerifier({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test"
    },{plan,draft:original,corpusContext:[],webSources:[],maxAttempts:1});
    assert.equal(verdict.ok,true);
    assert.equal(verdict.verdict,"PASS");
    assert.equal(verdict.corrected_answer,original);
    assert.equal(captured.max_output_tokens,2400);
    assert.match(captured.instructions,/set corrected_answer to the empty string/);
    assert.match(captured.instructions,/do not FAIL solely because the source set is incomplete/);
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test("postflight incomplete response preserves provider reason for diagnosis",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    status:"incomplete",
    incomplete_details:{reason:"max_output_tokens"},
    usage:{input_tokens:50,output_tokens:2000,total_tokens:2050}
  }),{status:200,headers:{"content-type":"application/json"}});
  try{
    const plan=buildAgentPlan("Спореди ги опциите и процесниот ризик за жалба.");
    const verdict=await runLegalPostflightVerifier({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test"
    },{plan,draft:"Нацрт.",corpusContext:[],webSources:[],maxAttempts:1});
    assert.equal(verdict.ok,false);
    assert.equal(verdict.error,"legal_postflight_incomplete");
    assert.equal(verdict.detail,"max_output_tokens");
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test("structured legal postflight fails closed after verifier FAIL",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    status:"completed",
    output_text:JSON.stringify({
      verdict:"FAIL",stress_test:"FAIL",adversarial_review:"FAIL",
      source_integrity:"FAILED",temporal_integrity:"FAILED",
      jurisdiction_integrity:"PARTIAL",human_gate:"MISSING_OR_UNAPPROVED",
      issues:["insufficient authority"],corrected_answer:""
    }),
    usage:{input_tokens:50,output_tokens:10,total_tokens:60}
  }),{status:200,headers:{"content-type":"application/json"}});
  try{
    const plan=buildAgentPlan("Што вели важечкото македонско право денес?");
    const verdict=await runLegalPostflightVerifier({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test"
    },{plan,draft:"Непотврдено тврдење.",corpusContext:[],webSources:[]});
    assert.equal(verdict.ok,false);
    assert.equal(verdict.error,"legal_postflight_failed");
    assert.equal(verdict.attempts,1);
  }finally{
    globalThis.fetch=originalFetch;
  }
});


test("L0 and L1 do not fan out to bounded specialist executions",()=>{
  const light=buildAgentPlan("Каде е водичот за наследство?",{preferCorpus:true});
  assert.equal(specialistExecutionRequired(light),false);
  const research=buildAgentPlan("Што вели важечкото македонско право денес?");
  assert.equal(research.legalIntelligenceEngine.mission_profile.id,"L1_VERIFIED_RESEARCH");
  assert.equal(specialistExecutionRequired(research),false);
});

test("L2-L4 selectively execute bounded specialists in parallel and aggregate usage",async()=>{
  const originalFetch=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(_url,options)=>{
    const body=JSON.parse(options.body);
    calls.push(body);
    return new Response(JSON.stringify({
      status:"completed",
      output_text:"BOUND_SPECIALIST_FINDING",
      output:[],
      usage:{input_tokens:20,output_tokens:10,total_tokens:30}
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  try{
    const plan=buildAgentPlan("Спореди македонско право со EU право и пракса на ЕСЧП.");
    assert.equal(plan.legalIntelligenceEngine.mission_profile.id,"L2_STRATEGY_PROCEDURE");
    assert.equal(specialistExecutionRequired(plan),true);
    const stage=await runBoundedSpecialists({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test",
      LIOE_SPECIALIST_EXECUTION_ENABLED:"true"
    },{
      plan,
      input:"Спореди македонско право со EU право и пракса на ЕСЧП.",
      corpusContext:[{source:"governed",locator:"x",version:"v",text:"source"}],
      webSearchEnabled:false
    });
    assert.equal(stage.ok,true);
    assert.equal(stage.executed,true);
    assert.ok(stage.findings.length>=3);
    assert.ok(stage.findings.length<=4);
    assert.equal(stage.providerCalls,stage.findings.length);
    assert.equal(stage.usage.totalTokens,30*stage.findings.length);
    assert.equal(calls.length,stage.findings.length);
    assert.ok(calls.every(x=>x.store===false));
    assert.ok(calls.every(x=>x.reasoning?.effort==="low"));
    assert.ok(calls.every(x=>x.max_output_tokens===500));
  }finally{
    globalThis.fetch=originalFetch;
  }
});

test("L2-L4 specialist stage fails closed when its runtime gate is locked",async()=>{
  const plan=buildAgentPlan("Спореди две правни опции за жалба и нивните ризици.");
  const stage=await runBoundedSpecialists({
    OPENAI_ORCHESTRATOR_ENABLED:"true",
    OPENAI_API_KEY:"x".repeat(40),
    OPENAI_MODEL:"gpt-test",
    LIOE_SPECIALIST_EXECUTION_ENABLED:"false"
  },{plan,input:"x"});
  assert.equal(stage.ok,false);
  assert.equal(stage.error,"lioe_specialist_execution_locked");
  assert.equal(stage.providerCalls,0);
});

test("bounded specialist failure is visible and fail-closed",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:"provider"}}),{status:500,headers:{"content-type":"application/json"}});
  try{
    const plan=buildAgentPlan("Спореди македонско право со EU право.");
    const stage=await runBoundedSpecialists({
      OPENAI_ORCHESTRATOR_ENABLED:"true",
      OPENAI_API_KEY:"x".repeat(40),
      OPENAI_MODEL:"gpt-test",
      LIOE_SPECIALIST_EXECUTION_ENABLED:"true"
    },{plan,input:"x"});
    assert.equal(stage.ok,false);
    assert.equal(stage.error,"specialist_response_error");
    assert.ok(stage.providerCalls>=1);
  }finally{
    globalThis.fetch=originalFetch;
  }
});


test("L3 pleading draft uses one bounded MK specialist with hardened completion budget",()=>{
  const plan=buildAgentPlan("Подготви нацрт тужба за развод со измислени странки и Human Gate.");
  assert.equal(plan.legalIntelligenceEngine.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.deepEqual(plan.agents,[AGENT_ROLES.mk.id]);
  assert.equal(specialistExecutionRequired(plan),true);
  assert.match(agentSource,/Use at most 90 words and at most 5 short bullets/);
  assert.match(agentSource,/max_output_tokens:highDepthGovernance \? 700 : 500/);
  assert.match(agentSource,/incomplete_details\?\.reason/);
  assert.match(agentSource,/failureDetail/);
});

test("natural Macedonian legal-domain prompts never bypass legal governance",()=>{
  const prompts=[
    "Имав тешка сообраќајна незгода, кои се опциите и ризиците?",
    "Ме товарат за кражба, што треба да проверам?",
    "Кај мене најдоа дрога и спорен е претресот.",
    "Имам оставинска постапка за куќа и плац.",
    "Добив прекршочна одлука и сакам жалба.",
    "Работодавачот ми даде отказ.",
    "Имам спор за сопственост и меѓа.",
    "Сакам медијација за деловен спор.",
    "Објавија клевета и навреда за мене.",
    "Барам слободен пристап до информации од јавен карактер.",
    "Кога почнува да се применува ЗПП 151/2026?"
  ];
  for(const prompt of prompts){
    const plan=buildAgentPlan(prompt);
    assert.notEqual(plan.mode,ORCHESTRATOR_MODES.GENERAL,prompt);
    assert.notEqual(plan.legalIntelligenceEngine.mission_profile.id,"GENERAL_BYPASS",prompt);
    assert.ok(plan.agents.includes("macedonian_law"),prompt);
  }
});


test("postflight REVISE is explicitly bounded for synchronous production latency",()=>{
  assert.match(agentSource,/normally no more than 800 words/);
  assert.match(agentSource,/maxItems:6/);
  assert.match(agentSource,/must not repeat long evidence lists or source metadata/);
});
