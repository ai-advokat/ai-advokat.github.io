import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const workspace=fs.readFileSync("ai-contract.html","utf8");
const canonical=fs.readFileSync("ai-contract-dpro14r.html","utf8");
const root=fs.readFileSync("index.html","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");

test("AI Contract PRO embeds canonical DPRO-14R instead of replacing it",()=>{
  assert.match(workspace,/AI CONTRACT PRO/);
  assert.match(workspace,/src="\/ai-contract-dpro14r\.html\?v=20261110-r7"/);
  assert.match(workspace,/Translation changes presentation only/);
  assert.equal((canonical.match(/function [A-Za-z0-9_]+/g)||[]).length,166);
  assert.equal((canonical.match(/<button\b/g)||[]).length,81);
  assert.equal((canonical.match(/<button type="button" class="tab(?: active)?" data-tab="/g)||[]).length,18);
  assert.match(canonical,/data-tab="normative14g"/);
  assert.match(canonical,/PRODUCTION NO-GO/);
});

test("AI Contract PRO exposes the same governed 33-language preference and live translation endpoint",()=>{
  const select=workspace.match(/<select id="contractLanguage"[\s\S]*?<\/select>/)?.[0]||"";
  const codes=[...select.matchAll(/<option value="([a-z]{2})">/g)].map(x=>x[1]);
  assert.equal(codes.length,33);
  assert.equal(new Set(codes).size,33);
  assert.match(workspace,/const KEY="aiadvokat-language"/);
  assert.match(workspace,/\/api\/ui-translate/);
  assert.match(workspace,/MutationObserver/);
  assert.match(workspace,/frame\.contentDocument/);
  assert.match(workspace,/reloadFrame/);
});

test("all primary AI Contract entry points open the integrated PRO workspace",()=>{
  assert.match(root,/href="\/ai-contract\.html">AI Contract/);
  assert.match(bot,/href="\/ai-contract\.html">AI Contract/);
  assert.match(internal,/href="\/ai-contract\.html"/);
  assert.match(external,/data-vnext-action="contract-intelligence"[\s\S]*AI Contract PRO/);
  assert.match(external,/window\.open\('\/ai-contract\.html','_blank','noopener'\)/);
});

test("quick review remains secondary and routes back to full PRO workspace",()=>{
  const quick=fs.readFileSync("contract-intelligence.html","utf8");
  assert.match(workspace,/href="\/contract-intelligence\.html">⚡ Quick Review/);
  assert.match(quick,/href="\/ai-contract\.html">AI Contract PRO/);
  assert.match(quick,/Отвори AI Contract PRO workspace/);
});
