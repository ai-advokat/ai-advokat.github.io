// Browser-generated real-format downloads with fictional text, no provider spend.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";

const root=process.cwd();
const sample=[
  '<!doctype html><meta charset="utf-8"><title>R30 formats</title>',
  '<button id="make" type="button">Download</button><script type="module">',
  'import {normalizeCaseExportReport} from "/src/case-export.js";',
  'import {downloadCasePilotExport} from "/assets/casepilot-export.js";',
  'const report=normalizeCaseExportReport({',
  '  caseId:"CASE-SYNTHETIC",title:"Зоки — синтетички тест",',
  '  caseVersion:"r24",summary:"Правен одговор на македонски — работен нацрт.",',
  '  sections:[{id:"demo",title:"Проверка",items:[{heading:"Заклучок",text:"Само синтетички факти. Не е потврден правен извор.",status:"UNVERIFIED"}]}],',
  '  humanGate:{status:"pending"}',
  '},{mode:"working"});',
  'window.fixtureReady=true;',
  'document.querySelector("#make").addEventListener("click",()=>{',
  '  downloadCasePilotExport(report,window.formatUnderTest,{filename:"AI-Advokat-R30."+window.formatUnderTest})',
  '    .catch(error=>{window.exportError=String(error?.message||error);});',
  '});</script>'
].join("\n");
const mime={".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json",".html":"text/html; charset=utf-8"};
const server=createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
  if(pathname==="/__r24__"){
    res.writeHead(200,{"content-type":mime[".html"],"cache-control":"no-store"});res.end(sample);return;
  }
  const file=path.resolve(root,"."+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{
    const data=await readFile(file);
    res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});
    res.end(data);
  }catch{res.writeHead(404);res.end("missing");}
});
let browser=null;
const report=[];
try{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const ctx=await browser.newContext({acceptDownloads:true,serviceWorkers:"block",locale:"mk-MK"});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e?.message||e)));
  await page.goto(origin+"/__r24__",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.fixtureReady===true);
  for(const format of ["md","json","csv","docx","pdf","jpg"]){
    await page.evaluate(fmt=>{window.formatUnderTest=fmt;window.exportError=null;},format);
    const waiting=page.waitForEvent("download",{timeout:30000});
    await page.locator("#make").click();
    const download=await waiting;
    const filename=download.suggestedFilename();
    assert.ok(filename.endsWith("."+format),filename);
    const data=await readFile(await download.path());
    assert.ok(data.length>64,format+" produced empty file");
    if(format==="docx"){
      assert.equal(data[0],0x50);assert.equal(data[1],0x4b);
      assert.ok(data.toString("utf8").includes("синтетички"));
    }else if(format==="pdf"){
      assert.equal(data.subarray(0,5).toString("ascii"),"%PDF-");
    }else if(format==="jpg"){
      assert.equal(data[0],0xff);assert.equal(data[1],0xd8);
    }else if(format==="json"){
      const value=JSON.parse(data.toString("utf8"));
      assert.equal(value.humanGate.status,"pending");
      assert.match(value.title,/Зоки/);
    }else if(format==="csv"){
      assert.ok(data.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])));
      assert.match(data.toString("utf8"),/синтетички/);
    }else if(format==="md"){
      assert.match(data.toString("utf8"),/WORKING COPY.*HUMAN GATE/);
      assert.match(data.toString("utf8"),/синтетички/);
    }
    report.push({format,bytes:data.length,filename});
  }
  assert.equal(errors.length,0,"Browser errors: "+errors.join("; "));
  await ctx.close();
  console.log("R30 SIX-FORMAT CHROMIUM PASS "+JSON.stringify(report));
}catch(error){
  console.error("R24 BROWSER FILE/TRANSLATOR: FAIL",error?.stack||String(error));
  process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
