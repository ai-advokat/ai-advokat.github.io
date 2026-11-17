import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shared=fs.readFileSync("assets/ai-advokat-response-time.js","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");
const portal=fs.readFileSync("index.html","utf8");
const standalone=fs.readFileSync("bot/index.html","utf8");

function harness(){
  let time=0, intervalCallback=null, cleared=false;
  const scope={
    performance:{now:()=>time},
    setInterval(callback,period){
      assert.equal(period,250);
      intervalCallback=callback;
      return 7;
    },
    clearInterval(id){assert.equal(id,7);cleared=true;}
  };
  scope.globalThis=scope;
  vm.runInNewContext(shared,scope);
  return {
    api:scope.AIAdvokatResponseTime,
    advance(ms){time+=ms;intervalCallback?.();},
    cleared(){return cleared}
  };
}

test("shared monotonic response clock counts, stops, freezes and clears interval",()=>{
  const h=harness(),ticks=[];
  const c=h.api.createClock({onTick:ms=>ticks.push(ms)});
  assert.deepEqual(ticks,[0]);
  h.advance(1350);
  assert.equal(c.elapsedMs(),1350);
  assert.equal(h.api.formatClock(c.elapsedMs()),"00:01");
  assert.equal(h.api.formatDuration(c.elapsedMs()),"1,4 сек");
  assert.equal(c.stop(),1350);
  assert.equal(h.cleared(),true);
  h.advance(7000);
  assert.equal(c.elapsedMs(),1350);
  assert.equal(c.stop(),1350);
  assert.deepEqual(ticks,[0,1350]);
});

test("time formatting handles minutes, invalid and negative time safely",()=>{
  const h=harness(),a=h.api;
  assert.equal(a.formatClock(0),"00:00");
  assert.equal(a.formatClock(90500),"01:30");
  assert.equal(a.formatDuration(61550),"1 мин 1,6 сек");
  assert.equal(a.formatDuration(-50),"0,0 сек");
  assert.equal(a.formatDuration(Number.NaN),"0,0 сек");
});

test("both bots preload the same timer and stylesheet before chat boot",()=>{
  for(const html of [portal,standalone]){
    const clock=html.indexOf("/assets/ai-advokat-response-time.js");
    const style=html.indexOf("/assets/ai-advokat-response-time.css");
    const botScript=html.includes("standalone-bot.js?") ? html.indexOf("/assets/standalone-bot.js?") : html.indexOf("/assets/ai-advokat-chat.js?");
    assert.ok(clock>0 && clock<botScript);
    assert.ok(style>0);
  }
});

test("internal: spinner time, successful answer duration, timeout/stop and history-safe metadata",()=>{
  assert.match(internal,/dataset\.responseElapsed=String\(idx\)/);
  assert.match(internal,/createClock\?\.\(\{/);
  assert.match(internal,/if\(currentId!==responseThreadId\)return/);
  assert.match(internal,/responseClock\?\.stop\(\)/);
  assert.match(internal,/reply\.responseElapsedMs=Math\.round\(responseElapsedMs\)/);
  assert.match(internal,/reply\.responseTimingKind=modelReplyReceived\?"answered"/);
  assert.match(internal,/outcome==="answered" \? "Одговор за "/);
  assert.match(internal,/outcome==="timeout" \? "Времето истече по "/);
  assert.match(internal,/controller\.signal\.aborted\?"stopped":"unanswered"/);
  assert.match(internal,/history:historyForApi/);
});

test("external: visible elapsed clock and honest response/error duration per message",()=>{
  assert.match(external,/function appendResponseTime\(article,elapsedMs,outcome="answered"\)/);
  assert.match(external,/elapsed\.className="ai-response-elapsed"/);
  assert.match(external,/responseClock\?\.stop\(\)/);
  assert.match(external,/appendResponseTime\(article,responseElapsedMs,successfulAnswer\?"answered":"unanswered"\)/);
  assert.match(external,/appendResponseTime\(errorArticle,responseElapsedMs,timedOut\?"timeout":error\.name==="AbortError"\?"stopped":"unanswered"\)/);
  assert.match(external,/history:history\.slice\(-8\)/);
  assert.match(external,/queuedNextTurn = q/);
  assert.match(external,/if \(epoch !== generation\) return/);
});

test("timer is display-only, never a provider/network or confidential-case data channel",()=>{
  assert.doesNotMatch(shared,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|navigator\.sendBeacon|OPENAI_API_KEY/);
  assert.match(shared,/scope\.clearInterval\(interval\)/);
  assert.match(shared,/typeof scope\.performance\?\.now==="function"/);
});
