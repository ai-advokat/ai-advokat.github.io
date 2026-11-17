import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=f=>fs.readFileSync(f,"utf8");
const root=read("index.html"),bot=read("bot/index.html");
const rootJs=read("assets/ai-advokat-chat.js"),botJs=read("assets/standalone-bot.js");
const timer=read("assets/ai-advokat-response-time.js");
const css=read("assets/zoki-conversation-contrast-r1.css");
const sync=read(".github/workflows/sync-pages-runtime.yml");
test("timer is preloaded before both chat clients",()=>{
 for(const [html,client] of [[root,"/assets/ai-advokat-chat.js?"],[bot,"/assets/standalone-bot.js?"]]){
   const timerPos=html.indexOf("/assets/ai-advokat-response-time.js?");
   assert.ok(timerPos>0 && timerPos<html.indexOf(client));
   assert.match(html,/ai-advokat-response-time\.css/);
 }
});
test("shared clock really counts and stops monotonically",()=>{
 let now=0,cb=null,cleared=false;
 const scope={performance:{now:()=>now},setInterval(fn,interval){assert.equal(interval,250);cb=fn;return 7;},clearInterval(v){assert.equal(v,7);cleared=true}};
 scope.globalThis=scope;vm.runInNewContext(timer,scope);
 const ticks=[];
 const c=scope.AIAdvokatResponseTime.createClock({onTick:ms=>ticks.push(ms)});
 now=1650;cb();
 assert.equal(scope.AIAdvokatResponseTime.formatClock(c.elapsedMs()),"00:01");
 assert.equal(scope.AIAdvokatResponseTime.formatDuration(c.elapsedMs()),"1,7 сек");
 assert.equal(c.stop(),1650);now=10000;
 assert.equal(c.elapsedMs(),1650);assert.equal(cleared,true);
});
test("both bot clients report elapsed processing and do not mislabel failure",()=>{
 assert.match(rootJs,/data-response-elapsed/);
 assert.match(rootJs,/responseTimingKind="answered"/);
 assert.match(rootJs,/responseTimingKind="stopped"/);
 assert.match(rootJs,/responseClock\?\.stop/);
 assert.match(botJs,/function appendAnswerTime/);
 assert.match(botJs,/responseClock\?\.createClock|AIAdvokatResponseTime\?\.createClock/);
 assert.match(botJs,/appendAnswerTime\(article,readDuration\(\)/);
 assert.match(botJs,/appendAnswerTime\(failureArticle,elapsedMs/);
 assert.match(botJs,/readDuration\(\);\s*pulse\.remove/);
});
test("Academy reuses external Worker bot; no third bot or timer requests",()=>{
 const html=read("academy/index.html");
 assert.match(html,/academyChatFrame/);
 assert.match(html,/workers\.dev\/bot\//);
 assert.doesNotMatch(timer,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage/);
});
test("external high contrast style is last and both themes are readable",()=>{
 const pos=bot.indexOf("/assets/zoki-conversation-contrast-r1.css");
 assert.ok(pos>bot.indexOf("/assets/standalone-bot-r7.js"));
 assert.match(css,/--zoki-ink:#192b3b/);
 assert.match(css,/--zoki-ink:#eef3f9/);
 assert.match(css,/data-vnext-theme="dark"/);
 assert.match(css,/\.message\.assistant/);
});
test("Pages sync actually ships new JS/CSS assets",()=>{
 for(const file of ["assets/ai-advokat-response-time.js","assets/ai-advokat-response-time.css","assets/zoki-conversation-contrast-r1.css"])assert.ok(sync.includes(file));
});
