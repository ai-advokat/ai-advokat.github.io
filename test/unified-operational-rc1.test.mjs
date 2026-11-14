import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");
test("both Zoki review intakes reachable across the surfaces",()=>{
  for(const p of ["index.html","bot/index.html","ai-contract.html","contract-intelligence.html"]){
    const s=read(p);
    assert.ok(s.includes('href="/ai-contract-rc84-review.html"'),p+" RC84");
    assert.ok(s.includes('href="/consolidator/zoki-rc16-review.html"'),p+" RC16");
  }
  assert.ok(read("consolidator/index.html").includes('href="/consolidator/zoki-rc16-review.html"'));
});
test("previous R20 translator and R22 conversation implementation preserved",()=>{
  assert.ok(read("index.html").includes("UI_TRANSLATION_BATCH_ITEMS=24"));
  assert.ok(read("index.html").includes("UI_TRANSLATION_BATCH_CHARS=4800"));
  assert.ok(read("src/index.js").includes("providerRecovery:freeResult.provider"));
  assert.ok(read("assets/ai-advokat-chat.js").includes("ai-advokat-proactive.mjs"));
  assert.ok(read("assets/standalone-bot.js").includes("ai-advokat-proactive.mjs"));
});
test("GitHub workflows require manual deployment",()=>{
  for(const p of [".github/workflows/production-runtime-sync.yml",".github/workflows/sync-pages-runtime.yml"]){
    const s=read(p);
    assert.ok(s.includes("workflow_dispatch:"));
    assert.ok(s.includes("environment: production"));
    assert.ok(!/\n\s*push:\s*\n\s*branches:\s*\["main"\]/.test(s),p+" auto push");
  }
});
test("release dossier explicitly forbids accidental production promotion",()=>{
 const s=read("docs/AI_ADVOKAT_UNIFIED_RC1_2026-11-14.md");
 assert.ok(s.includes("No merge until owner explicitly authorizes"));
 assert.ok(read("consolidator/zoki-rc16-review.html").includes("LEGAL NO-GO"));
});
