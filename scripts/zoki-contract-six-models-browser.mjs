import {createServer} from "node:http";
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
const script=fs.readFileSync("assets/zoki-six-contract-conversation-r25.js","utf8");
const server=createServer((req,res)=>{
 const u=new URL(req.url,"http://127.0.0.1");
 if(u.pathname==="/assets/zoki-six-contract-conversation-r25.js"){
   res.writeHead(200,{"content-type":"text/javascript; charset=utf-8"});res.end(script);return;
 }
 const internal=u.pathname==="/internal";
 const html='<!doctype html><html lang="mk"><meta charset="utf-8"><body>'+
 (internal?'<div class="ai-chat-input"><textarea id="aiChatInput"></textarea><button id="aiChatSend" type="button">Send</button></div>':
 '<form id="composer"><textarea id="question"></textarea><button id="send" type="submit">Send</button></form>')+
 '<script defer src="/assets/zoki-six-contract-conversation-r25.js"></script></body></html>';
 res.writeHead(200,{"content-type":"text/html; charset=utf-8"});res.end(html);
});
let browser;
try{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 for(const channel of ["internal","external"]){
   const page=await browser.newPage();
   const attempted=[];let sent=0;let inputEvents=0;
   page.on("request",r=>{if(!r.url().startsWith(base))attempted.push(r.url());});
   await page.goto(base+"/"+channel,{waitUntil:"domcontentloaded"});
   await page.waitForSelector('[data-zoki-contract-conversation="r25"]',{timeout:8000});
   assert.equal(await page.locator('button[data-zoki-contract-model]').count(),6);
   await page.evaluate(()=>{
     const input=document.querySelector("#aiChatInput,#question");
     input.addEventListener("input",()=>window.__zokiEvents=(window.__zokiEvents||0)+1);
   });
   const textarea=channel==="internal"?"#aiChatInput":"#question";
   for(const id of ["nda","cooperation","services","lease","loan","debt"]){
     await page.locator('[data-zoki-contract-conversation="r25"] summary').click();
     await page.locator('button[data-zoki-contract-model="'+id+'"]').click();
     const value=await page.locator(textarea).inputValue();
     assert.match(value,/РАБОТЕН НАЦРТ/);
     assert.match(value,/Human Gate: HOLD/);
     assert.match(value,/Поставувај ми по ЕДНО прашање/);
   }
   inputEvents=await page.evaluate('window.__zokiEvents||0');
   assert.equal(inputEvents,6,"each click must dispatch native input event");
   assert.equal(sent,0,"the script cannot auto-submit");
   assert.deepEqual(attempted,[],"the entry surface may not call any model/provider");
   await page.close();
   console.log("ZOKI CONTRACT CHAT ENTRY "+channel+": PASS six models / manual send / no network");
 }
}catch(e){console.error("ZOKI CONTRACT CHAT ENTRY: FAIL",String(e?.stack||e));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(done=>server.close(done));}
