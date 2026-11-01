import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const home=fs.readFileSync("index.html","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");
const guard=fs.readFileSync("assets/frontend-runtime-guard.js","utf8");
const mainChat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");

test("shared frontend runtime guard loads before both bot bundles",()=>{
  const mainGuard=home.indexOf("frontend-runtime-guard.js?v=20261101-root-r1");
  const mainBundle=home.indexOf("ai-advokat-chat.js?v=20261101-root-r9");
  const botGuard=bot.indexOf("frontend-runtime-guard.js?v=20261101-root-r1");
  const botCore=bot.indexOf("standalone-bot.js?v=20261101-core-r10");\n  const botBundle=bot.indexOf("standalone-bot-vnext.js?v=20261101-vnext-r10");
  assert.ok(mainGuard>=0 && mainBundle>mainGuard);
  assert.ok(botGuard>=0 && botCore>botGuard && botBundle>botCore);
  assert.match(guard,/const code="UI-"/);
  assert.match(guard,/report\("main","boot-timeout"/);
  assert.match(guard,/report\("external","boot-timeout"/);
  assert.match(guard,/AIAdvokatFrontendGuard/);
  assert.match(guard,/markReady/);
  assert.match(guard,/unhandledrejection/);
});

test("main AI Advokat chat cannot silently die on DOM or workbench boot failure",()=>{
  assert.match(mainChat,/requiredChatElements/);
  assert.match(mainChat,/missingChatElements/);
  assert.match(mainChat,/report\?\.\("main","dom-contract"/);
  assert.match(mainChat,/report\?\.\("main","workbench-action"/);
  assert.match(mainChat,/markReady\?\.\("main"\)/);
  assert.match(mainChat,/report\?\.\("main","boot"/);
});

test("external bot isolates vNext boot stages and remains fail-visible",()=>{
  assert.match(vnext,/function bootStage\(stage,fn\)/);
  assert.match(vnext,/bootStage\('build-shell',buildShell\)/);
  assert.match(vnext,/bootStage\('wire-controls',wire\)/);
  assert.match(vnext,/bootStage\('theme'/);
  assert.match(vnext,/report\?\.\('external',stage,error\)/);
  assert.match(vnext,/markReady\?\.\('external'\)/);
  assert.match(vnext,/vnextSidebarClose'\)\.onclick=closeMobileSidebar/);
});

test("professional runtime recovery covers transient 408 and bounded specialist deadline failures",()=>{
  assert.match(worker,/\[408,429,500,502,503,504\]\.includes\(transientStatus\)/);
  assert.match(orchestrator,/"specialist_deadline_exhausted"/);
  assert.match(orchestrator,/\["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL"\]\.includes\(profile\)/);
  assert.match(worker,/!membership\s*&&\s*governedOpenAIWorkersFallbackConfigured/);
  assert.match(worker,/\/api\/bot"\) return handleGPTChat\(request, env, \{openAIOnly:true\}\)/);
});
