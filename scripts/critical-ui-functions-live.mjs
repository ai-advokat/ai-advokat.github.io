import fs from "node:fs";
import {chromium} from "playwright-core";

const ROOT_URL=process.env.LIVE_ROOT_URL||"https://ai-advokat.github.io/";
const executablePath=String(process.env.BROWSER_EXECUTABLE||"").trim();
if(!executablePath) throw new Error("BROWSER_EXECUTABLE is required");

const report={
  version:"AI_ADVOCAT_CRITICAL_UI_FUNCTIONS_LIVE_V2",
  testedAt:new Date().toISOString(),
  rootUrl:ROOT_URL,
  checks:[],
  pageErrors:[],
  consoleErrors:[]
};

let browser;
async function check(name,fn){
  const started=Date.now();
  try{
    const detail=await fn();
    report.checks.push({name,pass:true,latencyMs:Date.now()-started,detail:detail??null});
    console.log("PASS",name,JSON.stringify(detail??{}));
  }catch(error){
    const detail=String(error?.message||error);
    report.checks.push({name,pass:false,latencyMs:Date.now()-started,error:detail});
    console.error("FAIL",name,detail);
  }
}

try{
  browser=await chromium.launch({headless:true,executablePath});
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  await context.addInitScript(()=>{
    try{
      localStorage.setItem("aiadvokat-language","mk");
      sessionStorage.clear();
    }catch{}
  });
  const page=await context.newPage();
  page.on("pageerror",error=>report.pageErrors.push(String(error?.message||error).slice(0,500)));
  page.on("console",msg=>{
    if(msg.type()==="error") report.consoleErrors.push(msg.text().slice(0,500));
  });

  const url=new URL(ROOT_URL);
  url.searchParams.set("critical_ui_acceptance",Date.now().toString());
  await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForSelector("#aiAdvokatChat",{state:"attached",timeout:30000});
  await page.waitForFunction(()=>Boolean(window.AIAdvokat4Workbench),null,{timeout:30000});

  async function closeOpenDialogs(){
    await page.locator("dialog[open]").evaluateAll(dialogs=>dialogs.forEach(dialog=>dialog.close()));
  }

  async function clickWorkbench(action){
    await closeOpenDialogs();
    const locator=page.locator('[data-ai-workbench="'+action+'"]').first();
    await locator.waitFor({state:"attached",timeout:10000});
    await locator.evaluate(el=>{const d=el.closest("details");if(d)d.open=true;});
    await locator.scrollIntoViewIfNeeded();
    await locator.click({timeout:10000});
  }

  await check("sources_and_verification_panel",async()=>{
    const toggle=page.locator("#aiWorkspaceEvidenceToggle");
    const topToggleVisible=await toggle.isVisible().catch(()=>false);
    if(topToggleVisible){
      await toggle.click();
    }else{
      await clickWorkbench("sources");
    }
    await page.waitForFunction(()=>document.querySelector("#aiChatEvidence")?.classList.contains("is-open"),null,{timeout:5000});
    const title=(await page.locator("#aiEvidenceTitle").textContent())?.trim();
    if(title!=="Извори") throw new Error("unexpected evidence title: "+title);
    return {title,entryPoint:topToggleVisible?"top_toggle":"sources_workbench"};
  });

  await check("human_gate_evidence_tab",async()=>{
    const tab=page.locator('[data-ai-evidence-tab="human"]').first();
    await tab.click();
    await page.waitForFunction(()=>document.querySelector("#aiEvidenceTitle")?.textContent?.trim()==="Human Gate",null,{timeout:5000});
    const body=(await page.locator("#aiChatEvidenceBody").innerText()).trim();
    if(!/HUMAN GATE REQUIRED|човечка проверка/iu.test(body)) throw new Error("Human Gate body not rendered");
    return {title:"Human Gate",bodySample:body.slice(0,220)};
  });

  await check("sources_workbench_action",async()=>{
    await clickWorkbench("sources");
    await page.waitForFunction(()=>document.querySelector("#aiChatEvidence")?.classList.contains("is-open")&&document.querySelector("#aiEvidenceTitle")?.textContent?.trim()==="Извори",null,{timeout:5000});
    return {panel:"sources"};
  });

  await check("workflow_dialog_and_source_check",async()=>{
    await clickWorkbench("workflows");
    const dialog=page.locator("#aiWorkspaceWorkflowDialog");
    await dialog.waitFor({state:"visible",timeout:5000});
    const count=await dialog.locator("[data-workflow-prompt]").count();
    if(count<6) throw new Error("workflow prompt count too low: "+count);
    const sourceCheck=dialog.locator("[data-workflow-prompt]").filter({hasText:"Source Check"}).first();
    await sourceCheck.click();
    const value=await page.locator("#aiChatInput").inputValue();
    if(!/source verification audit/iu.test(value)) throw new Error("Source Check did not populate composer");
    return {workflowPrompts:count,composerSample:value.slice(0,180)};
  });

  await check("legal_analyzer_local_runtime",async()=>{
    await page.locator("#aiChatInput").fill("");
    await clickWorkbench("analyzer");
    const dialog=page.locator("#aiProfAnalyzerDialog");
    try{
      await dialog.waitFor({state:"visible",timeout:5000});
      await dialog.locator("#aiProfAnalyzerText").fill("РЕШЕНИЕ бр. 12/2026\nЧлен 5\nРок: 8 дена\nОва е тест-текст без лични податоци.");
      await dialog.locator("[data-analyzer-run]").click();
      await page.waitForFunction(()=>{
        const t=document.querySelector("#aiProfAnalyzerResult")?.textContent||"";
        return t && t!=="Анализирам локално…";
      },null,{timeout:15000});
      const text=(await dialog.locator("#aiProfAnalyzerResult").innerText()).trim();
      if(/Analyzer error:/u.test(text)) throw new Error(text.slice(0,300));
      if(!/version|documentType|referenceNumber/iu.test(text)) throw new Error("Analyzer result missing structured fields");
      return {resultSample:text.slice(0,260)};
    }finally{
      await dialog.evaluate(el=>{if(el.open)el.close();}).catch(()=>{});
    }
  });

  await check("public_evidence_registry",async()=>{
    await clickWorkbench("public-evidence");
    const dialog=page.locator("#aiPublicEvidenceDialog");
    await dialog.waitFor({state:"visible",timeout:5000});
    await page.waitForFunction(()=>{
      const t=document.querySelector("#aiPublicEvidenceDialog [data-public-evidence-status]")?.textContent||"";
      return t && t!=="Вчитување…" && !t.includes("Го вчитувам");
    },null,{timeout:30000});
    const status=(await dialog.locator("[data-public-evidence-status]").innerText()).trim();
    if(/не е достапен|error/iu.test(status)) throw new Error(status);
    const sourceCount=await dialog.locator("[data-public-evidence-sources] .ai-toolkit-source").count();
    if(sourceCount<1) throw new Error("Public Evidence source registry is empty");
    await dialog.locator("[data-close]").click();
    return {status,sourceCount};
  });

  await check("professional_ecosystem_runtime",async()=>{
    await clickWorkbench("professional-ecosystem");
    const dialog=page.locator("#aiProfessionalEcosystemDialog");
    await dialog.waitFor({state:"visible",timeout:5000});
    await page.waitForFunction(()=>{
      const t=document.querySelector("#aiProfessionalEcosystemDialog [data-pro-status]")?.textContent||"";
      return t && t!=="Вчитување…";
    },null,{timeout:30000});
    const status=(await dialog.locator("[data-pro-status]").innerText()).trim();
    if(/не е достапен|error/iu.test(status)) throw new Error(status);
    const livingCount=await dialog.locator("[data-pro-living] .ai-toolkit-action").count();
    const documentCount=await dialog.locator("[data-pro-documents] .ai-toolkit-action").count();
    if(livingCount<1||documentCount<1) throw new Error("Professional ecosystem did not populate");
    await dialog.locator("[data-close]").click();
    return {status,livingCount,documentCount};
  });

  await check("global_workspace_search",async()=>{
    const launch=page.locator("#aiWorkspaceSearchLaunch");
    await launch.waitFor({state:"attached",timeout:5000});
    await launch.evaluate(el=>el.click());
    const dialog=page.locator("#aiWorkspaceSearchDialog");
    await dialog.waitFor({state:"visible",timeout:5000});
    const field=dialog.locator("#aiWorkspaceGlobalSearch");
    await field.fill("Human Gate");
    const resultText=(await dialog.locator("#aiWorkspaceSearchResults").innerText()).trim();
    if(!/Human Gate/u.test(resultText)) throw new Error("Global search did not expose Human Gate tool");
    await dialog.locator("[data-close]").click();
    return {resultSample:resultText.slice(0,180)};
  });

  await page.screenshot({path:"/tmp/ai-advokat-critical-ui-functions.png",fullPage:false});

  report.pass=report.checks.length===8
    && report.checks.every(x=>x.pass===true)
    && report.pageErrors.length===0;
  report.summary={
    passed:report.checks.filter(x=>x.pass).length,
    failed:report.checks.filter(x=>!x.pass).length,
    pageErrors:report.pageErrors.length,
    consoleErrors:report.consoleErrors.length
  };
  fs.writeFileSync("/tmp/ai-advokat-critical-ui-functions.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.summary));
  if(!report.pass) process.exitCode=1;
}finally{
  try{await browser?.close();}catch{}
}
