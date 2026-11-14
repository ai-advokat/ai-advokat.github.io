// R19 browser acceptance of the two actual chat frontends.
// A stalled OPTIONAL guide catalogue must not prevent a question reaching
// the internal /api/chat or external /api/bot. Providers are mocked only in
// this PR test; post-deployment provider/live UAT is separately mandatory.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";

const root=process.cwd();
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".woff2":"font/woff2"};
let abortedSlowGuides=0;
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,"http://127.0.0.1");
    if(url.pathname==="/data/guides.json"||url.pathname==="/data/public-practical-guides-38-73.json"){
      // This response is intentionally slower than the frontend's 3500ms
      // deadline, reproducing the month-long "processing..." preflight stall.
      req.on("close",()=>{if(!res.writableEnded) abortedSlowGuides+=1;});
      await new Promise(resolve=>setTimeout(resolve,7000));
      if(res.destroyed) return;
      res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
      res.end(url.pathname.includes("public-practical")?'{"guides":[]}':'{"records":[]}');
      return;
    }
    let pathname=decodeURIComponent(url.pathname);
    if(pathname==="/"||pathname.endsWith("/")) pathname+="index.html";
    const filename=path.resolve(root,"."+pathname);
    if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(filename);
    res.writeHead(200,{"content-type":types[path.extname(filename)]||"application/octet-stream","cache-control":"no-store"});
    res.end(bytes);
  }catch{res.writeHead(404);res.end("missing");}
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const close=()=>new Promise(resolve=>server.close(resolve));
let browser;
const evidence=[];
try{
  await listen();
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const cases=[
    {url:"/",input:"#aiChatInput",send:"#aiChatSend",messages:"#aiChatMessages",endpoint:"/api/chat",label:"internal"},
    {url:"/bot/",input:"#question",send:"#send",messages:"#messages",endpoint:"/api/bot",label:"external"}
  ];
  for(const testcase of cases){
    const ctx=await browser.newContext({locale:"mk-MK",serviceWorkers:"block"});
    const page=await ctx.newPage();
    let calls=0,lastRequest=null;
    const browserErrors=[];
    page.on("pageerror",error=>browserErrors.push(String(error?.message||error).slice(0,250)));
    await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
      const req=route.request(),url=req.url();
      if(url.includes(testcase.endpoint)){
        calls++;
        try{lastRequest=JSON.parse(req.postData()||"{}");}catch{}
        const answer=testcase.label==="internal"
          ? "Внатрешен тестен одговор на македонски со човечка проверка."
          : "Надворешен тестен одговор на македонски со човечка проверка.";
        const fake={ok:true,answer,provider:"canonical_corpus_no_model",model:null,webSearchUsed:false,sources:[],legalSources:[],sourceMode:"canonical_article_corpus_no_model",humanGate:"required",performance:{providerCalls:0}};
        await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(fake)});
      }else{
        await route.fulfill({status:503,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":false,"error":"test_fixture_no_provider"}'});
      }
    });
    await page.goto(origin+testcase.url,{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForSelector(testcase.input,{state:"visible",timeout:22000});
    const sentAt=Date.now();
    await page.fill(testcase.input,"Што е полномошно во општа правна смисла?");
    await page.locator(testcase.send).click({timeout:15000});
    const expected=testcase.label==="internal"?"Внатрешен тестен одговор":"Надворешен тестен одговор";
    await page.waitForFunction(({selector,text})=>(document.querySelector(selector)?.textContent||"").includes(text),{selector:testcase.messages,text:expected},{timeout:14000});
    const elapsed=Date.now()-sentAt;
    assert.equal(calls,1,testcase.label+" did not issue precisely one API request");
    assert.ok(elapsed<11000,testcase.label+" guide preflight exceeded bounded deadline: "+elapsed);
    assert.ok(String(lastRequest?.q||"").includes("полномошно"),testcase.label+" lost submitted question");
    evidence.push({bot:testcase.label,providerResponse:"mocked",apiRequests:calls,elapsedMs:elapsed,slowGuideBudgetMs:3500});
    await ctx.close();
  }
  console.log("R19 CANDIDATE DUAL-CHAT BROWSER PREFLIGHT: PASS");
  console.log(JSON.stringify({evidence,abortedSlowGuides},null,2));
}catch(error){
  console.error("R19 CANDIDATE DUAL-CHAT BROWSER PREFLIGHT: FAIL");
  console.error(String(error?.stack||error));
  console.error(JSON.stringify({evidence,abortedSlowGuides},null,2));
  process.exitCode=1;
}finally{
  if(browser)await browser.close().catch(()=>{});
  if(server.listening)await close();
}
