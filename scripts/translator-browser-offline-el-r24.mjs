import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright-core';
const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const abs=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(abs!==path.join(root,'index.html')&&!abs.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const file=await readFile(abs);
    res.writeHead(200,{'content-type':mime[path.extname(abs)]||'application/octet-stream','cache-control':'no-store'});
    res.end(file);
  }catch{res.writeHead(404);res.end('not found');}
});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  let aiCalls=0;
  await page.route('https://ai-advokat-github-io.aiadvokat16.workers.dev/**', async route=>{
    if(route.request().url().includes('/api/ui-translate'))aiCalls++;
    await route.fulfill({status:503,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ok":false,"error":"fixture_capacity_exhausted"}'});
  });
  await page.goto(origin+'/?lang=el',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>document.documentElement.dataset.translationScope==='offline_locale_draft',{timeout:15000});
  let state=await page.evaluate(()=>({
    lang:document.documentElement.lang,selected:document.querySelector('#langBtn')?.value,
    state:document.documentElement.dataset.translationState,
    sourceCalls:document.documentElement.dataset.translationBatches,
    title:document.querySelector('[data-i18n="topLine"]')?.textContent,
    hero:document.querySelector('[data-i18n="heroTitle"]')?.textContent,
    status:document.querySelector('#uiTranslationStatus')?.textContent,
    missing:document.documentElement.dataset.translationPendingUnits
  }));
  assert.equal(state.selected,'el');assert.equal(state.lang,'el');
  assert.equal(state.state,'partial');
  assert.equal(state.sourceCalls,'0');
  assert.ok(state.title?.includes('Νομική ενημερωτική πύλη'),JSON.stringify(state));
  assert.ok(state.hero?.includes('Το δίκαιο'),JSON.stringify(state));
  assert.equal(aiCalls,0,'Greek offline UI should not consume Workers AI quota');
  await page.evaluate(()=>{
    const node=document.createElement('span');node.id='r24-added-label';node.textContent='Правни извори';document.body.append(node);
    const safe=document.createElement('span');safe.id='r24-private';safe.dataset.private='';safe.textContent='Правни извори';document.body.append(safe);
  });
  await page.waitForFunction(()=>document.getElementById('r24-added-label')?.textContent==='Νομικές πηγές',{timeout:10000});
  assert.equal(await page.locator('#r24-private').textContent(),'Правни извори','private node must not be translated');
  assert.equal(aiCalls,0,'dynamic retranslation must remain offline');
  await page.selectOption('#langBtn','mk');
  await page.waitForURL(/lang=mk/,{timeout:15000});
  assert.equal(await page.locator('[data-i18n="topLine"]').textContent(),'Правен информациски портал · AI со проверливи извори · човечка контрола');
  console.log('R24 GREEK OFFLINE BROWSER PASS',JSON.stringify({elState:state,aiCalls,privateExcluded:true,restoredMk:true}));
} catch(e) {console.error('R24 GREEK OFFLINE BROWSER FAIL',e.stack||String(e));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}
