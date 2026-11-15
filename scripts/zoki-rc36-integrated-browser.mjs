import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
const root=process.cwd();
const contentType={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{res.writeHead(400);res.end();return;}
  if(pathname.endsWith("/"))pathname+="index.html";
  const filename=path.resolve(root,"."+pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{
    const buf=await readFile(filename);
    res.writeHead(200,{"content-type":contentType[path.extname(filename)]||"application/octet-stream","cache-control":"no-store"});
    res.end(buf);
  }catch{res.writeHead(404);res.end("Not found");}
});
let browser;
const modelRequests=[];
try{
  await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const context=await browser.newContext({acceptDownloads:true,serviceWorkers:"block"});
  await context.route("**/*",async route=>{
    if(route.request().url().startsWith(origin+"/"))await route.continue();
    else{
      if(route.request().method()==="POST")modelRequests.push(route.request().url());
      await route.abort();
    }
  });
  const page=await context.newPage();
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));
  await page.goto(origin+"/consolidator/",{waitUntil:"domcontentloaded",timeout:25000});
  await page.locator("#zrDemo").click();
  await page.waitForFunction(()=>document.querySelector("#zrResult")?.textContent?.includes("AI_ADVOKAT_ZOKI_RC36_WORKSPACE_V1"),null,{timeout:14000});
  let p=JSON.parse(await page.locator("#zrResult").innerText());
  assert.equal(p.preview.changes.length,1);
  assert.equal(p.preview.provisions[0].original,"Член 1\nСтар текст во пример.");
  assert.equal(p.preview.provisions[0].preview,"Член 1\nПредложен нов текст во пример.");
  assert.equal(p.legalApproval,false);assert.equal(p.production,"NO_GO");
  assert.equal(p.humanGate11,"OPEN");assert.equal(p.humanGate35,"OPEN");
  const dlPromise=page.waitForEvent("download");
  await page.locator("#zrExport").click();
  const dl=await dlPromise;
  assert.match(dl.suggestedFilename(),/^ZOKI_RC36_.*_REVIEW_ONLY\.json$/);
  const bytes=await readFile(await dl.path());
  assert.equal(JSON.parse(bytes.toString()).preview.changes.length,1);
  await page.locator("#zrImport").setInputFiles({name:"valid_workspace.json",mimeType:"application/json",buffer:bytes});
  await page.waitForFunction(()=>document.querySelector("#zrStatus")?.textContent?.includes("Рачно вчитан проект"),null,{timeout:10000});
  const bad=JSON.parse(bytes.toString());bad.legalApproval=true;
  await page.locator("#zrImport").setInputFiles({name:"forged_approval.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(bad))});
  await page.waitForFunction(()=>document.querySelector("#zrStatus")?.textContent?.includes("HOLD / ГРЕШКА"),null,{timeout:10000});
  assert.match(await page.locator("#zrStatus").innerText(),/недозволен статус/);
  await page.locator("#zrPublished").fill("2026-04-04");
  await page.locator("#zrForce").fill("2026-04-02");
  await page.locator("#zrPreview").click();
  await page.waitForFunction(()=>document.querySelector("#zrStatus")?.textContent?.includes("Погрешна хронологија"),null,{timeout:10000});
  await page.locator("#zrPublished").fill("2026-01-01");
  await page.locator("#zrForce").fill("2026-01-02");
  const evidence=Buffer.from("SYNTHETIC_ZOKI_PROVENANCE_ONLY");
  await page.locator("#zrEvidenceFile").setInputFiles({name:"synthetic.txt",mimeType:"text/plain",buffer:evidence});
  await page.waitForFunction(()=>document.querySelector("#zrEvidence")?.textContent?.includes("synthetic.txt"),null,{timeout:10000});
  const items=JSON.parse(await page.locator("#zrEvidence").innerText());
  assert.equal(items[0].sha256,createHash("sha256").update(evidence).digest("hex"));
  assert.equal(items[0].authenticity,"UNVERIFIED");
  await page.locator("#baseText").fill("Закон за синтетички пример\nЧлен 1\nСтар текст за тест");
  await page.locator("#zrFromV104").click();
  await page.waitForFunction(()=>document.querySelector("#zrStatus")?.textContent?.includes("Изворната одредба"),null,{timeout:10000});
  assert.match(await page.locator("#zrOriginal").inputValue(),/Стар текст за тест/);
  console.log("ZOKI RC36 BROWSER MAIN: PASS exact-edit, source unchanged, export/import, tamper hold, chronology, local SHA, v10.4 bridge");
  for(const [route,input] of [["/index.html","#aiChatInput"],["/bot/index.html","#question"]]){
    const p2=await context.newPage();
    await p2.goto(origin+route,{waitUntil:"domcontentloaded",timeout:25000});
    await p2.waitForSelector("[data-zoki-consolidator-entry]",{timeout:12000});
    await p2.locator("[data-zoki-consolidator-entry] summary").click();
    await p2.locator("[data-zoki-consolidator-entry] button").click();
    const value=await p2.locator(input).inputValue();
    assert.match(value,/Зоки RC36/);
    assert.match(value,/HG11\/HG35 OPEN/);
    assert.match(value,/Поставувај по ЕДНО прашање/);
    assert.equal(await p2.locator("[data-zoki-consolidator-entry] a").getAttribute("href"),"/consolidator/");
    console.log("ZOKI RC36 CHAT ENTRY "+route+": PASS manually staged one-at-a-time");
    await p2.close();
  }
  assert.deepEqual(modelRequests,[],"no model API post from any test without explicit user Send");
  console.log("ZOKI RC36 INTEGRATION ALL PASS; external model calls 0");
  if(pageErrors.length)console.log("UNRELATED_PAGE_ERRORS:",pageErrors.slice(0,3));
  await context.close();
}catch(e){
  console.error("ZOKI RC36 INTEGRATION FAILED:",String(e?.stack||e));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise(ok=>server.close(ok));
}
