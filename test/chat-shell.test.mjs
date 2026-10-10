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
const guideVaultJs=fs.readFileSync("assets/guide-vault.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const wrangler=fs.readFileSync("wrangler.jsonc","utf8");
const manifest=JSON.parse(fs.readFileSync("data/agent-architecture-v2.json","utf8"));

test("CHAT1 homepage exposes one primary AI Advokat conversation workspace",()=>{
  assert.match(html,/id="ai-advokat-chat"/);
  assert.match(html,/id="aiAdvokatChat"/);
  assert.match(html,/Опишете го правниот проблем со свои зборови/);
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


test("CHAT15 GPT workspace bridges governed article-level corpus before synthesis",()=>{
  assert.match(worker,/governedArticleContext/);
  assert.match(worker,/findRelevantArticles\(env,routing\.key,q,5/);
  assert.match(worker,/ai_advokat_article_corpus_first/);
  assert.match(worker,/legalSources:articleBundle\.legalSources/);
  assert.match(worker,/Human Gate/);
  assert.match(chatJs,/Правни извори/);
  assert.match(chatJs,/ai_advokat_article_corpus_first/);
});

test("CHAT16 explicit Web mode is labelled as external research, not passive corpus",()=>{
  assert.match(worker,/displayMode:result\.webSearchUsed===true \? "external_web_research"/);
  assert.match(worker,/external_web_research/);
  assert.match(chatJs,/External legal research · Web извори/);
});

test("CHAT17 chat latency optimisations preserve governed routing",()=>{
  assert.match(chatJs,/Promise\.all\(\[guidePromise,encodePromise\]\)/);
  assert.match(chatJs,/\.slice\(-8\)/);
  assert.match(worker,/const fastGeneral=/);
  assert.match(worker,/missionProfile==="L4_LEGAL_TRUTH_GOVERNANCE"/);
  assert.match(worker,/const consequentialLegal=/);
  assert.match(worker,/const lightweightLegal=/);
  assert.match(worker,/maxOutputTokens=fastGeneral \? 700/);
  assert.match(worker,/missionProfile==="L4_LEGAL_TRUTH_GOVERNANCE" \? 3200/);
  assert.match(worker,/missionProfile==="L3_CONSEQUENTIAL" \? 2800/);
  assert.match(worker,/missionProfile==="L2_STRATEGY_PROCEDURE" \? 2400/);
  assert.match(worker,/lightweightLegal \? 2000/);
  assert.match(worker,/Promise\.all\(\[/);
});

test("CHAT18 production UI status is readiness-driven rather than statically claiming LIVE",()=>{
  assert.match(html,/GPT-6\.1 Sol · проверка на runtime/);
  assert.match(html,/GPT-6\.1 Sol во позадина/);
  assert.doesNotMatch(html,/id="aiChatProvider">GPT-6\.1 Sol · LIVE governed/);
  assert.doesNotMatch(html,/production provider-от ќе биде активиран/);
});


test("CHAT19 homepage exposes a private Guide Vault without public guide full-text publication",()=>{
  for(const id of ["aiGuideVaultImport","aiGuideVaultClear","aiGuideVaultFiles","aiGuideVaultStatus"]){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/assets\/guide-vault\.js/);
  assert.match(html,/Guide Vault ги чува PDF\/DOCX датотеките само на овој уред/);
  assert.match(html,/aiGuideVaultFiles[^>]+application\/pdf/);
  assert.match(guideVaultJs,/indexedDB/);
  assert.match(guideVaultJs,/Pravni_vodichi_38_63_FULL_WORD_ALL/);
});

test("CHAT20 guide documents are fingerprint-verified server-side before GPT attachment",()=>{
  assert.match(chatJs,/guideDocumentsForMatches/);
  assert.match(chatJs,/guideDocuments,/);
  assert.match(worker,/validateGuideDocuments/);
  assert.match(worker,/guide_document_fingerprint_mismatch/);
  assert.match(worker,/guideAllowedNames/);
  assert.match(worker,/guideAllowedHashes/);
  assert.match(worker,/sha256BytesHex/);
  assert.match(worker,/authorized_private_vault_secondary_context/);
});

test("CHAT21 full guides remain a separate secondary source layer under Human Gate",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/GUIDE_DOCUMENT attachments are secondary authored\/editorial guides/);
  assert.match(orchestrator,/they are not official law/);
  assert.match(worker,/LEGAL_AUTHORITY: false/);
  assert.match(worker,/ai_advokat_legal_corpus_plus_guides/);
  assert.match(worker,/ai_advokat_guides_fulltext_first/);
  assert.match(chatJs,/Прочитани водичи/);
});

test("CHAT22 guide vault preserves store:false and has no server-side guide persistence path",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/store:false/);
  assert.doesNotMatch(worker,/INSERT\s+INTO\s+.*guide/i);
  assert.doesNotMatch(worker,/UPDATE\s+.*guide/i);
  assert.match(guideVaultJs,/const DB_NAME="ai-advokat-private-guide-vault"/);
});


test("CHAT23 Private Guide Vault supports first-wave PDF guides as well as DOCX",()=>{
  assert.match(guideVaultJs,/const PDF_MIME="application\/pdf"/);
  assert.match(guideVaultJs,/importGuideBytes/);
  assert.match(worker,/GUIDE_PDF_MIME="application\/pdf"/);
  assert.match(worker,/GUIDE_ALLOWED_MIME/);
  assert.match(worker,/guide_document_mime_mismatch/);
  assert.match(html,/accept="\.zip,\.docx,\.pdf,/);
});


test("CHAT24 GPT legal corpus context expands explicit same-version article cross-references",()=>{
  assert.match(worker,/extractArticleCrossReferences/);
  assert.match(worker,/expandArticleCrossReferences/);
  assert.match(worker,/expandReferences:true/);
  assert.match(worker,/maxReferences:12/);
  assert.match(worker,/REFERENCE_ROLE:/);
  assert.match(worker,/explicit_cross_reference/);
  assert.match(worker,/legalCrossReferenceCount/);
});

test("CHAT25 legal cross-reference expansion remains one-hop and version-bound",()=>{
  assert.match(worker,/primaryArticles\.slice\(0,3\)/);
  assert.match(worker,/rowByNumber/);
  assert.match(worker,/loadResolvedCorpus/);
  assert.doesNotMatch(worker,/expandArticleCrossReferences\([^\n]*crossReferenceArticles/);
});


test("CHAT26 LIOE runtime governance is visible and fail-closed",()=>{
  assert.match(worker,/runLegalPostflightVerifier/);
  assert.match(worker,/assessLegalRuntimeRelease/);
  assert.match(worker,/persistSanitisedRuntimeRecord/);
  assert.match(worker,/lioe_observability_unavailable/);
  assert.match(worker,/LIOE_POSTFLIGHT_ENABLED/);
  assert.match(worker,/LIOE_RUNTIME_TELEMETRY_ENABLED/);
  assert.match(chatJs,/LIOE правна контрола/);
  assert.match(chatJs,/governance:d\.legalGovernance/);
  assert.match(wrangler,/"LIOE_RUNTIME_GOVERNANCE_ENABLED"\s*:\s*"true"/);
  assert.match(wrangler,/"LIOE_POSTFLIGHT_ENABLED"\s*:\s*"true"/);
  assert.match(wrangler,/"LIOE_RUNTIME_TELEMETRY_ENABLED"\s*:\s*"true"/);
  assert.match(wrangler,/"LIOE_SPECIALIST_EXECUTION_ENABLED"\s*:\s*"true"/);
});

test("CHAT27 L2-L4 observability is not bypassed when telemetry is unavailable",()=>{
  assert.match(worker,/run_record_required===true/);
  assert.match(worker,/BLOCKED_OBSERVABILITY_REQUIRED/);
  assert.match(worker,/releaseMonthlyQuota/);
});

test("CHAT28 current-law runtime exposes temporal verification and release state",()=>{
  assert.match(worker,/temporalVerificationState:runtimeAssessment\.temporalVerificationState/);
  assert.match(worker,/releaseState:runtimeAssessment\.releaseState/);
  assert.match(worker,/executionAuthorization:runtimeAssessment\.executionAuthorization/);
  assert.match(chatJs,/Human Gate \/ човечка проверка/);
});


test("CHAT29 L2-L4 use real bounded specialist execution before Chief synthesis",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(orchestrator,/runBoundedSpecialists/);
  assert.match(orchestrator,/Promise\.all\(selected\.map/);
  assert.match(orchestrator,/BOUNDED_SPECIALIST_FINDINGS/);
  assert.match(orchestrator,/LIOE_SPECIALIST_EXECUTION_ENABLED/);
  assert.match(worker,/specialistExecution:result\.specialistExecution/);
});


test("CHAT30 runtime status and network failures are fail-closed and user-visible",()=>{
  assert.match(chatJs,/const fullyReady=/);
  assert.match(chatJs,/lioeRuntimeTelemetry==="ready"/);
  assert.match(chatJs,/GPT-6\.1 Sol · LIVE governed/);
  assert.match(chatJs,/runtime partial · recovery required/);
  assert.match(chatJs,/GPT runtime · недостапен/);
  assert.match(chatJs,/Runtime\/API unavailable/);
  assert.match(chatJs,/Барањето не е обработено/);
});


test("CHAT31 synchronous LIOE path is latency-bounded without bypassing postflight",()=>{
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(worker,/maxAttempts:1/);
  assert.match(orchestrator,/highDepthGovernance \? "medium" : "low"/);
  assert.match(orchestrator,/max_output_tokens:highDepthGovernance \? 700 : 500/);
  assert.match(orchestrator,/Use at most 90 words and at most 5 short bullets/);
  assert.match(orchestrator,/slice\(0,2400\)/);
  assert.match(orchestrator,/reasoning:\{effort:profile==="L4_LEGAL_TRUTH_GOVERNANCE" \? "medium" : "low"\}/);
  assert.match(orchestrator,/postflightOutputTokens/);
  assert.match(orchestrator,/profile==="L3_CONSEQUENTIAL"/);
  assert.match(orchestrator,/corrected_answer to the empty string/);
  assert.match(orchestrator,/normally no more than 800 words/);
  assert.match(orchestrator,/do not FAIL solely because the source set is incomplete/);
  assert.match(orchestrator,/provisionalRevision:true/);
  assert.match(worker,/postflightVerdict:postflight\.verdict/);
  assert.match(worker,/postflightProvisional:postflight\.verdict==="REVISE"/);
});

test("CHAT32 pleading drafting is routed through consequential Human Gate",()=>{
  const divorce=buildAgentPlan("Подготви тужба за развод со placeholders.");
  assert.equal(divorce.legalIntelligenceEngine.mission_profile.id,"L3_CONSEQUENTIAL");
  assert.equal(divorce.legalIntelligenceEngine.authority_and_human_gate.human_review_required,true);
  assert.equal(divorce.legalIntelligenceEngine.implementation.no_autonomous_filing,true);
});


test("CHAT33 simple workspace keeps advanced controls behind compact menus",()=>{
  assert.match(html,/<details class="ai-chat-menu" id="aiChatMenu">[\s\S]*id="aiChatExport"/);
  assert.match(html,/<details class="ai-chat-tools" id="aiChatTools">[\s\S]*data-chat-mode="auto"[\s\S]*id="aiGuideVaultImport"/);
  assert.match(html,/id="aiChatModeCaption">Auto</);
  assert.doesNotMatch(html,/ai-chat-provider-note/);
  assert.match(chatCss,/\.ai-chat-tools-panel/);
  assert.match(chatCss,/\.ai-chat-menu-panel/);
  assert.match(chatJs,/toolsMenu\.open=false/);
  assert.match(chatJs,/topMenu\.open=false/);
});

test("CHAT34 primary composer stays intentionally minimal while preserving full capability",()=>{
  const composer=html.match(/<div class="ai-chat-composer">([\s\S]*?)<\/div>\s*<p class="ai-chat-hint">/)?.[1]||"";
  assert.match(composer,/id="aiChatAttach"/);
  assert.match(composer,/id="aiChatInput"/);
  assert.match(composer,/id="aiChatMic"/);
  assert.match(composer,/id="aiChatSend"/);
  assert.match(composer,/id="aiChatTools"/);
  assert.match(html,/Историјата се чува само во оваа browser сесија/);
  assert.match(html,/важните правни чекори остануваат под човечка професионална контрола/);
});


test("CHAT35 reviewed official case law is a separate governed chat layer",()=>{
  assert.match(worker,/governedCaseLawContext/);
  assert.match(worker,/OFFICIAL_REVIEWED_CASE_LAW/);
  assert.match(worker,/CASE_LAW_IS_NOT_STATUTORY_TEXT: true/);
  assert.match(worker,/s\.source_status='official'/);
  assert.match(worker,/cla\.human_review_status IN \('approved','reviewed'\)/);
  assert.match(worker,/cl\.human_review_status IN \('approved','reviewed'\)/);
  assert.match(worker,/caseLawSources:caseLawBundle\.sources/);
  assert.match(worker,/caseLawContextCount:caseLawBundle\.context\.length/);
  assert.match(chatJs,/Судска практика/);
  assert.match(chatJs,/caseLawSources/);
  assert.match(chatJs,/safeHttpUrl\(src\?\.url\)/);
});

test("CHAT36 case-law relevance participates in corpus routing without replacing article current-law verification",()=>{
  assert.match(worker,/caseLawBundle\.context\.length>0/);
  assert.match(worker,/ai_advokat_case_law_first/);
  assert.match(worker,/ai_advokat_article_corpus_plus_case_law/);
  assert.match(worker,/assessLegalRuntimeRelease\(\{[\s\S]*articleBundle,[\s\S]*result,[\s\S]*postflight/);
});
