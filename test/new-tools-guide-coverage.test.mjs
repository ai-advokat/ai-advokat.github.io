import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

const tools=[
  ["/proactive-agent-runtime.html","proactive-agent-runtime.html","Како се користи"],
  ["/proactive-legal-agents.html","proactive-legal-agents.html","Како да ги користиш агентите"],
  ["/legal-command-center.html","legal-command-center.html","Како се користи"],
  ["/contract-intelligence.html","contract-intelligence.html","Како се користи"],
  ["/fact-evidence-graph.html","fact-evidence-graph.html","Како се користи"],
  ["/connector-library.html","connector-library.html","Како се користи"],
  ["/professional-tools.html#batch-review","professional-tools.html","Batch Review"],
  ["/casepilot-workspace.html","casepilot-workspace.html","CasePilot"],
  ["/hybrid-legal-intelligence.html","hybrid-legal-intelligence.html","Hybrid Legal Intelligence"],
  ["/case-law-curation.html","case-law-curation.html","Case-Law"],
  ["/echr-crosswalk.html","echr-crosswalk.html","ECHR"],
  ["/consolidator/","consolidator/index.html","Human Gate"]
];

test("central Zoki guide covers every new tool",()=>{
  const guide=read("zoki-legal-ai-guide.html");
  assert.ok(guide.includes("КАТАЛОГ НА НОВИ АЛАТКИ"));
  for(const [href] of tools) assert.ok(guide.includes(href),href);
});

test("primary Harvey-class workspaces expose an on-page usage guide",()=>{
  for(const [,path,marker] of tools.slice(0,6)){
    const html=read(path);
    assert.ok(html.includes(marker),path+" missing guide marker "+marker);
    assert.ok(html.includes("Human Gate") || html.includes("Boundary"),path+" missing governance boundary");
  }
});

test("Legal AI Suite explicitly exposes guide coverage",()=>{
  const html=read("legal-ai-suite.html");
  assert.ok(html.includes("Водилки"));
  assert.ok(html.includes("/zoki-legal-ai-guide.html"));
});

test("Zoki guide preserves source-first and Human Gate rules",()=>{
  const guide=read("zoki-legal-ai-guide.html");
  assert.ok(guide.includes("Source-First"));
  assert.ok(guide.includes("Candidate ≠ authority"));
  assert.ok(guide.includes("Human Gate"));
});
