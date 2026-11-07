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

test("all five Hybrid modules are directly visible from both public AI Advokat shells",()=>{
  const bot=fs.readFileSync("bot/index.html","utf8");
  const root=fs.readFileSync("index.html","utf8");
  const links=[
    "module=time",
    "module=bylaws",
    "module=cases",
    "module=calendar",
    "module=diff"
  ];
  for(const link of links){
    assert.equal(root.includes(link),true,"root missing "+link);
    assert.equal(bot.includes(link),true,"bot missing "+link);
  }
  assert.match(root,/НОВО · Hybrid Legal Intelligence · 5 функции/);
  assert.match(bot,/НОВО · Hybrid Legal Intelligence · 5 функции/);
});

