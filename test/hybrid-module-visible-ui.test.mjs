import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Hybrid Legal Intelligence is explicitly visible in both AI Advokat shells",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  const root=fs.readFileSync("index.html","utf8");
  assert.match(bot,/href="\/hybrid-legal-intelligence\.html"/);
  assert.match(bot,/⌘ Hybrid Legal Intelligence/);
  assert.match(root,/href="\/hybrid-legal-intelligence\.html"/);
  assert.match(root,/⌘ Hybrid Legal Intelligence/);
});

test("bot shell uses a fresh vNext cache key for Hybrid R2 Lawyer View visibility",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  assert.match(bot,/standalone-bot-vnext\.js\?v=20261107-hybrid-r2-lawyer-view/);
  assert.doesNotMatch(bot,/standalone-bot-vnext\.js\?v=20261106-vnext-r14-toolkit-parity/);
});

test("production live-parity workflows expect the Hybrid R2 cache key",()=>{
  for(const p of [
    ".github/workflows/production-runtime-sync.yml",
    ".github/workflows/worker-runtime-live-smoke.yml"
  ]){
    const y=fs.readFileSync(p,"utf8");
    assert.match(y,/20261107-hybrid-r2-lawyer-view/);
    assert.doesNotMatch(y,/20261106-vnext-r14-toolkit-parity/);
  }
});

test("all nine Hybrid modules are directly visible from both public AI Advokat shells",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  const root=fs.readFileSync("index.html","utf8");
  const links=[
    "module=time",
    "module=bylaws",
    "module=cases",
    "module=calendar",
    "module=diff",
    "module=opendata",
    "module=services",
    "module=handoff",
    "module=gold"
  ];
  for(const link of links){
    assert.equal(root.includes(link),true,"root missing "+link);
    assert.equal(bot.includes(link),true,"bot missing "+link);
  }
  assert.match(root,/НОВО · Hybrid Legal Intelligence · 9 функции/);
  assert.match(bot,/НОВО · Hybrid Legal Intelligence · 9 функции/);
});

test("Hybrid and Public Legal tools are visible in both top headers",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  const root=fs.readFileSync("index.html","utf8");
  for(const html of [root,bot]){
    assert.match(html,/data-header-legal="hybrid"/);
    assert.match(html,/data-header-legal="public-legal"/);
    assert.match(html,/data-header-legal="gold"/);
    assert.match(html,/href="\/hybrid-legal-intelligence\.html"/);
    assert.match(html,/href="\/public-legal-data-services\.html"/);
    assert.match(html,/href="\/gold-set-review-gate\.html"/);
  }
  assert.match(root,/⌘ Hybrid 9/);
  assert.match(root,/⚖ Open Data & e‑Services/);
  assert.match(bot,/header-legal-links/);
});

test("Core legal tools are explained for users and Gold is present in mobile navigation",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  const root=fs.readFileSync("index.html","utf8");
  assert.match(root,/Што прават трите носечки правни алатки\?/);
  assert.match(bot,/Како се разликуваат главните алатки\?/);
  for(const label of ["Hybrid 9","Open Data & e‑Services","Gold Review Gate"]){
    assert.equal(root.includes(label),true,"root explanation missing "+label);
    assert.equal(bot.includes(label),true,"bot explanation missing "+label);
  }
  assert.match(root,/data-header-mobile="hybrid"/);
  assert.match(root,/data-header-mobile="public-legal"/);
  assert.match(root,/data-header-mobile="gold"/);
});

test("Standalone bot exposes the complete new legal-intelligence workflow",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  assert.match(bot,/Водилка · Како да ги користиш новите функции во надворешниот AI Advokat/);
  for(const label of [
    "01 · Time Machine","02 · Law ↔ Bylaw","03 · Case-Law","04 · Legal Calendar",
    "05 · Consolidation Diff","06 · Open Data Evidence","07 · Official e‑Services",
    "08 · Human Handoff","09 · Gold Review Gate"
  ]) assert.equal(bot.includes(label),true,"external bot guide missing "+label);
  assert.match(bot,/Hybrid 9 · целосен source-first workflow/);
  assert.match(bot,/Open Data & e‑Services · evidence \+ eID handoff/);
  assert.match(bot,/Gold Review Gate v2\.1 · corpus-control \+ Human Gate/);
  assert.match(bot,/Финалната професионална употреба, поднесување и promotion во reviewed authority остануваат човечка одлука/);
});
