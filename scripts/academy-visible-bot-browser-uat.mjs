// Actual Chromium acceptance for Academy's visible AI ADVOKAT launcher.
// External Worker iframe is simulated; test never sends a real AI question.
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright-core";
const root=process.cwd();
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".mp4":"video/mp4"};
const server=createServer(async(req,res)=>{
 let name;
 try{name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);}catch{res.writeHead(400);res.end();return;}
 if(name.endsWith("/"))name+="index.html";
 const file=path.resolve(root,"."+name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const b=await readFile(file);res.writeHead(200,{"content-type":mime[path.extname(file)]||"application/octet-stream","cache-control":"no-store"});res.end(b);}
 catch{res.writeHead(404);res.end();}
});
let browser;
async function testSize(origin,width,height){
 const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});
 const page=await ctx.newPage();
 let requests=0;
 await page.route("https://ai-advokat-github-io.aiadvokat16.workers.dev/**",async route=>{
   requests++;
   await route.fulfill({status:200,contentType:"text/html; charset=utf-8",body:"<!doctype html><html lang='mk'><head><meta charset='utf-8'></head><body>СИНТЕТИЧКИ ТЕСТЕН BOT IFRAME</body></html>"});
 });
 await page.goto(origin+"/academy/",{waitUntil:"domcontentloaded",timeout:20000});
 const btn=page.locator("#academyChatLaunch");
 await btn.waitFor({state:"visible",timeout:15000});
 const hero=page.locator("#academyChatOpenHero");
 assert.equal(await hero.isVisible(),true);
 assert.equal(await page.locator("#academyChatDialog iframe").count(),0);
 assert.equal(requests,0,"Bot must be lazy and never make network requests before click");
 const fallback=page.locator('a[href="https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/"]');
 assert.ok(await fallback.count()>=2);
 assert.equal(await fallback.first().getAttribute("target"),"_blank");
 await btn.click();
 await page.locator("#academyChatDialog[open]").waitFor({timeout:10000});
 await page.locator("#academyChatDialog iframe").waitFor({state:"attached",timeout:10000});
 assert.equal(await page.locator("#academyChatDialog iframe").getAttribute("src"),"https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/");
 assert.match(await page.frameLocator("#academyChatDialog iframe").locator("body").innerText(),/СИНТЕТИЧКИ ТЕСТЕН BOT IFRAME/);
 // Browser executes the embedded external-origin frame with a synthetic response.
 assert.equal(requests,1);
 assert.equal(await btn.getAttribute("aria-expanded"),"true");
 await page.locator("#academyChatClose").click();
 assert.equal(await page.locator("#academyChatDialog[open]").count(),0);
 assert.equal(await btn.getAttribute("aria-expanded"),"false");
 // Opening from the hero reuses the same frame and does not duplicate a bot.
 await hero.click();
 assert.equal(await page.locator("#academyChatDialog iframe").count(),1);
 assert.equal(requests,1);
 await page.keyboard.press("Escape");
 assert.equal(await page.locator("#academyChatDialog[open]").count(),0);
 const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 if(horizontalOverflow){
   const diagnostic=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overshooting:[...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth+3).slice(0,8).map(el=>({tag:el.tagName,cls:el.className?.baseVal||el.className,id:el.id,right:Math.round(el.getBoundingClientRect().right)}))}));
   console.error("ACADEMY OVERFLOW",JSON.stringify(diagnostic));
 }
 assert.equal(horizontalOverflow,false,"Academy has no new horizontal overflow");
 await ctx.close();
 return {width,launcher:"visible",hero:"visible",lazyFrame:true,frameRequests:requests,close:true,escape:true};
}
try{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const origin="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const sizes=[];
 sizes.push(await testSize(origin,390,800));
 sizes.push(await testSize(origin,1280,800));
 console.log("ACADEMY BOT CHROMIUM PASS",JSON.stringify(sizes));
}catch(error){
 console.error("ACADEMY BOT CHROMIUM FAIL",String(error?.stack||error));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 await new Promise(resolve=>server.close(resolve));
}
