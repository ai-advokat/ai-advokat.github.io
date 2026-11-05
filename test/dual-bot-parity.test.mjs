import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const mainHtml=fs.readFileSync("index.html","utf8");
const mainJs=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const externalHtml=fs.readFileSync("bot/index.html","utf8");
const externalCore=fs.readFileSync("assets/standalone-bot.js","utf8");
const externalVNext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");

const MODULE_LABELS=[
  "Правен асистент","Анализатор","Консолидатор","Предиктор","Правни извори",
  "Судска практика","CasePilot","Документи","Workflows","Human Gate","Library"
];
const MESSAGE_ACTIONS=["⧉ Копирај","✎ Уреди","↺ Повтори","▤ Извори","✓ Проверка","▧ DOCX","▧ PDF"];

test("dual-bot parity: both workspaces expose the same professional module set",()=>{
  for(const label of MODULE_LABELS){
    assert.ok(mainHtml.includes(label),"main workspace missing "+label);
    assert.ok(externalVNext.includes(label),"external workspace missing "+label);
  }
});

test("dual-bot parity: both message surfaces expose the same governed action set",()=>{
  for(const label of MESSAGE_ACTIONS){
    assert.ok(mainJs.includes(label),"main message actions missing "+label);
    assert.ok(externalVNext.includes(label),"external message actions missing "+label);
  }
});

test("dual-bot parity: assistant repeat actually re-runs the prior question on both surfaces",()=>{
  assert.match(mainJs,/retry\.onclick=\(\)=>retryFrom\(idx\)/);
  assert.match(mainJs,/function retryFrom\(index\)[\s\S]{0,260}send\(chat\.messages\[i\]\.text\)/);
  assert.match(externalVNext,/const q=priorUserText\(article\)/);
  assert.match(externalVNext,/setComposerText\(q\)/);
  assert.match(externalVNext,/queueMicrotask\(\(\)=>\$\('composer'\)\?\.requestSubmit\(\)\)/);
});

test("dual-bot parity: both surfaces expose governed sources and Human Gate evidence",()=>{
  for(const key of ["legalSources","caseLawSources","guideSources","publicationSources","sources"]){
    assert.ok(mainJs.includes(key),"main source contract missing "+key);
    assert.ok(externalCore.includes(key)||externalVNext.includes(key),"external source contract missing "+key);
  }
  assert.match(mainJs,/legalGovernance/);
  assert.match(mainJs,/humanReviewRequired/);
  assert.match(externalVNext,/data\.legalGovernance/);
  assert.match(externalVNext,/humanReviewRequired/);
  assert.match(externalVNext,/requiredGateTypes/);
  assert.match(externalVNext,/executionAuthorization/);
});

test("dual-bot parity: provider provenance and recovery are visible without pretending equivalence of access modes",()=>{
  assert.match(mainJs,/providerRecovery/);
  assert.match(externalVNext,/providerRecovery/);
  assert.match(externalVNext,/Provider recovery/);
  assert.match(mainJs,/CHAT_API_BASE\+"\/api\/chat"/);
  assert.match(externalCore,/request\('\/api\/bot'/);
  assert.match(externalHtml,/Професионален пристап/);
  assert.match(mainHtml,/FREE активен|јавен текстуален chat/);
});

test("dual-bot parity: voice, export and privacy boundaries exist on both surfaces",()=>{
  assert.match(mainJs,/SpeechRecognition|webkitSpeechRecognition/);
  assert.match(externalCore,/SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(mainJs,/exportAssistantMessage/);
  assert.match(externalCore,/exportLatestAssistant/);
  assert.match(mainHtml,/Secure Case Workspace/);
  assert.match(externalHtml,/Secure Case Workspace/);
  assert.match(mainJs,/localConfidentialCasePrompt/);
  assert.match(externalCore,/detectConfidentialCasePrompt/);
});
