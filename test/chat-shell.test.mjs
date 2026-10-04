import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AGENT_ROLES,
  ORCHESTRATOR_MODES,
  buildAgentPlan,
  orchestratorRuntimeReadiness
} from "../src/agent-orchestrator.js";

const html=fs.readFileSync("index.html","utf8");
const chatJs=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const chatCss=fs.readFileSync("assets/ai-advokat-chat.css","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const wrangler=fs.readFileSync("wrangler.jsonc","utf8");
const manifest=JSON.parse(fs.readFileSync("data/agent-architecture-v2.json","utf8"));

test("CHAT1 homepage exposes one primary AI Advokat conversation workspace",()=>{
  assert.match(html,/id="ai-advokat-chat"/);
  assert.match(html,/id="aiAdvokatChat"/);
  assert.match(html,/Разговарајте со AI Advokat/);
  assert.match(html,/assets\/ai-advokat-chat\.css/);
  assert.match(html,/assets\/ai-advokat-chat\.js/);
});

test("CHAT2 modern assistant controls exist without copying third-party branding",()=>{
  for(const id of [
    "aiChatNew","aiChatHistory","aiChatAttach","aiChatFiles","aiChatMic",
    "aiChatInput","aiChatSend","aiChatStop","aiChatExport"
  ]) assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/data-chat-mode="auto"/);
  assert.match(html,/data-chat-mode="library"/);
  assert.match(html,/data-chat-mode="web"/);
  assert.doesNotMatch(html,/ChatGPT logo|OpenAI logo/i);
  assert.match(chatCss,/\.ai-chat-wrap/);
});

test("CHAT3 chat shell keeps current-session history and offers copy, retry and export",()=>{
  assert.match(chatJs,/sessionStorage/);
  assert.match(chatJs,/Копирај/);
  assert.match(chatJs,/Повтори/);
  assert.match(chatJs,/AI-Advokat-razgovor\.txt/);
  assert.match(chatJs,/AbortController/);
});

test("CHAT4 citizen guide routing stays first and clickable",()=>{
  assert.match(chatJs,/guideMatches\(q\)/);
  assert.match(chatJs,/guideIds:guides\.map/);
  assert.match(chatJs,/Отвори →/);
  assert.match(chatJs,/AIAdvokatGuideRouter/);
});

test("CHAT5 attachment UX supports text, image and file payloads but remains privacy-gated",()=>{
  assert.match(html,/accept="\.pdf,\.doc,\.docx,\.txt,\.md,\.csv,\.json,\.png,\.jpg,\.jpeg,\.webp"/);
  assert.match(chatJs,/kind:"image"/);
  assert.match(chatJs,/kind:"file"/);
  assert.match(chatJs,/kind:"text"/);
  assert.match(worker,/OPENAI_FILE_INPUT_ENABLED/);
  assert.match(worker,/attachment_processing_locked/);
  assert.equal(manifest.product_experience.current_activation.attachment_provider_processing,false);
});

test("CHAT6 web mode exists but built-in web search remains a separate runtime gate",()=>{
  assert.match(chatJs,/mode==="web"|activeMode\(\)==="web"/);
  assert.match(worker,/OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED/);
  assert.match(worker,/web_search_locked/);
  assert.equal(manifest.product_experience.current_activation.web_search,false);
});

test("CHAT7 backend exposes GPT chat endpoint through governed orchestrator",()=>{
  assert.match(worker,/\/api\/chat/);
  assert.match(worker,/handleGPTChat/);
  assert.match(worker,/runOpenAIOrchestrator/);
  assert.match(worker,/governedGuideContext/);
  assert.match(worker,/reserveMonthlyQuota/);
  assert.match(worker,/releaseMonthlyQuota/);
});

test("CHAT8 GPT provider remains fail-closed until server-side activation",()=>{
  const readiness=orchestratorRuntimeReadiness({OPENAI_MODEL:"gpt-6.1-sol"});
  assert.equal(readiness.provider,"locked");
  assert.match(worker,/gpt_provider_locked/);
  assert.match(wrangler,/"OPENAI_MODEL"\s*:\s*"gpt-6\.1-sol"/);
  assert.doesNotMatch(wrangler,/OPENAI_API_KEY/);
  assert.match(wrangler,/"OPENAI_ORCHESTRATOR_ENABLED"\s*:\s*"true"/);
  assert.match(wrangler,/"OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED"\s*:\s*"true"/);
  assert.match(wrangler,/"OPENAI_FILE_INPUT_ENABLED"\s*:\s*"true"/);
  assert.equal(manifest.current_runtime.public_provider_activation,false);
});

test("CHAT9 non-legal tasks route to general GPT while legal tasks remain source-governed",()=>{
  const general=buildAgentPlan("Напиши ми краток поздрав за колега.");
  assert.equal(general.mode,ORCHESTRATOR_MODES.GENERAL);
  assert.deepEqual(general.agents,[AGENT_ROLES.general.id]);

  const legal=buildAgentPlan("Кој е рокот за жалба против управно решение?");
  assert.equal(legal.mode,ORCHESTRATOR_MODES.PROACTIVE_RESEARCH);
  assert.ok(legal.agents.includes(AGENT_ROLES.mk.id));
});

test("CHAT10 product manifest documents the intended one-assistant GPT background architecture",()=>{
  assert.equal(manifest.product_experience.backend_contract.endpoint,"/api/chat");
  assert.equal(manifest.product_experience.backend_contract.target_model,"gpt-6.1-sol");
  assert.equal(manifest.product_experience.backend_contract.native_corpus_first,true);
  assert.equal(manifest.product_experience.backend_contract.general_gpt_fallback,true);
  assert.equal(manifest.product_experience.current_activation.provider_execution,false);
});


test("CHAT11 session privacy uses store:false and never creates a durable OpenAI Conversation object",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/store:false/);
  assert.match(orchestrator,/SESSION_HISTORY_CONTEXT_ONLY_NOT_AUTHORITY/);
  assert.doesNotMatch(orchestrator,/\/v1\/conversations/);
  assert.match(chatJs,/history:historyForApi/);
  assert.doesNotMatch(chatJs,/conversationId/);
  assert.equal(manifest.product_experience.backend_contract.conversations_api,false);
  assert.equal(manifest.product_experience.backend_contract.responses_store,false);
});

test("CHAT12 GitHub Pages chat calls the Cloudflare Worker API, not the static origin",()=>{
  assert.match(chatJs,/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
  assert.match(chatJs,/CHAT_API_BASE\+"\/api\/chat"/);
  assert.match(chatJs,/CHAT_API_BASE\+"\/api\/assistant"/);
});


test("CHAT13 web citations are surfaced as clickable safe links",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/extractOpenAIWebCitations/);
  assert.match(orchestrator,/tool_choice:"required"/);
  assert.match(worker,/sources:result\.sources/);
  assert.match(chatJs,/Web извори/);
  assert.match(chatJs,/safeHttpUrl/);
  assert.match(chatJs,/rel="noopener noreferrer"/);
});

test("CHAT14 file inputs use OpenAI Responses data URI format and server MIME allowlist",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/file_data:\x60data:\$\{mime\};base64,/);
  assert.match(worker,/CHAT_ALLOWED_FILE_MIME/);
  assert.match(worker,/unsupported_file_type/);
});
