import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("bot/index.html","utf8");
const css=fs.readFileSync("assets/zoki-conversation-first.css","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

test("Zoki external experience is conversation-first while retaining full advanced material",()=>{
  assert.match(html,/<details id="advancedTools" class="bot-advanced-tools">/);
  assert.match(html,/Напредни правни алатки и водилка/);
  assert.match(html,/<main>\s*<section id="messages"/);
  assert.match(html,/id="question"/);
  assert.match(html,/id="mic"/);
  assert.match(html,/id="send"/);
  assert.match(html,/id="materialsDialog"/);
  assert.match(html,/id="downloadDialog"/);
  assert.match(html,/id="legalGuide"/);
  assert.match(html,/href="\/hybrid-legal-intelligence\.html"/);
  assert.match(html,/href="\/casepilot-workspace\.html"/);
  assert.match(css,/\.bot-advanced-tools\[open\]/);
  assert.doesNotMatch(html,/<details id="advancedTools"[^>]*\bopen\b/);
});

test("external and internal bots retain the same governed conversation entry",()=>{
  assert.match(external,/request\('\/api\/bot'/);
  assert.match(internal,/fetch\(CHAT_API_BASE\+"\/api\/chat"/);
  assert.match(external,/queuedNextTurn = q/);
  assert.match(internal,/queuedConversationTurn=\{question:q,chatThreadId:currentId\}/);
  assert.match(external,/detectConfidentialCasePrompt/);
  assert.match(internal,/localConfidentialCasePrompt/);
});
