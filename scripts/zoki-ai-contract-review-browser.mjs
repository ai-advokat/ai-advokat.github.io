import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
const base=process.cwd();
const payload=Buffer.from("ZOKI_ARCHIVE_SHA_PROBE_SYNTHETIC_20261115");
const digest=crypto.createHash("sha256").update(payload).digest("hex");
const files={"/ai-contract-zoki-20261115-review.html":"text/html","/assets/ai-contract-zoki-review.mjs":"text/javascript","/data/ai-contract-zoki-rc128-rc187-intake.json":"application/json"};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1").pathname;
  if(!files[url]){res.writeHead(404);res.end();return;}
  try{
    let body=await readFile(path.join(base,url));
    if(url.endsWith(".json")){
      const m=JSON.parse(body.toString("utf8"));
      m.sources[0].archiveSha256=digest;
      body=Buffer.from(JSON.stringify(m));
    }
    res.writeHead(200,{"content-type":files[url]+"; charset=utf-8","cache-control":"no-store"});
    res.end(body);
  }catch{res.writeHead(500);res.end();}
});
let browser;
try{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const origin="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage();
 const leaks=[],jsErrors=[];
 page.on("request",q=>{if(!q.url().startsWith(origin))leaks.push(q.url());});
 page.on("pageerror",e=>jsErrors.push(String(e)));
 await page.goto(origin+"/ai-contract-zoki-20261115-review.html",{waitUntil:"domcontentloaded",timeout:18000});
 await page.waitForFunction(()=>document.querySelectorAll("#models > div").length===6,null,{timeout:9000});
 assert.match(await page.locator("body").innerText(),/0 правно одобрени/);
 await page.locator("#archiveFile").setInputFiles({name:"RC128_OK.zip",mimeType:"application/zip",buffer:payload});
 await page.waitForFunction(()=>document.querySelector("#zipResult")?.textContent?.includes("SHA-256 PASS"),null,{timeout:10000});
 await page.locator("#archiveFile").setInputFiles({name:"bad.zip",mimeType:"application/zip",buffer:Buffer.from("bad-archive")});
 await page.waitForFunction(()=>document.querySelector("#zipResult")?.textContent?.includes("НЕ СЕ СОВПАЃА"),null,{timeout:10000});
 assert.deepEqual(leaks,[],"no external network or provider call permitted");
 assert.deepEqual(jsErrors,[],"no browser JavaScript errors");
 await page.close();
 console.log("ZOKI CONTRACT INTAKE CHROMIUM PASS: six models, 0/28, SHA-positive, SHA-negative, zero outbound calls");
}catch(e){console.error("ZOKI CONTRACT INTAKE CHROMIUM FAIL:",String(e?.stack||e));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(ok=>server.close(ok));}
