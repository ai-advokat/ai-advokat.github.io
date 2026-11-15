// R19 pre-deploy real-browser acceptance on the exact PR source.
// Serves the repo's index.html locally; mocks only the translation transport.
// This is *not* a live provider acceptance substitute.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";

const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ico":"image/x-icon",".jpg":"image/jpeg",".woff2":"font/woff2"};
const server=createServer(async(req,res)=>{
  let target;
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
    target=path.resolve(root,"."+((pathname==="/"||pathname==="")?"/index.html":pathname));
    if(target!==path.join(root,"index.html")&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await readFile(target);
    res.writeHead(200,{"content-type":mime[path.extname(target)]||"application/octet-stream","cache-control":"no-store"});
    res.end(bytes);
  }catch{res.writeHead(404);res.end("not found");}
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const close=()=>new Promise(resolve=>server.close(resolve));
const report=[];
let browser;
try{
  await listen();
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const scenario of ["complete","partial","rtl-partial","row-mismatch","oversize-priority"]){
    const targetLanguage=scenario==="rtl-partial"?"ar":"sq";
    const translatedMarker=scenario==="rtl-partial"?"اختبار_":"SQ_TEST_";
    const context=await browser.newContext({locale:"mk-MK",serviceWorkers:"block"});
    const page=await context.newPage();
    // Capture the exact user-visible source before asynchronous provider rows
    // arrive: a reordered provider response may NEVER corrupt that text.
    await page.addInitScript((injectOversize)=>document.addEventListener("DOMContentLoaded",()=>{
      window.__r24OriginalTopLine=document.querySelector("[data-i18n='topLine']")?.textContent||"";
      if(injectOversize){
        // A >1200-character priority source is intentionally not sent to the
        // Worker. It must not indefinitely block other verified translations.
        const header=document.querySelector("header");
        if(header){
          const fixture=document.createElement("span");
          fixture.textContent="Долг тест текст за приоритетен приказ. ".repeat(48);
          fixture.setAttribute("data-fixture-oversize-priority","true");
          header.prepend(fixture);
        }
      }
    }),scenario==="oversize-priority");
    const pageErrors=[],network=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e).slice(0,300)));
    page.on("console",m=>{if(m.type()==="error")pageErrors.push(m.text().slice(0,220));});
    let requests=0;
    await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
      const req=route.request(),url=req.url();
      if(!url.includes("/api/ui-translate")){
        await route.fulfill({status:503,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":false,"error":"fixture_unavailable"}'});
        return;
      }
      const n=++requests;
      let items=[];
      try{items=JSON.parse(req.postData()||"{}").items||[];}catch{}
      const forcedFailure=["partial","rtl-partial"].includes(scenario)&&n>12;
      const malformedRows=scenario==="row-mismatch"&&n>12;
      network.push({batch:n,count:items.length,status:forcedFailure?503:200,malformedRows});
      if(forcedFailure){
        await route.fulfill({status:503,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:'{"ok":false,"error":"fixture_provider_limit"}'});
      }else{
        // Valid rows are deliberately REVERSED to detect positional coupling;
        // malformed rows omit an ID to ensure the entire batch is rejected.
        const translations=items.map(row=>({id:String(row.id),text:translatedMarker+String(row.text||"").slice(0,24)})).reverse();
        if(malformedRows && translations.length) translations.pop();
        await route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify({ok:true,translations,provider:"fixture"})});
      }
    });
    // Reproduce the user's actual selector change instead of just writing localStorage.
    await page.goto(origin+"/",{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForSelector("#langBtn",{timeout:20000});
    await page.selectOption("#langBtn",targetLanguage);
    await page.waitForURL(new RegExp("(?:[?&])lang="+targetLanguage+"(?:&|$)"),{timeout:18000});
    // Default translation is quota-safe priority shell only (<=6 batches).
    // A full DOM pass requires a real user click; exercise that explicit path
    // for complete and provider-integrity failure acceptance.
    await page.waitForFunction(()=>
      document.documentElement.dataset.translationState==="partial" &&
      document.getElementById("uiTranslationFullPage")?.hidden===false,
      null,{timeout:90000}
    );
    const firstPass=await page.evaluate(()=>({
      requests:Number(document.documentElement.dataset.translationBatches||"0"),
      state:document.documentElement.dataset.translationState
    }));
    assert.ok(firstPass.requests<=6,"initial full-page translation exhausted the bounded free budget");
    if(["complete","partial","rtl-partial","row-mismatch"].includes(scenario)){
      await page.locator("#uiTranslationFullPage").click();
    }
    // Do not mistake a correct in-progress PARTIAL shell for final READY.
    // In the failure scenario, wait for the actual surfaced capacity error.
    await page.waitForFunction(kind=>{
      const state=document.documentElement.dataset.translationState;
      const status=document.getElementById("uiTranslationStatus")?.textContent||"";
      return kind==="complete" ? state==="ready" : (state==="partial"&&status.includes("Делумен"));
    },scenario,{timeout:90000});
    const originalTopLine=await page.evaluate(()=>String(window.__r24OriginalTopLine||""));
    const state=await page.evaluate(()=>({
      lang:document.documentElement.lang,
      dir:document.documentElement.dir,
      selected:document.querySelector("#langBtn")?.value,
      target:document.documentElement.dataset.translationTarget,
      state:document.documentElement.dataset.translationState,
      scope:document.documentElement.dataset.translationScope,
      status:document.getElementById("uiTranslationStatus")?.textContent||"",
      shell:document.querySelector("[data-i18n='topLine']")?.textContent||"",
      nav:document.querySelector("[data-i18n='navSources']")?.textContent||"",
      navArchitecture:document.querySelector("[data-i18n='navArchitecture']")?.textContent||"",
      progress:document.documentElement.dataset.translationBatchesCompleted||"",
      batches:document.documentElement.dataset.translationBatches||""
    }));
    assert.equal(state.selected,targetLanguage,"visible language selector was reverted");
    assert.equal(state.target,targetLanguage,"site-language request did not propagate");
    assert.ok(requests>0,"the browser never called /api/ui-translate");
    // 48 requests/language/hour is enforced by the Worker. Never ship a
    // full-page pass that requires more requests than its own hourly cap.
    const plannedBatches=Number(state.batches||0);
    assert.ok(plannedBatches>0&&plannedBatches<=48,
      "page translation requires "+plannedBatches+" batches, exceeding the 48/hour language cap");
    assert.ok(requests<=48,"browser exceeded the 48/hour language cap");
    assert.ok(firstPass.requests<=6,"automatic translation must remain within the quota-safe initial budget");
    if(scenario==="complete"){
      assert.equal(state.state,"ready",JSON.stringify({state,network}));
      assert.equal(state.lang,"sq","completed translation must identify its language");
      assert.equal(state.dir,"ltr","completed Albanian translation must be LTR");
      assert.equal(state.shell,"Portal informativ juridik · AI me burime të verifikueshme · kontroll njerëzor",
        "reviewed zero-Neuron SQ shell did not survive full translation");
      assert.equal(state.nav,"Burime juridike","reviewed zero-Neuron SQ navigation changed unexpectedly");
      assert.ok(state.navArchitecture.includes(translatedMarker),
        "uncurated navigation failed model translation / reordered row-ID acceptance");
      assert.match(originalTopLine,/Правен информациски портал/,
        "original Macedonian source fingerprint unexpectedly changed");
    }else{
      assert.equal(state.state,"partial",JSON.stringify({state,network}));
      assert.equal(state.scope,"visible_shell_partial");
      assert.equal(state.lang,targetLanguage,"partial shell must keep the selected language");
      assert.equal(state.dir,targetLanguage==="ar"?"rtl":"ltr","partial shell must preserve target direction");
      assert.ok(state.status.includes("Делумен")||state.status.includes("превод"),"partial translation must be disclosed");
      const curatedSQ=targetLanguage==="sq"
        && state.shell==="Portal informativ juridik · AI me burime të verifikueshme · kontroll njerëzor"
        && state.nav==="Burime juridike";
      assert.ok(curatedSQ||state.shell.includes(translatedMarker)||state.nav.includes(translatedMarker),
        "verified visible shell has neither reviewed static nor provider translation");
      if(scenario==="row-mismatch") assert.ok(network.some(row=>row.malformedRows),
        "missing-ID fixture never exercised response integrity guard");
    }
    report.push({scenario,...state,translationRequests:requests,failedResponses:network.filter(r=>r.status!==200).length,nonFatalPageErrors:pageErrors.slice(0,5)});
    await context.close();
  }
  console.log("R19 CANDIDATE BROWSER TRANSLATOR: PASS");
  console.log(JSON.stringify(report,null,2));
}catch(error){
  console.error("R19 CANDIDATE BROWSER TRANSLATOR: FAIL");
  console.error(String(error?.stack||error));
  console.error(JSON.stringify(report,null,2));
  process.exitCode=1;
}finally{
  if(browser) await browser.close().catch(()=>{});
  if(server.listening) await close();
}
