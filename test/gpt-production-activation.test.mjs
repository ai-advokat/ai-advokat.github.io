import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { openAIOrchestratorConfigured, orchestratorRuntimeReadiness } from "../src/agent-orchestrator.js";

const wrangler=fs.readFileSync("wrangler.jsonc","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const workflow=fs.readFileSync(".github/workflows/gpt-production-activation.yml","utf8");
const manifest=JSON.parse(fs.readFileSync("data/agent-architecture-v2.json","utf8"));
const activationRequest=JSON.parse(fs.readFileSync(".github/activation/gpt-production-request.json","utf8"));

test("GPTACT1 production runtime is armed for the approved model but contains no API secret",()=>{
  const config=JSON.parse(wrangler);
  assert.equal(config.vars.OPENAI_MODEL,"gpt-6.1-sol");
  assert.equal(config.vars.OPENAI_REASONING_EFFORT,"medium");
  assert.equal(config.vars.OPENAI_ORCHESTRATOR_ENABLED,"true");
  assert.equal(config.vars.OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED,"true");
  assert.equal(config.vars.OPENAI_FILE_INPUT_ENABLED,"true");
  assert.equal(config.vars.OPENAI_PROVIDER_ACTIVATION_STATE,"armed_secret_and_billing_required");
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

test("GPTACT3 production activation workflow requires explicit authorization, secrets and a real paid-quota preflight",()=>{
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
  assert.match(worker,/configured_for_api_chat_execution/);
  assert.match(worker,/gpt_6_1_sol_live_governed/);
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
