// Real Chromium visual/semantic acceptance; AI endpoint responses are MOCKED.
// No model/provider calls, no confidential client data and no public deployment.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";
import {formatFamilyPrelitigationNotice} from "../src/family-prelitigation-notice.js";

const prompt="Да те замолам да ми направиш Опомена пред тужба за развод, со измислени имиња, однапред многу ти благодарам Сашо";
const answer=formatFamilyPrelitigationNotice(prompt);
assert.ok(answer?.startsWith("ОПОМЕНА / ПОКАНА"));
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
  let url;
  try{url=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
  if(url.endsWith("/"))url+="index.html";
  const file=path.resolve(root,"."+url);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{const bytes=await readFile(file);res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(bytes);}
  catch{res.writeHead(404);res.end("Not found");}
});
function rgb(hex){
  const matches=String(hex).match(/\d+(?:\.\d+)?/g)||[];
  return matches.slice(0,3).map(Number);
}
function lum(hex){
  const x=rgb(hex).map(v=>{v=v/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
  return x[0]*.2126+x[1]*.7152+x[2]*.0722;
}
function contrast(fg,bg){const l1=lum(fg),l2=lum(bg);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
let browser;
try{
  await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const results=[];
  for(const mode of ["light","dark"]){
    const context=await browser.newContext({locale:"mk-MK",serviceWorkers:"block",viewport:{width:mode==="light"?390:1280,height:800}});
    const page=await context.newPage();
    await page.addInitScript(theme=>{localStorage.setItem("aiadvokat-vnext-theme",theme);},mode);
    let requested=0;
    await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
      const req=route.request();
      const pathname=new URL(req.url()).pathname;
      if(pathname==="/api/bot" && req.method()==="POST"){
        const submitted=JSON.parse(req.postData()||"{}");
        assert.equal(submitted.q,prompt);
        requested++;
        await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*","access-control-allow-headers":"authorization,content-type"},body:JSON.stringify({
          ok:true,answer,provider:"canonical_corpus_no_model",model:null,
          displayMode:"canonical_family_pre_litigation_notice",
          sourceMode:"canonical_family_divorce_pre_litigation_notice_no_model",
          legalSources:[],sources:[],performance:{providerCalls:0}
        })});
      }else await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":true,"capabilities":{}}'});
    });
    await page.goto(origin+"/bot/index.html",{waitUntil:"domcontentloaded",timeout:25000});
    await page.waitForFunction(expected=>
      window.AIAdvokatCoreReady===true &&
      document.documentElement.classList.contains("professional-r7") &&
      document.documentElement.dataset.externalExperience==="conversation" &&
      document.documentElement.dataset.vnextTheme===expected,
      mode,{timeout:20000});
    const themeBefore=await page.evaluate(()=>{
      const computed=sel=>{const e=document.querySelector(sel);if(!e)return null;const cs=getComputedStyle(e);return {color:cs.color,bg:cs.backgroundColor,backgroundImage:cs.backgroundImage};};
      return {body:computed("body"),messages:computed("#messages"),welcome:computed("#welcome h1"),composer:computed("#composer"),question:computed("#question")};
    });
    assert.ok(contrast(themeBefore.welcome.color,themeBefore.messages.bg)>=4.5,"welcome must have readable foreground");
    assert.ok(contrast(themeBefore.question.color,themeBefore.composer.bg)>=4.5,"composer must have readable text");
    await page.locator("#question").fill(prompt);
    await page.locator("#send").click();
    await page.waitForFunction(()=>[...document.querySelectorAll("#messages .message.assistant .text")].some(x=>x.textContent.includes("ОПОМЕНА / ПОКАНА")),null,{timeout:25000});
    const computed=await page.evaluate(()=>{
      const assistant=[...document.querySelectorAll("#messages .message.assistant")].find(m=>m.querySelector(".text")?.textContent?.includes("ОПОМЕНА / ПОКАНА"));
      const user=document.querySelector("#messages .message.user");
      const answer=assistant.querySelector(".text");
      const locale=assistant.querySelector(".message-voice-lang");
      const messageBg=getComputedStyle(document.querySelector("#messages")).backgroundColor;
      return {
        text:getComputedStyle(answer).color,
        background:messageBg,
        userText:user?getComputedStyle(user.querySelector(".text")).color:null,
        userBg:user?getComputedStyle(user.querySelector(".text")).backgroundColor:null,
        selectText:locale?getComputedStyle(locale).color:null,
        selectBg:locale?getComputedStyle(locale).backgroundColor:null,
        content:answer.textContent,
        duration:assistant.querySelector(".ai-response-duration")?.textContent||""
      };
    });
    assert.ok(contrast(computed.text,computed.background)>=7,"answer contrast below 7:1");
    if(computed.userText && rgb(computed.userBg).length===3)assert.ok(contrast(computed.userText,computed.userBg)>=4.5,"question contrast below 4.5:1");
    assert.match(computed.content,/^ОПОМЕНА \/ ПОКАНА/);
    assert.doesNotMatch(computed.content,/III\. ТУЖБЕНО БАРАЊЕ/);
    // R29 isolated main hotfix does not bundle the independent R27 response timer.
    assert.equal(requested,1);
    results.push({mode,answerContrast:+contrast(computed.text,computed.background).toFixed(2),requested,quote:computed.content.slice(0,44)});
    await context.close();
  }
  console.log("ZOKI CONTRAST + EXACT NOTICE CHROMIUM PASS",JSON.stringify(results));
}catch(error){
  console.error("ZOKI CONTRAST + EXACT NOTICE CHROMIUM FAIL",String(error?.stack||error));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise(ok=>server.close(ok));
}
