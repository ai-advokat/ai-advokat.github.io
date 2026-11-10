import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const root=fs.readFileSync("index.html","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const chatCss=fs.readFileSync("assets/ai-advokat-chat.css","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");
const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const vnextCss=fs.readFileSync("assets/standalone-bot-vnext.css","utf8");

test("internal Materials toolbox is grouped into legal folders without losing governed tools",()=>{
  for(const label of ["Судови и предмети","Службени извори","AI алатки","Библиотека, водичи и автор"]){
    assert.ok(chat.includes(label),label);
  }
  for(const href of [
    "/casepilot-workspace.html","/judicial-practice.html","/case-law-curation.html","/echr-crosswalk.html",
    "/sluzben-vesnik/","/public-legal-data-services.html","/contract-intelligence.html",
    "/hybrid-legal-intelligence.html","/legal-command-center.html","/professional-library/","/zoki-legal-ai-guide.html"
  ]) assert.ok(chat.includes('href="'+href+'"'),href);
  assert.match(chat,/📎 Прикачи документи \/ Secure Case Workspace ↗/);
  assert.match(chat,/▣ CasePilot ↗/);
  assert.match(chatCss,/\.ai-material-folder-grid/);
  assert.match(chatCss,/\.ai-material-folder>summary/);
});

test("external Professional sidebar is grouped but preserves every existing action id",()=>{
  for(const label of ["AI анализа и подготовка","Судови и предмети","Извори, докази и документи","Работа и контрола"]){
    assert.ok(vnext.includes(label),label);
  }
  const actions=[
    "assistant","analyzer","consolidator","predictor","hybrid-intelligence","contract-intelligence","fact-evidence-graph",
    "justice-daily","cases","case-law-radar","echr-crosswalk","casepilot",
    "sources","public-evidence","documents","connector-library","library",
    "proactive-runtime","proactive-agents","legal-command-center","professional-ecosystem","review-vault","workflows","zoki-guide","review"
  ];
  for(const action of actions){
    assert.equal((vnext.match(new RegExp('data-vnext-action="'+action+'"','g'))||[]).length,1,action);
  }
  assert.match(vnextCss,/\.vnext-nav-folder/);
  assert.match(vnextCss,/\.vnext-nav-folder>summary/);
});

test("grouped workspace assets use additive cache keys while preserving canonical release prefixes",()=>{
  assert.match(root,/ai-advokat-chat\.css\?v=20261106-root-r15-voice&nav=20261110-r6/);
  assert.match(root,/ai-advokat-chat\.js\?v=20261109-root-r15-voice-r4-runtime&nav=20261110-r6/);
  assert.match(bot,/standalone-bot-vnext\.css\?v=20261106-ui-r6-toolkit-parity&nav=20261110-r6/);
  assert.match(bot,/standalone-bot-vnext\.js\?v=20261107-hybrid-r2-lawyer-view&nav=20261110-r6/);
});
