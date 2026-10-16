import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openAIOrchestratorConfigured, orchestratorRuntimeReadiness } from "../src/agent-orchestrator.js";
import {
  WORKERS_AI_TEXT_MODEL_DEFAULT,
  workersAIRequestOptions,
  extractWorkersAIText,
  runWorkersAIText
} from "../src/workers-ai-provider.js";

const wrangler=fs.readFileSync("wrangler.jsonc","utf8");
const r2Wrangler=fs.readFileSync("wrangler.r2.jsonc","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const workflow=fs.readFileSync(".github/workflows/gpt-production-activation.yml","utf8");
const manifest=JSON.parse(fs.readFileSync("data/agent-architecture-v2.json","utf8"));
const activationRequest=JSON.parse(fs.readFileSync(".github/activation/gpt-production-request.json","utf8"));
const architecturePage=fs.readFileSync("agent-architecture.html","utf8");

test("GPTACT1 production runtime is armed for the approved model but contains no API secret",()=>{
  const config=JSON.parse(wrangler);
  assert.equal(config.vars.OPENAI_MODEL,"gpt-6.1-sol");
  assert.equal(config.vars.OPENAI_REASONING_EFFORT,"medium");
  assert.equal(config.vars.OPENAI_ORCHESTRATOR_ENABLED,"true");
  assert.equal(config.vars.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED,"true");
  assert.equal(config.vars.OPENAI_FILE_INPUT_ENABLED,"true");
  assert.equal(config.vars.OPENAI_PROVIDER_ACTIVATION_STATE,"governed_openai_primary_workers_ai_fallback");
  assert.equal(config.ai?.binding,"AI");
  assert.equal(config.vars.FREE_CHAT_PROVIDER,"workers_ai");
  assert.equal(config.vars.WORKERS_AI_MARKDOWN_ENABLED,"true");
  assert.equal(config.vars.WORKERS_AI_CHAT_MODEL,"@cf/openai/gpt-oss-20b");
  assert.doesNotMatch(wrangler,/OPENAI_API_KEY/);
  assert.doesNotMatch(wrangler,/sk-[A-Za-z0-9_-]{20,}/);
});

test("GPTACT2 provider remains fail-closed without secret and opens only with gate + secret + model",()=>{
  const armedOnly={
    OPENAI_ORCHESTRATOR_ENABLED:"true",
    OPENAI_MODEL:"gpt-6.1-sol",
    OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED:"true",
    OPENAI_FILE_INPUT_ENABLED:"true"
  };
  assert.equal(openAIOrchestratorConfigured(armedOnly),false);
  assert.equal(orchestratorRuntimeReadiness(armedOnly).provider,"locked");
  const ready={...armedOnly,OPENAI_API_KEY:"x".repeat(40)};
  assert.equal(openAIOrchestratorConfigured(ready),true);
  assert.equal(orchestratorRuntimeReadiness(ready).provider,"configured");
  assert.equal(orchestratorRuntimeReadiness(ready).externalResearchTools,"configured");
  assert.equal(orchestratorRuntimeReadiness(ready).fileInputs,"configured");
});

test("GPTACT3 production activation uses governed OpenAI primary with Workers AI fallback",()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.match(workflow,/push:/);
  assert.match(workflow,/gpt-production-request\.json/);
  assert.match(workflow,/ACTIVATE_GPT_6_1_SOL/);
  assert.match(workflow,/secrets\.OPENAI_API_KEY/);
  assert.match(workflow,/Verify paid quota with a minimal Responses API preflight/);
  assert.match(workflow,/PREFLIGHT_OK/);
  assert.match(workflow,/\/v1\/responses/);
  assert.match(workflow,/secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow,/wrangler secret put OPENAI_API_KEY/);
  assert.match(workflow,/wrangler deploy --config wrangler\.jsonc/);
  assert.match(workflow,/Live GPT \+ Web \+ attachment smoke test/);
  assert.doesNotMatch(workflow,/Live FREE Workers AI multi-scenario runtime UAT \+ DOCX smoke/);
  assert.match(workflow,/FREE_PROVIDER/);
  assert.match(workflow,/WORKERS_AI_MARKDOWN_ENABLED/);
  assert.match(workflow,/gpt-combined-smoke\.json/);
  assert.match(workflow,/gpt-combined-smoke\.json/);
  assert.match(workflow,/sources/);
});

test("GPTACT4 chat privacy is stateless at OpenAI and session-scoped in the browser",()=>{
  assert.match(orchestrator,/store:false/);
  assert.doesNotMatch(orchestrator,/\/v1\/conversations/);
  assert.match(orchestrator,/SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY/);
  assert.match(worker,/validateChatHistory/);
  assert.match(chat,/sessionStorage/);
  assert.match(chat,/history:historyForApi/);
  assert.doesNotMatch(chat,/conversationId/);
});

test("GPTACT5 public chat routes to Worker and runtime status can report live provider",()=>{
  assert.match(chat,/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
  assert.match(chat,/configured_for_api_chat_execution/);
  assert.match(chat,/configured_for_free_workers_ai_chat_execution/);
  assert.match(worker,/configured_for_api_chat_execution/);
  assert.match(worker,/configured_for_free_workers_ai_chat_execution/);
  assert.match(worker,/env\.AI\.toMarkdown/);
  assert.match(worker,/openai_live_governed_free_quota_plus_paid_membership/);
  assert.match(worker,/freeChatModel:freeWorkersAIConfigured\(env\)/);
  assert.match(worker,/paidChatModel:orchestratorRuntimeReadiness\(env\)\.provider==="configured"/);
});

test("GPTACT6 governance registry records explicit activation authorization while remaining not-live until preflight and smoke pass",()=>{
  assert.equal(manifest.current_runtime.state,"gpt_activation_authorized_pending_secret_and_paid_quota_preflight");
  assert.equal(manifest.current_runtime.public_provider_activation,false);
  assert.equal(manifest.production_activation_request.authorization,"explicit");
  assert.equal(manifest.production_activation_request.evidence_text,"ајде да го активираме гпт ботот");
  assert.equal(manifest.model_selection.activation_progress.production_activation_authorized,true);
  assert.equal(manifest.model_selection.activation_progress.orchestrator_flag_armed,true);
  assert.equal(manifest.model_selection.activation_progress.web_search_flag_armed,true);
  assert.equal(manifest.model_selection.activation_progress.attachment_input_flag_armed,true);
  assert.equal(manifest.model_selection.activation_progress.production_provider_live,false);
  assert.equal(manifest.product_experience.backend_contract.responses_store,false);
  assert.equal(manifest.product_experience.backend_contract.conversations_api,false);
});


test("GPTACT7 activation request is explicit, model-bound and contains no secret",()=>{
  assert.equal(activationRequest.decision_id,"AI_ADVOKAT_GPT_PRODUCTION_ACTIVATION_2026-10-04");
  assert.equal(activationRequest.activation_authorized,true);
  assert.equal(activationRequest.model,"gpt-6.1-sol");
  assert.equal(activationRequest.runtime_features.web_search,true);
  assert.equal(activationRequest.runtime_features.attachment_input,true);
  assert.doesNotMatch(JSON.stringify(activationRequest),/sk-[A-Za-z0-9_-]{20,}/);
});


test("GPTACT8 production legal UAT uses an ephemeral synthetic membership and always cleans it",()=>{
  assert.match(workflow,/Provision ephemeral synthetic UAT membership/);
  assert.match(workflow,/AI Advokat Synthetic UAT/);
  assert.match(workflow,/'office','active','manual',50,1,0/);
  assert.match(workflow,/::add-mask::\$UAT_KEY/);
  assert.match(workflow,/AI_ADVOCAT_UAT_MEMBERSHIP_KEY=\$UAT_KEY/);
  assert.match(workflow,/Cleanup ephemeral synthetic UAT membership/);
  assert.match(workflow,/if: always\(\)/);
  assert.match(workflow,/DELETE FROM membership_access_keys WHERE account_id/);
  assert.match(workflow,/DELETE FROM membership_entitlements WHERE account_id/);
  assert.match(workflow,/DELETE FROM membership_usage_monthly WHERE subject_key/);
  assert.match(workflow,/DELETE FROM security_rate_limit_windows WHERE subject_key/);
  assert.doesNotMatch(workflow,/echo\s+["']?\$UAT_KEY["']?\s*$/m);
});


test("GPTACT7 architecture status is evidence-backed by the production runtime and never statically claims LIVE",()=>{
  assert.match(architecturePage,/\/api\/orchestrator/);
  assert.match(architecturePage,/providerExecution===["']configured_for_api_chat_execution["']/);
  assert.match(architecturePage,/SPECIALISTS · LIVE/);
  assert.match(architecturePage,/HUMAN GATE · REQUIRED/);
  assert.match(architecturePage,/STATUS UNKNOWN/);
  assert.match(architecturePage,/не прикажува LIVE без доказ/);
});


test("GPTACT9 GPT activation preserves the separately authorized CasePilot private-storage Human Gate",()=>{
  assert.match(workflow,/Preserve authorized CasePilot private-storage Human Gate/);
  assert.match(workflow,/case-intelligence-e2e-production-request\.json/);
  assert.match(workflow,/private_object_storage_activation_authorized/);
  assert.match(workflow,/private_document_upload_authorized/);
  assert.match(workflow,/private_case_ai_execution_authorized/);
  assert.match(workflow,/autonomous filing remains forbidden/);
  assert.match(wrangler,/"CASE_D1_FALLBACK_ENABLED": "true"/);
  assert.doesNotMatch(wrangler,/"r2_buckets"/);
  assert.match(r2Wrangler,/"binding": "CASE_FILES"/);
  assert.match(r2Wrangler,/"r2_buckets"/);
  assert.doesNotMatch(workflow,/wrangler r2 bucket create/);
});

test("GPTACT10 provider readiness requires governed OpenAI while retaining Workers AI fallback capability",()=>{
  assert.match(worker,/configured_for_free_workers_ai_chat_execution/);
  assert.match(worker,/configured_workers_ai_markdown_conversion/);
  assert.match(workflow,/configured_for_api_chat_execution/);
  assert.match(workflow,/externalResearchTools/);
  assert.match(workflow,/fileInputs/);
});


test("GPTACT11 Workers AI remains explicit, bounded and available only as fallback",()=>{
  const config=JSON.parse(wrangler);
  assert.equal(config.ai.binding,"AI");
  assert.equal(config.vars.FREE_CHAT_PROVIDER,"workers_ai");
  assert.match(worker,/freeWorkersAIConfigured/);
  assert.match(worker,/convertFreeChatAttachments/);
  assert.match(worker,/cloudflare_workers_ai_to_markdown/);
  assert.match(worker,/FREE_RESEARCH_ONLY_HUMAN_GATE_REQUIRED/);
  assert.match(worker,/workers-ai-provider\.js/);
  assert.match(wrangler,/"WORKERS_AI_CHAT_MODEL": "@cf\/openai\/gpt-oss-20b"/);
  assert.doesNotMatch(workflow,/Live FREE Workers AI multi-scenario runtime UAT/);
  assert.doesNotMatch(worker,/error:"free_mode_professional_postflight_required"/);
  assert.match(worker,/FREE provider output is a working research\/draft result only/);
});


test("GPTACT12 fallback document prompt still treats extracted body as content and exact tokens stay exact",()=>{
  assert.match(worker,/ATTACHED DOCUMENT TEXT is extracted document-body content/);
  assert.match(worker,/copy it exactly before adding interpretation/);
  assert.match(workflow,/PRAVDA/);
  assert.doesNotMatch(workflow,/PRAVDA_FREE_DOC/);
});


test("GPTACT13 unified Workers AI provider contract uses one configured production model",()=>{
  assert.equal(WORKERS_AI_TEXT_MODEL_DEFAULT,"@cf/openai/gpt-oss-20b");
  const options=workersAIRequestOptions({
    model:WORKERS_AI_TEXT_MODEL_DEFAULT,
    messages:[{role:"user",content:"test"}],
    maxOutputTokens:900,
    temperature:0.1
  });
  assert.deepEqual(options.input,[{role:"user",content:"test"}]);
  assert.equal(options.max_output_tokens,900);
  assert.deepEqual(options.reasoning,{effort:"low"});
  assert.equal(options.max_tokens,undefined);
  assert.equal(options.temperature,undefined);
  assert.equal(options.max_completion_tokens,undefined);
  assert.equal(options.chat_template_kwargs,undefined);
});

test("GPTACT14 Workers AI response extraction accepts only final answer shapes and never reasoning items",()=>{
  assert.equal(extractWorkersAIText({response:"Здраво"}),"Здраво");
  assert.equal(extractWorkersAIText({choices:[{message:{content:"Одговор"}}]}),"Одговор");
  assert.equal(extractWorkersAIText({
    output:[
      {type:"reasoning",content:[{type:"summary_text",text:"Need answer in Macedonian"}]},
      {type:"message",content:[{type:"output_text",text:"AI Advokat работи."}]}
    ]
  }),"AI Advokat работи.");
  assert.equal(extractWorkersAIText({type:"reasoning",content:"hidden only"}),null);
  assert.equal(extractWorkersAIText({type:"summary_text",text:"hidden summary"}),null);
  assert.equal(extractWorkersAIText({response:"   ",reasoning:"hidden"}),null);
});

test("GPTACT15 Workers AI provider contract fails explicitly on empty final output",async()=>{
  const env={
    WORKERS_AI_CHAT_MODEL:"@cf/openai/gpt-oss-20b",
    AI:{run:async()=>({response:"",usage:{prompt_tokens:10,completion_tokens:0}})}
  };
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"test"}],
    maxOutputTokens:400
  });
  assert.equal(result.ok,false);
  assert.equal(result.error,"workers_ai_empty_response");
  assert.equal(result.model,"@cf/openai/gpt-oss-20b");
  assert.equal(result.providerCalls,1);
  assert.equal(result.shape.type,"object");
});

test("GPTACT16 GPT-OSS provider diagnostics expose only safe completion metadata",async()=>{
  const env={
    WORKERS_AI_CHAT_MODEL:"@cf/openai/gpt-oss-20b",
    AI:{run:async()=>({
      choices:[{finish_reason:"length",message:{content:""}}],
      usage:{prompt_tokens:20,completion_tokens:400}
    })}
  };
  const result=await runWorkersAIText(env,{
    messages:[{role:"user",content:"test"}],
    maxOutputTokens:400
  });
  assert.equal(result.ok,false);
  assert.equal(result.shape.choiceFinishReason,"length");
  assert.equal(result.shape.choiceContentLength,0);
  assert.equal(result.shape.outputTokens,400);
  assert.equal("reasoning" in result.shape,false);
});


test("GPTACT17 anonymous FREE quota uses governed OpenAI when configured and Workers AI only as fallback",()=>{
  assert.match(worker,/const governedOpenAIAvailable=readiness\.provider==="configured"/);
  assert.match(worker,/&& !governedOpenAIAvailable/);
  assert.match(worker,/governed_openai_with_workers_ai_fallback/);
});


test("GPTACT19 governed OpenAI primary fails over to Workers AI without a second quota reservation",()=>{
  assert.match(worker,/OPENAI_PROVIDER_ACTIVATION_STATE==="governed_openai_primary_workers_ai_fallback"/);
  assert.match(worker,/OPENAI_TO_WORKERS_FALLBACK_ERRORS/);
  assert.match(worker,/orchestrator_precondition_failed/);
  assert.match(worker,/openAIFailureEligibleForWorkersFallback\(result,\{explicitWebRequested\}\)/);
  assert.match(worker,/if\(workersFallbackAllowed\)\{[\s\S]*?return runWorkersFallbackResponse\(/);
  assert.match(worker,/providerFallback:fallbackReason \?/);
  const chat=worker.slice(worker.indexOf("async function handleGPTChat("),worker.indexOf("async function handleAssistant("));
  const failure=chat.indexOf("if(!result.ok){");
  const fallback=chat.indexOf("if(workersFallbackAllowed)",failure);
  const release=chat.indexOf("await releaseMonthlyQuota(env,{subject,period});",failure);
  assert.ok(failure>0 && fallback>failure && release>fallback,"fallback must run before releasing the single reserved user quota");
  assert.equal((chat.match(/reserveMonthlyQuota\(env,\{subject,period,quota\}\)/g)||[]).length,1,"chat turn must reserve monthly quota exactly once");
});

test("GPTACT20 explicit Web requests fail closed instead of silently downgrading to no-Web fallback",()=>{
  assert.match(worker,/if\(explicitWebRequested===true\) return false/);
});


test("GPTACT21 successful governed and fallback responses expose truthful provider provenance",()=>{
  assert.match(worker,/answer:governedFinalAnswer,[\s\S]*?provider:"openai",[\s\S]*?providerFallback:null,[\s\S]*?model:result\.model/);
  assert.match(worker,/provider:"workers_ai_free",[\s\S]*?providerFallback:fallbackReason \?/);
});
