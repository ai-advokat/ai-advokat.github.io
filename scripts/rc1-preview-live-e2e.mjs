// Preview E2E acceptance. Dedicated public test endpoint, no production deployment.
// One real small SQ UI translation and one synthetic voice WAV maximum per CI run.
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {chromium} from "playwright-core";

const preview=String(process.env.PREVIEW_URL||"").replace(/\/+$/,"");
const expected="https://release-ai-advokat-unified-rc1-20261114-ai-advokat-github-io.aiadvokat16.workers.dev";
if(preview!==expected)throw new Error("Refusing unknown or production URL for Preview E2E");
const report={version:"AI_ADVOKAT_RC1_PREVIEW_LIVE_E2E_V1",timestamp:new Date().toISOString(),githubSha:process.env.GITHUB_SHA||null,
  target:preview,checks:[],testData:"synthetic only; no private cases or client audio",providerCalls:{translation:0,voice:0}};
const reportPath="/tmp/ai-advokat-rc1-preview-e2e.json";
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const sha256=text=>createHash("sha256").update(text).digest("hex");
const redactedError=e=>String(e?.message||e||"unknown").slice(0,380);
async function run(name,fn,{skip=false}={}){
  if(skip){report.checks.push({name,status:"NOT_TESTED",reason:"Exact Preview SHA/byte parity failed or was not confirmed"});return null}
  const start=Date.now();
  try{const detail=await fn();report.checks.push({name,status:"PASS",ms:Date.now()-start,detail:detail||null});console.log("PASS",name,JSON.stringify(detail||{}).slice(0,600));return detail||{}}
  catch(e){const msg=redactedError(e);report.checks.push({name,status:"FAIL",ms:Date.now()-start,error:msg});console.error("FAIL",name,msg);return null}
}
async function get(path){
  const url=new URL(path,preview+"/");
  url.searchParams.set("rc1_preview_e2e",String(Date.now()));
  const res=await fetch(url,{headers:{"cache-control":"no-cache","accept":"*/*"},signal:AbortSignal.timeout(30000)});
  const content=await res.text();
  if(res.status!==200)throw new Error(path+" HTTP "+res.status+" "+content.slice(0,70));
  return {status:res.status,content,headers:res.headers};
}
let parityOk=false;
await run("exact_preview_root_byte_parity",async()=>{
  let last=null;
  for(let attempt=1;attempt<=8;attempt++){
    try{
      const live=await get("/");
      const original=fs.readFileSync("index.html","utf8");
      const actual=sha256(live.content),want=sha256(original);
      if(actual===want){parityOk=true;return {attempt,bytes:live.content.length,sha256:actual,githubSha:report.githubSha}}
      last="byte parity mismatch expected "+want.slice(0,16)+" got "+actual.slice(0,16);
    }catch(e){last=redactedError(e)}
    if(attempt<8)await pause(3000);
  }
  throw new Error("Preview not at checked-out PR HEAD: "+last);
});
const staticPages=[
 ["AI_Contract_PRO","/ai-contract.html","ai-contract.html"],
 ["Quick_Review","/contract-intelligence.html","contract-intelligence.html"],
 ["Consolidator_v104","/consolidator/","consolidator/index.html"],
 ["External_Bot","/bot/","bot/index.html"],
 ["Three_Official_Laws","/official-law-library.html","official-law-library.html"],
 ["Law_Manifest","/data/official-law-texts/manifest.json","data/official-law-texts/manifest.json"],
 ["Law_Browser_JS","/assets/official-law-library.mjs","assets/official-law-library.mjs"]
];
await run("seven_static_routes_exact_head",async()=>{
 const result=[];
 for(const [name,path,file] of staticPages){
  const live=await get(path);
  const original=fs.readFileSync(file,"utf8");
  assert.equal(sha256(live.content),sha256(original),name+" live != PR HEAD");
  result.push({name,status:200,parity:true,bytes:live.content.length});
 }
 return {routes:result};
},{skip:!parityOk});
await run("new_ZPP_519_article_source_live",async()=>{
 const index=JSON.parse((await get("/data/official-law-texts/zpp-151-2026-article-index.json")).content);
 assert.equal(index.article_count,519);
 assert.equal(index.articles.length,519);
 assert.equal(index.articles[183].pdf_page,47);
 assert.equal(index.articles[518].pdf_page,123);
 return {articles:index.articles.length,article184PdfPage:47,article519PdfPage:123};
},{skip:!parityOk});
await run("public_capabilities_endpoint",async()=>{
 const response=await fetch(preview+"/api/capabilities",{headers:{accept:"application/json"},signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));
 assert.equal(response.status,200,"HTTP "+response.status);
 return {status:response.status,keys:Object.keys(data).slice(0,12)};
},{skip:!parityOk});
await run("real_SQ_UI_provider_one_short_batch",async()=>{
 assert.equal(report.providerCalls.translation,0,"provider cap");
 report.providerCalls.translation++;
 const before="Правни извори и судска пракса";
 const response=await fetch(preview+"/api/ui-translate",{
   method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({targetLanguage:"sq",items:[{id:"preview-1",text:before}]}),
   signal:AbortSignal.timeout(65000)
 });
 const data=await response.json().catch(()=>({}));
 if(response.status!==200||data.ok!==true)throw new Error("HTTP "+response.status+" error="+String(data.error||"unknown"));
 assert.ok(Array.isArray(data.translations)&&data.translations.length===1,"translation row count");
 assert.equal(data.translations[0].id,"preview-1","translation ID mismatch");
 const result=String(data.translations[0].text||"").trim();
 assert.ok(result&&result!==before,"untranslated or empty");
 return {http:response.status,provider:String(data.provider||"unspecified"),model:String(data.translationModel||"unspecified"),nonEmpty:true,changed:true};
},{skip:!parityOk});
await run("voice_api_preflight_preview",async()=>{
 const response=await fetch(preview+"/api/voice/transcribe",{
   method:"OPTIONS",headers:{"Origin":preview,"Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"content-type,x-voice-language"},
   signal:AbortSignal.timeout(10000)});
 assert.equal(response.status,204,"HTTP "+response.status);
 return {status:response.status,allowOrigin:response.headers.get("access-control-allow-origin")||"same-origin-only"};
},{skip:!parityOk});
await run("real_voice_AI_one_synthetic_WAV",async()=>{
 assert.equal(report.providerCalls.voice,0,"voice cap");
 const wav=fs.readFileSync(process.env.MIC_AUDIO_FILE||"/tmp/ai-advokat-mic-test.wav");
 assert.ok(wav.length>1000&&wav.length<2*1024*1024,"audio fixture size");
 report.providerCalls.voice++;
 const response=await fetch(preview+"/api/voice/transcribe",{
   method:"POST",headers:{"Content-Type":"audio/wav","X-Voice-Language":"en-US","Accept":"application/json"},
   body:wav,signal:AbortSignal.timeout(60000)
 });
 const data=await response.json().catch(()=>({}));
 if(response.status!==200||data.ok!==true)throw new Error("HTTP "+response.status+" error="+String(data.error||"unknown"));
 assert.equal(data.provider,"workers_ai");
 assert.equal(data.retention,"no_application_storage");
 assert.equal(data.humanGate,"review_transcript_before_legal_use");
 assert.ok(String(data.text||"").trim().length>=3,"empty transcript");
 return {http:response.status,provider:data.provider,model:data.model,transcriptNonempty:true,syntheticBytes:wav.length};
},{skip:!parityOk});

let browser=null;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,
   args:["--no-sandbox","--disable-dev-shm-usage","--use-fake-ui-for-media-stream","--use-fake-device-for-media-stream"]});
 await run("real_preview_browser_MK_to_SQ_synthetic_provider",async()=>{
   const context=await browser.newContext({locale:"mk-MK",serviceWorkers:"block"});
   const page=await context.newPage();
   let mocks=0;
   await page.route("**/api/**",async route=>{
     const u=route.request().url();
     if(u.includes("/api/ui-translate")){
       mocks++;
       const items=JSON.parse(route.request().postData()||"{}").items||[];
       const translations=items.map(x=>({id:String(x.id),text:"SQ_FIXTURE_"+String(x.text||"").slice(0,24)})).reverse();
       await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,translations,provider:"e2e_mock"})});
     }else await route.fulfill({status:503,contentType:"application/json",body:'{"ok":false,"error":"synthetic_test_blocked"}'});
   });
   await page.goto(preview+"/?lang=mk",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForSelector("#langBtn",{timeout:20000});
   assert.ok(await page.locator("#aiChatMic").count(),"internal bot microphone missing");
   await page.selectOption("#langBtn","sq");
   await page.waitForURL(/(?:[?&])lang=sq(?:&|$)/,{timeout:18000});
   await page.waitForFunction(()=> {
     const state=document.documentElement.dataset.translationState;
     const translated=document.querySelector("[data-i18n='topLine']")?.textContent||"";
     return (state==="ready"||state==="partial")&&translated.startsWith("SQ_FIXTURE_");
   },{timeout:80000});
   const state=await page.evaluate(()=>({
      lang:document.documentElement.lang,selected:document.querySelector("#langBtn")?.value,
      state:document.documentElement.dataset.translationState,scope:document.documentElement.dataset.translationScope,
      batches:Number(document.documentElement.dataset.translationBatches||0),
      completed:Number(document.documentElement.dataset.translationBatchesCompleted||0),
      status:document.getElementById("uiTranslationStatus")?.textContent?.slice(0,130)||""
   }));
   assert.equal(state.lang,"sq");
   assert.equal(state.selected,"sq");
   assert.ok(mocks>0 && mocks<=48,"unexpected batch count "+mocks);
   assert.ok(state.batches<=48);
   await page.screenshot({path:"/tmp/ai-advokat-preview-SQ-UI.png",fullPage:false}).catch(()=>{});
   await context.close();
   return {state,mockedProviderRequests:mocks,transport:"synthetic; NOT live provider E2E"};
 },{skip:!parityOk});
 await run("real_preview_browser_microphone_fallback_synthetic_503",async()=>{
   const context=await browser.newContext({permissions:["microphone"],serviceWorkers:"block"});
   await context.addInitScript(()=>{
     try{Object.defineProperty(window,"webkitSpeechRecognition",{value:undefined,configurable:true})}catch{}
     try{Object.defineProperty(window,"SpeechRecognition",{value:undefined,configurable:true})}catch{}
   });
   const page=await context.newPage();
   let fakeVoiceCalls=0;
   await page.route("**/api/**",async route=>{
     if(route.request().url().includes("/api/voice/transcribe")){
       fakeVoiceCalls++;
       await route.fulfill({status:503,contentType:"application/json",body:'{"ok":false,"error":"voice_transcription_capacity_exhausted"}'});
     }else await route.fulfill({status:503,contentType:"application/json",body:'{"ok":false,"error":"synthetic_test_blocked"}'});
   });
   await page.goto(preview+"/?lang=mk",{waitUntil:"domcontentloaded",timeout:45000});
   const mic=page.locator("#aiChatMic");
   await mic.waitFor({timeout:20000});
   await page.waitForFunction(()=>document.querySelector("#aiChatMic")?.disabled===false,{timeout:25000});
   await mic.click();
   await page.waitForFunction(()=>document.querySelector("#aiChatMic")?.dataset.voiceState==="listening",{timeout:15000});
   await page.waitForTimeout(1000);
   await mic.click();
   await page.waitForFunction(()=>/исцрпена|пишување/i.test(document.querySelector("#aiChatVoiceStatus")?.textContent||""),{timeout:30000});
   const state=await page.evaluate(()=>({
     micState:document.querySelector("#aiChatMic")?.dataset.voiceState,
     status:document.querySelector("#aiChatVoiceStatus")?.textContent?.slice(0,230),
     micDisabled:document.querySelector("#aiChatMic")?.disabled
   }));
   assert.equal(fakeVoiceCalls,1,"exactly one synthetic browser voice request");
   assert.equal(state.micDisabled,false);
   await page.screenshot({path:"/tmp/ai-advokat-preview-voice-503.png",fullPage:false}).catch(()=>{});
   await context.close();
   return {state,mockedVoiceRequests:fakeVoiceCalls,transport:"simulated 503; tests UI recovery, not live provider"};
 },{skip:!parityOk});
} catch(err){report.checks.push({name:"browser_runner_initialization",status:"FAIL",error:redactedError(err)});console.error("BROWSER_SETUP_FAIL",redactedError(err))}
finally{if(browser)await browser.close().catch(()=>{})}
report.summary={passed:report.checks.filter(c=>c.status==="PASS").length,
 failed:report.checks.filter(c=>c.status==="FAIL").length,
 notTested:report.checks.filter(c=>c.status==="NOT_TESTED").length,
 status:report.checks.every(c=>c.status==="PASS")?"PASS":"NOT_READY"};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
console.log("AI_ADVOCAT_RC1_PREVIEW_LIVE_E2E_SUMMARY",JSON.stringify(report.summary));
if(report.summary.status!=="PASS")process.exitCode=1;
