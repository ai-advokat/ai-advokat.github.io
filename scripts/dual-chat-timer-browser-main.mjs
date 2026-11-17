// Actual Chromium DOM acceptance, with all AI/provider responses mocked.
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
  if(pathname.endsWith("/"))pathname+="index.html";
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const bytes=await readFile(file);res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(bytes);}
  catch{res.writeHead(404);res.end("missing");}
});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
async function scenario(origin,{external=true,fail=false}={}){
  const context=await browser.newContext({locale:"mk-MK",serviceWorkers:"block"});
  const page=await context.newPage();
  let aiCalls=0;
  await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
    const request=route.request();
    const pathname=new URL(request.url()).pathname;
    if((pathname===(external?"/api/bot":"/api/chat"))&&request.method()==="POST"){
      aiCalls++;
      await pause(1600);
      const body=fail
        ?{ok:false,error:"free_workers_ai_provider_error",message:"Синтетичка грешка 503"}
        :{ok:true,answer:"Ова е синтетички правен одговор за тестирање на времетраењето.",provider:"workers_ai_free",model:"synthetic-browser-mock",sources:[],mode:"auto",displayMode:"synthetic_browser_qa"};
      await route.fulfill({status:fail?503:200,contentType:"application/json",headers:{"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type"},body:JSON.stringify(body)});
    }else{
      await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":true,"capabilities":{}}'});
    }
  });
  const pathname=external?"/bot/index.html":"/index.html";
  await page.goto(origin+pathname,{waitUntil:"domcontentloaded",timeout:25000});
  if(external)await page.waitForFunction(()=>window.AIAdvokatCoreReady===true,null,{timeout:18000});
  else await page.locator("#aiChatInput").waitFor({state:"attached",timeout:18000});
  assert.equal(await page.evaluate(()=>typeof window.AIAdvokatResponseTime?.createClock),"function","clock must preload before chat code");
  const q="Што е договор во измислен правен пример?";
  if(external){
    await page.locator("#question").fill(q);
    await page.locator("#send").click();
  }else{
    await page.evaluate(text=>{
      const input=document.querySelector("#aiChatInput");
      input.value=text;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      document.querySelector("#aiChatSend").click();
    },q);
  }
  const timerSelector=external?".response-pending .ai-response-elapsed":".ai-msg-preparing .ai-response-elapsed";
  await page.waitForFunction(sel=>document.querySelector(sel)?.textContent?.includes("00:01"),timerSelector,{timeout:15000});
  await page.waitForFunction(()=>document.querySelectorAll(".ai-response-duration").length>0,null,{timeout:20000});
  const duration=await page.locator(".ai-response-duration").last().innerText();
  if(fail){
    assert.match(duration,/(?:Обработката траеше|Времето истече)/);
    assert.doesNotMatch(duration,/^Одговор за/);
  }else assert.match(duration,/^Одговор за \d+(?: мин \d+)?,\d сек$/);
  assert.equal(aiCalls,1,"timer must not issue additional AI calls");
  await context.close();
  return {external,fail,duration,aiCalls};
}
try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const external=await scenario(origin,{external:true});
  const internal=await scenario(origin,{external:false});
  const failure=await scenario(origin,{external:true,fail:true});
  console.log("ZOKI R27 CHROMIUM PASS",JSON.stringify([external,internal,failure]));
}catch(error){
  console.error("ZOKI R27 CHROMIUM FAIL",String(error?.stack||error));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
