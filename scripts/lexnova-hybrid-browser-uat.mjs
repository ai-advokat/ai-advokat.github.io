// LexNova Hybrid v1 Chromium acceptance (synthetic-only). No production/provider calls.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname.endsWith("/"))pathname+="index.html";
 const file=path.resolve(root,"."+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const buf=await readFile(file);res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(buf);}
 catch{res.writeHead(404);res.end("Not found");}
});
let browser;
async function docReview(origin){
 const context=await browser.newContext({viewport:{width:390,height:780},acceptDownloads:true});
 const page=await context.newPage();await page.goto(origin+"/lexnova-document-copilot.html",{waitUntil:"domcontentloaded"});
 await page.locator("#lexnovaLoadExample").click();
 await page.locator("#lexnovaCompare").click();
 await page.locator(".lexnova-review-change").first().waitFor({timeout:10000});
 const changes=await page.locator(".lexnova-review-change").count();
 assert.equal(changes,1);
 assert.equal(await page.locator("#lexnovaPrepare").isDisabled(),true);
 await page.locator(".lexnova-review-change select").first().selectOption("accept");
 assert.equal(await page.locator("#lexnovaPrepare").isEnabled(),true);
 await page.locator("#lexnovaPrepare").click();
 assert.match(await page.locator("#lexnovaApproved").inputValue(),/Рок: 15 дена/);
 const pending=page.waitForEvent("download",{timeout:15000});
 await page.locator("#lexnovaDownload").click();const download=await pending;
 assert.equal(download.suggestedFilename(),"LexNova_Document_Review.md");
 const data=await readFile(await download.path(),"utf8");
 assert.match(data,/Рок: 15 дена/);
 assert.match(data,/не е потпишан/);
 await page.locator("#lexnovaReset").click();
 assert.equal(await page.locator("#lexnovaOriginal").inputValue(),"");
 await context.close();
 return {surface:"document",changes,download:"md",privacy:"LOCAL_ONLY",ok:true};
}
async function quickChat(origin){
 const ctx=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:"block"});
 const page=await ctx.newPage();let iframeGets=0;
 await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
  if(new URL(route.request().url()).pathname==="/bot/")iframeGets++;
  await route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><html><head><meta charset='utf-8'></head><body>TRAINING synthetic iframe, provider not contacted</body></html>"});
 });
 await page.goto(origin+"/index.html",{waitUntil:"domcontentloaded"});
 await page.locator("#lexnovaQuickChatToggle").waitFor({timeout:15000});
 assert.equal(iframeGets,0,"QuickChat iframe should never load before explicit user action");
 await page.locator("#lexnovaQuickChatToggle").click();
 await page.locator("#lexnovaQuickChat[open]").waitFor({timeout:10000});
 await page.locator("#lexnovaQuickChat iframe").waitFor({timeout:10000});
 assert.ok((await page.locator("#lexnovaQuickChat iframe").getAttribute("src")).endsWith("/bot/"));
 assert.equal(await page.locator('#lexnovaQuickChat a[target="_blank"]').count(),1);
 await page.locator('#lexnovaQuickChat button[aria-label="Затвори Quick Chat"]').click();
 assert.equal(await page.locator("#lexnovaQuickChat[open]").count(),0);
 await ctx.close();
 return {surface:"quick_chat",iframeGets,modelCalls:0,ok:true};
}
async function handoffAndSource(origin){
 const context=await browser.newContext({serviceWorkers:"block",viewport:{width:390,height:800}});
 const page=await context.newPage();let botCalls=0;
 await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==="/api/bot" && route.request().method()==="POST"){
    botCalls++;
    await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({
      ok:true,answer:"СИНТЕТИЧКИ ОДГОВОР · работен нацрт, задолжителна адвокатска проверка.",
      provider:"canonical_corpus_no_model",
      sourceMode:"synthetic_qa_only",
      legalGovernance:{humanReviewRequired:true,executionAuthorization:"NO_EXTERNAL_ACTION"},
      humanGate:"Review before use; do not file automatically.",
      legalSources:[{title:"Примерен извор со непроверена редакција",url:"https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057",articles:["39"]}]
    })});
   }else await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":true,"capabilities":{}}'});
 });
 await page.goto(origin+"/bot/index.html",{waitUntil:"domcontentloaded",timeout:25000});
 await page.waitForFunction(()=>window.AIAdvokatCoreReady===true,null,{timeout:25000});
 await page.locator("#question").fill("Направи работен текст со измислени лица, без оригинален предмет.");
 await page.locator("#send").click();
 await page.locator(".message.assistant .lexnova-handoff-trigger").last().waitFor({timeout:20000});
 assert.equal(botCalls,1);
 await page.locator(".message.assistant .lexnova-source-card").last().waitFor({timeout:10000});
 assert.match(await page.locator(".lexnova-source-card").last().innerText(),/не е потврдена/);
 await page.locator(".message.assistant .lexnova-handoff-trigger").last().click();
 await page.locator("#lexnovaHandoffDialog[open]").waitFor();
 assert.equal(await page.locator("#lexnovaHandoffContent").inputValue(),"");
 assert.equal(await page.locator("#lexnovaHandoffCopy").isDisabled(),true);
 await page.locator("#lexnovaHandoffInclude").click();
 assert.match(await page.locator("#lexnovaHandoffContent").inputValue(),/СИНТЕТИЧКИ ОДГОВОР/);
 assert.equal(await page.locator("#lexnovaHandoffCopy").isDisabled(),true);
 await page.locator("#lexnovaHandoffConsent").check();
 assert.equal(await page.locator("#lexnovaHandoffDownload").isEnabled(),true);
 await page.locator("#lexnovaHandoffClose").click();
 assert.equal(await page.locator("#lexnovaHandoffDialog[open]").count(),0);
 await context.close();
 return {surface:"handoff_source",botCalls,externalSendCount:1,localOnly:true,ok:true};
}
try{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const results=[await docReview(origin),await quickChat(origin),await handoffAndSource(origin)];
 console.log("LEXNOVA HYBRID CHROMIUM PASS",JSON.stringify(results));
}catch(error){
 console.error("LEXNOVA HYBRID CHROMIUM FAIL",String(error?.stack||error));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 await new Promise(resolve=>server.close(resolve));
}
