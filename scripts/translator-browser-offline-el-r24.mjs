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
    missing:document.documentElement.dataset.translationPendingUnits,
    preserved:document.documentElement.dataset.translationSourcePreserved
  }));
  assert.equal(state.selected,'el');assert.equal(state.lang,'el');
  assert.equal(state.state,'partial');
  assert.equal(state.sourceCalls,'0');
  assert.ok(state.title?.includes('Νομική ενημερωτική πύλη'),JSON.stringify(state));
  assert.ok(state.hero?.includes('Το δίκαιο'),JSON.stringify(state));
  assert.equal(aiCalls,0,'Greek offline UI should not consume Workers AI quota');
  assert.equal(state.missing,'0','eligible Greek UI must have no untranslated Macedonian labels');
  assert.ok(Number(state.preserved)>=7,'source-authentic DOI citations must remain intentionally unmodified');

  await page.evaluate(()=>{
    const node=document.createElement('span');node.id='r24-added-label';node.textContent='Правни извори';document.body.append(node);
    const safe=document.createElement('span');safe.id='r24-private';safe.dataset.private='';safe.textContent='Правни извори';document.body.append(safe);
  });
  await page.waitForFunction(()=>document.getElementById('r24-added-label')?.textContent==='Νομικές πηγές',{timeout:10000});
  assert.equal(await page.locator('#r24-private').textContent(),'Правни извори','private node must not be translated');
  assert.equal(aiCalls,0,'dynamic retranslation must remain offline');
  // R25: the law workspace is excluded from generic DOM translation because
  // it contains authoritative legal source data. Explicit T(mk,en) UI labels
  // must be localised using the offline dictionary without translating sources.
  await page.locator('#lawsCard .cardAction').click();
  await page.waitForFunction(()=>document.querySelector('#workspaceTitle')?.textContent?.includes('Νόμοι'),{timeout:12000});
  const lawUi=await page.evaluate(()=>({
    title:document.querySelector('#workspaceTitle')?.textContent||'',
    tag:document.querySelector('#workspaceTag')?.textContent||'',
    note:document.querySelector('#workspaceText')?.textContent||'',
    body:document.querySelector('#lawRegistryList')?.textContent||'',
    source:document.querySelector('#lawRegistryList [data-key="mk:zro"]')?.textContent||''
  }));
  assert.match(lawUi.title,/Νόμοι/,'law workspace title must be Greek');
  assert.match(lawUi.tag,/Επίπεδα/,'law workspace hierarchy must be Greek');
  assert.match(lawUi.note,/Οι νόμοι/,'law workspace explanation must be Greek');
  assert.match(lawUi.body,/μητρώο|Μητρώο/,'law registry unavailable notice must be Greek');
  assert.match(lawUi.source,/Закон за работните односи/,'official law title must remain in Macedonian');
  assert.equal(aiCalls,0,'legal UI localisation must not spend Workers AI quota');
  await page.locator('#lawRegistryList [data-key="mk:zro"]').click();
  await page.waitForFunction(()=>document.querySelector('#lawArticleSearchBtn')?.textContent?.includes('Αναζήτηση'),{timeout:12000});
  assert.match(await page.locator('#lawArticleQuery').getAttribute('placeholder'),/Αναζήτηση άρθρου/);
  assert.equal(aiCalls,0,'law browser labels must not call AI translator');

  await page.selectOption('#langBtn','mk');
  await page.waitForURL(/lang=mk/,{timeout:15000});
  assert.equal(await page.locator('[data-i18n="topLine"]').textContent(),'Правен информациски портал · AI со проверливи извори · човечка контрола');
  console.log('R24 GREEK OFFLINE BROWSER PASS',JSON.stringify({elState:state,aiCalls,privateExcluded:true,restoredMk:true}));
} catch(e) {console.error('R24 GREEK OFFLINE BROWSER FAIL',e.stack||String(e));process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve));}
