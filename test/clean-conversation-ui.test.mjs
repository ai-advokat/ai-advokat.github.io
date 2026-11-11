import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html=fs.readFileSync("bot/index.html","utf8");
const css=fs.readFileSync("assets/standalone-bot-vnext.css","utf8");
const js=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");

test("external AI Advokat defaults to a clean conversation surface",()=>{
  assert.match(html,/ai-advokat-ui-release" content="professional-r7"/);
  assert.match(html,/ai-advokat-conversation-ui-release" content="conversation-r13"/);
  assert.match(html,/class="conversation-secondary-panel" aria-label="Hybrid Legal Intelligence/);
  assert.match(html,/class="legal-guide conversation-secondary-panel"/);
  assert.doesNotMatch(html,/class="legal-guide conversation-secondary-panel" id="legalGuide" open/);
  assert.match(css,/body>\.conversation-secondary-panel\{\s*display:none!important/);
  assert.match(css,/\.vnext-sidebar\{[\s\S]*display:none!important/);
  assert.match(css,/\.vnext-evidence\{[\s\S]*display:none!important/);
});

test("manual dark theme keeps user questions readable with explicit contrast",()=>{
  assert.match(css,/data-vnext-theme="dark"\]\[data-external-experience="conversation"\] \.message\.user\{/);
  assert.match(css,/background:#26394c!important/);
  assert.match(css,/color:#f7fbff!important/);
  assert.match(css,/\.message\.user\.has-vnext-actions>\.text\{[\s\S]*background:#26394c!important;[\s\S]*color:#f7fbff!important/);
});

test("light theme also uses explicit readable user-question contrast",()=>{
  assert.match(css,/data-vnext-theme="light"\]\[data-external-experience="conversation"\] \.message\.user\{/);
  assert.match(css,/background:#e8eef3!important/);
  assert.match(css,/color:#102233!important/);
});

test("conversation shell keeps the composer primary and secondary recording chrome hidden",()=>{
  assert.match(css,/\.vnext-center>main\{[\s\S]*width:min\(820px,100%\)!important/);
  assert.match(css,/\.bottom\{[\s\S]*position:sticky/);
  assert.match(css,/\.voice-record-row\{\s*display:none!important/);
  assert.match(css,/#composer\{[\s\S]*border-radius:22px!important/);
});

test("clean shell retains a theme control and governed advanced capabilities behind menus",()=>{
  assert.match(js,/vnextConversationTheme/);
  assert.match(js,/cycleTheme/);
  for(const marker of ["Правен асистент","Анализатор","Консолидатор","CasePilot","Human Gate"]){
    assert.ok(js.includes(marker),marker);
  }
});
