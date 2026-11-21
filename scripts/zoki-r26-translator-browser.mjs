import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json"};
const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname.endsWith("/"))pathname+="index.html";
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const body=await readFile(file);res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(body);}
  catch{res.writeHead(404);res.end("Not found");}
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,
    headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const context=await browser.newContext({serviceWorkers:"block",acceptDownloads:true});
  const page=await context.newPage();
  let mode="ok";const requests=[];
  await page.route("**/api/ui-translate",async route=>{
    const data=JSON.parse(route.request().postData()||"{}");
    requests.push(data);
    const answer=mode==="bad"
      ? {ok:true,translations:[{id:"wrong-id",text:"WRONG"}]}
      : {ok:true,provider:"synthetic_browser_mock",translationModel:"mock-no-cost",
         translations:[{id:data.items[0].id,text:data.targetLanguage==="mk"?"Добро утро":"Legal aid"}]};
    await route.fulfill({status:mode==="busy"?503:200,contentType:"application/json",
      headers:{"access-control-allow-origin":"*"},
      body:JSON.stringify(mode==="busy"?{ok:false,error:"ui_translation_provider_unavailable"}:answer)});
  });
  await page.goto(origin+"/translator.html",{waitUntil:"domcontentloaded",timeout:18000});
  await page.waitForSelector("#translatorForm",{timeout:8000});
  assert.equal(await page.locator("#targetLanguage option").count(),33);
  assert.equal(requests.length,0,"initial page cannot spend provider capacity");
  await page.locator("#sourceText").fill("Правна помош");
  await page.locator("#translateButton").click();
  await page.waitForFunction(()=>document.querySelector("#translated")?.value==="Legal aid",null,{timeout:12000});
  assert.equal(requests.length,1);
  assert.equal(requests[0].items[0].text,"Правна помош");
  assert.equal(requests[0].targetLanguage,"en");
  assert.match(await page.locator("#providerMeta").innerText(),/mock-no-cost/);
  const downloaded=page.waitForEvent("download",{timeout:10000});
  await page.locator("#saveResult").click();
  assert.match((await downloaded).suggestedFilename(),/translation-en\.txt/);
  await page.locator("#sourceLanguage").selectOption("en");
  await page.locator("#targetLanguage").selectOption("mk");
  await page.locator("#sourceText").fill("Good morning");
  await page.locator("#translateButton").click();
  await page.waitForFunction(()=>document.querySelector("#translated")?.value==="Добро утро",null,{timeout:12000});
  assert.equal(requests.at(-1).targetLanguage,"mk");
  mode="busy";
  await page.locator("#targetLanguage").selectOption("sq");
  await page.locator("#translateButton").click();
  await page.waitForFunction(()=>document.querySelector("#status")?.dataset.type==="error",null,{timeout:12000});
  assert.match(await page.locator("#status").innerText(),/503/);
  assert.equal(await page.locator("#translated").inputValue(),"");
  mode="bad";
  await page.locator("#translateButton").click();
  await page.waitForFunction(()=>document.querySelector("#status")?.dataset.type==="error",null,{timeout:12000});
  assert.equal(await page.locator("#translated").inputValue(),"");
  await page.locator("#targetLanguage").selectOption("en");
  const initialCalls=requests.length;
  await page.locator("#translateButton").click();
  assert.equal(requests.length,initialCalls,"EN->EN passthrough cannot call model");
  assert.match(await page.locator("#status").innerText(),/не е направен превод/);
  console.log("ZOKI R26 CHROMIUM PASS: explicit request, 33 target languages, MK→EN, EN→MK, 503, invalid-ID, TXT, same-language no-call");
  await context.close();
}catch(error){console.error("ZOKI R26 CHROMIUM FAIL",String(error?.stack||error));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}
