import fs from "node:fs";

const API_BASE=process.env.LIVE_TRANSLATOR_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev";
const ROOT_URL=process.env.LIVE_ROOT_URL||"https://ai-advokat.github.io/";
const report={
  version:"AI_ADVOCAT_TRANSLATOR_LAYERED_ACCEPTANCE_V2",
  testedAt:new Date().toISOString(),
  apiBase:API_BASE,
  rootUrl:ROOT_URL,
  layers:[]
};

async function probeTranslation({name,targetLanguage,text,expectedProvider,expectedModel}){
  const startedAt=Date.now();
  let response=null,data=null,error=null;
  try{
    response=await fetch(API_BASE+"/api/ui-translate",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        "Origin":"https://ai-advokat.github.io",
        "accept":"application/json"
      },
      body:JSON.stringify({targetLanguage,items:[{id:"0",text}]}),
      signal:AbortSignal.timeout(60000)
    });
    try{data=await response.json();}catch(parseError){error="invalid_json:"+String(parseError?.message||parseError);}
  }catch(fetchError){
    error="network:"+String(fetchError?.message||fetchError);
  }
  const translated=String(data?.translations?.[0]?.text||"").trim();
  const provider=String(data?.provider||"");
  const model=String(data?.translationModel||"");
  const pass=Boolean(
    response?.status===200
    && data?.ok===true
    && translated
    && translated!==text
    && (!expectedProvider || expectedProvider.includes(provider))
    && (!expectedModel || model===expectedModel)
  );
  const row={
    name,
    pass,
    httpStatus:response?.status||null,
    targetLanguage,
    provider:provider||null,
    translationModel:model||null,
    source:text,
    translated:translated||null,
    latencyMs:Date.now()-startedAt,
    error:error||data?.error||null,
    detail:data?.detail||null,
    fallbackError:data?.fallbackError||null,
    fallbackStatus:data?.fallbackStatus||null,
    fallbackDetail:data?.fallbackDetail||null
  };
  report.layers.push(row);
  console.log(JSON.stringify(row));
  return row;
}

await probeTranslation({
  name:"layer_1_m2m100_direct",
  targetLanguage:"en",
  text:"Правни извори",
  expectedProvider:["m2m100"],
  expectedModel:"@cf/meta/m2m100-1.2b"
});

await probeTranslation({
  name:"layer_2_workers_ai_gpt_oss_fallback",
  targetLanguage:"eo",
  text:"Правно истражување",
  expectedProvider:["workers_ai_ui_fallback"],
  expectedModel:"@cf/openai/gpt-oss-120b"
});

async function browserLayer(){
  const startedAt=Date.now();
  const network=[];
  let browser=null,page=null,error=null;
  try{
    const {chromium}=await import("playwright-core");
    const executablePath=String(process.env.BROWSER_EXECUTABLE||"").trim()||undefined;
    browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
    const context=await browser.newContext();
    await context.addInitScript(()=>{
      localStorage.setItem("aiadvokat-language","mk");
      localStorage.removeItem("aiadvokat-ui-translations-v1:sq");
    });
    page=await context.newPage();
    page.on("response",async response=>{
      if(!response.url().includes("/api/ui-translate")) return;
      let body=null;
      try{body=await response.json();}catch{}
      network.push({
        status:response.status(),
        url:response.url(),
        ok:body?.ok??null,
        provider:body?.provider||null,
        translationModel:body?.translationModel||null,
        fallbackTranslationModel:body?.fallbackTranslationModel||null,
        fallbackItemCount:body?.fallbackItemCount??null,
        error:body?.error||null,
        detail:body?.detail||null,
        fallbackError:body?.fallbackError||null,
        fallbackStatus:body?.fallbackStatus||null,
        fallbackDetail:body?.fallbackDetail||null
      });
    });
    const url=new URL(ROOT_URL);
    url.searchParams.set("translator_acceptance",Date.now().toString());
    await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:60000});
    await page.waitForSelector("#langBtn",{state:"attached",timeout:30000});
    const navigation=page.waitForNavigation({waitUntil:"domcontentloaded",timeout:30000});
    await page.selectOption("#langBtn","sq");
    await navigation;
    await page.waitForFunction(()=>{
      const global=document.querySelector("#langBtn")?.value||"";
      const chat=document.querySelector("#aiChatLanguage")?.value||"";
      return global==="sq"
        && chat==="sq"
        && document.documentElement.lang==="sq"
        && document.documentElement.dataset.translationTarget==="sq"
        && document.documentElement.dataset.translationState==="ready";
    },null,{timeout:120000});
    const state=await page.evaluate(()=>({
      globalLanguage:document.querySelector("#langBtn")?.value||null,
      chatLanguage:document.querySelector("#aiChatLanguage")?.value||null,
      translatorLabel:document.querySelector("#aiChatLanguagePanel label strong")?.textContent?.trim()||null,
      translatorNote:document.querySelector("#aiChatLanguagePanel small")?.textContent?.trim()||null,
      topLine:document.querySelector("[data-i18n='topLine']")?.textContent?.trim()||null,
      brandSub:document.querySelector("[data-i18n='brandSub']")?.textContent?.trim()||null,
      navSources:document.querySelector("[data-i18n='navSources']")?.textContent?.trim()||null,
      documentLanguage:document.documentElement.lang,
      documentDirection:document.documentElement.dir,
      translationTarget:document.documentElement.dataset.translationTarget||null,
      translationState:document.documentElement.dataset.translationState||null
    }));
    const sourceFingerprints=[
      "Правен информациски портал",
      "Legal information portal",
      "Правен информациски и AI портал",
      "Legal information & AI portal",
      "Правни извори",
      "Legal sources",
      "изборот го преведува целиот интерфејс",
      "the selection translates the whole interface"
    ];
    const inspected=[
      state.topLine,
      state.brandSub,
      state.navSources,
      state.translatorLabel,
      state.translatorNote
    ].filter(Boolean).join("\n");
    const remaining=sourceFingerprints.filter(fragment=>inspected.toLocaleLowerCase("sq").includes(fragment.toLocaleLowerCase("sq")));
    await page.screenshot({path:"/tmp/translator-layered-browser.png",fullPage:false});
    const successfulResponses=network.filter(x=>x.status===200&&x.ok===true);
    const failedResponses=network.filter(x=>x.status!==200||x.ok!==true);
    const pass=state.globalLanguage==="sq"
      && state.chatLanguage==="sq"
      && state.documentLanguage==="sq"
      && state.translationTarget==="sq"
      && state.translationState==="ready"
      && remaining.length===0
      && successfulResponses.length>0
      && failedResponses.length===0;
    report.layers.push({
      name:"layer_3_live_mk_to_sq_atomic_browser_switch",
      pass,
      latencyMs:Date.now()-startedAt,
      state,
      remainingSourceFingerprints:remaining,
      successfulTranslationResponses:successfulResponses.length,
      failedTranslationResponses:failedResponses.length,
      translationResponses:network
    });
  }catch(browserError){
    error=String(browserError?.message||browserError);
    try{if(page) await page.screenshot({path:"/tmp/translator-layered-browser.png",fullPage:false});}catch{}
    report.layers.push({
      name:"layer_3_live_mk_to_sq_atomic_browser_switch",
      pass:false,
      latencyMs:Date.now()-startedAt,
      error,
      translationResponses:network
    });
  }finally{
    try{await browser?.close();}catch{}
  }
}
await browserLayer();

report.pass=report.layers.length===3 && report.layers.every(x=>x.pass===true);
fs.writeFileSync("/tmp/translator-layered-report.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({translatorLayeredAcceptance:report.pass,layers:report.layers.map(x=>({name:x.name,pass:x.pass,httpStatus:x.httpStatus||null,provider:x.provider||null,error:x.error||null}))}));
if(!report.pass) process.exitCode=1;
