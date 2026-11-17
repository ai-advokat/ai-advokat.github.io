// Real Chromium UI regression. All AI endpoints are mocked; no paid/free models used.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{
    const bytes=await readFile(file);
    res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(bytes);
  }catch{res.writeHead(404);res.end("missing");}
});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
async function freshPage(origin,respond,{routePath='/api/bot',pagePath='/bot/index.html'}={}){
  const context=await browser.newContext({locale:"mk-MK",serviceWorkers:"block"});
  const page=await context.newPage();
  const requests=[];
  await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
    const req=route.request();
    if(new URL(req.url()).pathname===routePath && req.method()==="POST"){
      let body={};try{body=JSON.parse(req.postData()||"{}");}catch{}
      requests.push(body);
      const response=await respond(body,requests.length);
      await route.fulfill({status:response.status,contentType:"application/json",
        headers:{"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type"},
        body:JSON.stringify(response.body)});
    }else{
      await route.fulfill({status:200,contentType:"application/json",
        headers:{"access-control-allow-origin":"*"},
        body:'{"ok":true,"capabilities":{}}'});
    }
  });
  await page.goto(origin+pagePath,{waitUntil:"domcontentloaded",timeout:25000});
  if(pagePath.startsWith("/bot/"))
    await page.waitForFunction(()=>window.AIAdvokatCoreReady===true,null,{timeout:18000});
  else
    await page.waitForTimeout(1000);
  return {page,context,requests};
}
async function submit(page,q){
  await page.locator("#question").fill(q);
  await page.locator("#send").click();
}
try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const a=await freshPage(origin,async(_body,n)=>{
    if(n===1)await pause(500);
    return {status:200,body:{ok:true,answer:n===1?"Договор е правна согласност меѓу страните.":"Во договорот постојат меѓусебни обврски и права.",provider:"workers_ai_free",model:"synthetic-browser-mock",sources:[]}};
  });
  const q1="Што е договор во измислен пример?";
  const q2="Кои се обврските во истиот пример?";
  await submit(a.page,q1);
  const firstReady=Date.now()+8000;
  while(a.requests.length<1 && Date.now()<firstReady)await pause(50);
  assert.equal(a.requests.length,1,"first question must reach API");
  await submit(a.page,q2);
  const secondReady=Date.now()+16000;
  while(a.requests.length<2 && Date.now()<secondReady)await pause(60);
  assert.equal(a.requests.length,2,"second queued question must be sent after the first");
  assert.equal(a.requests[1].history.length,2,"second turn must include one user and one assistant history item");
  assert.equal(a.requests[0].sessionId,a.requests[1].sessionId,"thread session must remain stable");
  await a.page.waitForFunction(()=>document.querySelectorAll("#messages .message.assistant").length>=2,null,{timeout:15000});
  await a.context.close();
  const b=await freshPage(origin,async()=>{
    await pause(450);
    return {status:503,body:{ok:false,error:"free_workers_ai_provider_error",message:"Synthetic service interruption"}};
  });
  await submit(b.page,q1);
  const failureReady=Date.now()+8000;
  while(b.requests.length<1 && Date.now()<failureReady)await pause(40);
  assert.equal(b.requests.length,1);
  await submit(b.page,q2);
  await b.page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("Следното прашање е зачувано"),null,{timeout:12000});
  await pause(500);
  assert.equal(b.requests.length,1,"provider failure must not auto-spend a second model call");
  assert.equal(await b.page.locator("#question").inputValue(),q2,"queued follow-up must remain visible for manual retry");
  await b.context.close();
  // Main /index.html uses the same model runtime but a separate chat composer.
  const internal=await freshPage(origin,async(_body,n)=>{
    if(n===1)await pause(450);
    return {status:200,body:{ok:true,answer:n===1
      ?"Измислен договор е взаемна согласност и може да создава обврски."
      :"За истиот договор, обврските зависат од неговите услови.",
      provider:"workers_ai_free",model:"synthetic-browser-mock",sources:[],mode:"auto",displayMode:"synthetic_browser_qa"}};
  },{routePath:"/api/chat",pagePath:"/index.html"});
  async function submitInternal(page,question){
    await page.evaluate(text=>{
      const input=document.querySelector("#aiChatInput");
      if(!input)throw new Error("internal_chat_input_missing");
      input.value=text;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      document.querySelector("#aiChatSend").click();
    },question);
  }
  await submitInternal(internal.page,q1);
  const internalFirstDeadline=Date.now()+12000;
  while(internal.requests.length<1 && Date.now()<internalFirstDeadline) await pause(60);
  assert.equal(internal.requests.length,1,"internal first request must reach mock");
  await submitInternal(internal.page,q2);
  const internalSecondDeadline=Date.now()+18000;
  while(internal.requests.length<2 && Date.now()<internalSecondDeadline) await pause(70);
  assert.equal(internal.requests.length,2,"internal second question must be sent after first");
  assert.equal(internal.requests[0].sessionId,internal.requests[1].sessionId);
  assert.equal(internal.requests[1].history.length,2);
  await internal.context.close();
  console.log("ZOKI R25 CHROMIUM SECOND-TURN: PASS {external:true,internal:true,historyPreserved:true,providerFailureQueuePreserved:true,unplannedCalls:0}");
}catch(e){console.error("ZOKI R25 CHROMIUM SECOND-TURN: FAIL",String(e?.stack||e));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}
