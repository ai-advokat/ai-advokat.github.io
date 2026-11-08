import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const js=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");

const routes=[
  ["Proactive Runtime","proactive-runtime","/proactive-agent-runtime.html"],
  ["Proactive Agents","proactive-agents","/proactive-legal-agents.html"],
  ["Legal Command Center","legal-command-center","/legal-command-center.html"],
  ["Contract Intelligence","contract-intelligence","/contract-intelligence.html"],
  ["Fact & Evidence Graph","fact-evidence-graph","/fact-evidence-graph.html"],
  ["Connector Library","connector-library","/connector-library.html"],
  ["Review Tables / Vault","review-vault","/professional-tools.html#batch-review"],
  ["CasePilot","casepilot","/casepilot-workspace.html"],
  ["Hybrid Legal Intelligence","hybrid-intelligence","/hybrid-legal-intelligence.html"]
];

test("external bot exposes all nine Legal AI Suite modules",()=>{
  for(const [label,action,href] of routes){
    assert.ok(js.includes(label),label);
    assert.ok(js.includes(`data-vnext-action="${action}"`),action);
    assert.ok(js.includes(href),href);
  }
});

test("external Judicial Practice entry uses the canonical governed hub",()=>{
  assert.ok(js.includes("<span>Судска пракса</span>"));
  assert.ok(js.includes("window.open('/judicial-practice.html'"));
  assert.ok(!js.includes("<span>Судска практика</span>"));
});

test("external bot keeps core professional functions alongside suite parity",()=>{
  for(const marker of [
    "data-vnext-action=\"analyzer\"",
    "data-vnext-action=\"consolidator\"",
    "data-vnext-action=\"echr-crosswalk\"",
    "data-vnext-action=\"predictor\"",
    "data-vnext-action=\"sources\"",
    "data-vnext-action=\"public-evidence\"",
    "data-vnext-action=\"justice-daily\"",
    "data-vnext-action=\"documents\"",
    "data-vnext-action=\"workflows\"",
    "data-vnext-action=\"review\"",
    "data-vnext-action=\"library\""
  ]) assert.ok(js.includes(marker),marker);
});

test("Zoki guide is directly reachable from external bot",()=>{
  assert.ok(js.includes('data-vnext-action="zoki-guide"'));
  assert.ok(js.includes("/zoki-legal-ai-guide.html"));
});
