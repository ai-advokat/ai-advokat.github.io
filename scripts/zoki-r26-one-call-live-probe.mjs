import fs from "node:fs";
const endpoint=process.env.ZOKI_TRANSLATOR_LIVE_URL||"https://ai-advokat-github-io.aiadvokat16.workers.dev/api/ui-translate";
const report={
  type:"ZOKI_R26_BIDIRECTIONAL_LIVE_TRANSLATION",
  mode:"LIVE_DEPLOYED_CLOUDFLARE_NOT_PR_PREVIEW",
  checks:[],success:false,dateUtc:new Date().toISOString()
};
async function one(targetLanguage,input,sourceLanguage){
  const started=Date.now();
  const row={targetLanguage,sourceLanguage,httpStatus:null,provider:null,model:null,success:false,error:null,elapsedMs:null};
  try{
    const res=await fetch(endpoint,{method:"POST",
      headers:{"content-type":"application/json","Origin":"https://ai-advokat.github.io"},
      body:JSON.stringify({targetLanguage,items:[{id:"live-0",text:input}]}),
      signal:AbortSignal.timeout(35000)
    });
    row.httpStatus=res.status;
    let body=null;try{body=await res.json();}catch{}
    row.provider=String(body?.provider||"");
    row.model=String(body?.translationModel||"");
    row.error=String(body?.error||body?.detail||"").slice(0,130)||null;
    const result=Array.isArray(body?.translations)?body.translations[0]:null;
    row.success=res.ok&&body?.ok===true&&body.translations?.length===1
      &&result?.id==="live-0"&&typeof result?.text==="string"
      &&result.text.trim()!==""&&result.text.trim()!==input;
    if(!row.success&&!row.error)row.error="untranslated_or_invalid_response";
  }catch(error){row.error=String(error?.name||"network_error");}
  row.elapsedMs=Date.now()-started;
  report.checks.push(row);
}
await one("en","Добро утро","mk");
await one("mk","Good morning","en");
report.success=report.checks.length===2&&report.checks.every(check=>check.success);
fs.writeFileSync("zoki-r26-live-provider-evidence.json",JSON.stringify(report,null,2)+"\n");
console.log("ZOKI_R26_TRANSLATOR_LIVE_EVIDENCE",JSON.stringify(report));
if(!report.success)process.exitCode=1;
