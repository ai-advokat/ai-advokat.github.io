import fs from "node:fs";
const url=process.env.ZOKI_TRANSLATOR_LIVE_URL||"https://ai-advokat-github-io.aiadvokat16.workers.dev/api/ui-translate";
const report={type:"ZOKI_R26_ONE_CALL_LIVE_TRANSLATION",target:"en",source:"mk",live:false,
  mode:"LIVE_DEPLOYED_CLOUDFLARE_NOT_PR_PREVIEW",provider:null,httpStatus:null,success:false,error:null,elapsedMs:null};
const started=Date.now();
try{
 const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json","Origin":"https://ai-advokat.github.io"},
   body:JSON.stringify({targetLanguage:"en",items:[{id:"live-0",text:"Добро утро"}]}),
   signal:AbortSignal.timeout(35000)});
 report.httpStatus=res.status;
 let body=null;try{body=await res.json();}catch{}
 report.provider=String(body?.provider||"");
 report.model=String(body?.translationModel||"");
 report.error=String(body?.error||body?.detail||"").slice(0,140)||null;
 const output=Array.isArray(body?.translations)?body.translations[0]:null;
 report.success=res.ok&&body?.ok===true&&body.translations?.length===1&&output?.id==="live-0"&&
   typeof output?.text==="string"&&output.text.trim()!==""&&output.text.trim()!=="Добро утро";
 report.live=true;
}catch(error){report.error=String(error?.name||"network_error");}
report.elapsedMs=Date.now()-started;
fs.writeFileSync("zoki-r26-live-provider-evidence.json",JSON.stringify(report,null,2)+"\n");
console.log("ZOKI_R26_TRANSLATOR_LIVE_EVIDENCE",JSON.stringify(report));
if(!report.success)process.exitCode=1; // CI must not misrepresent a production provider failure as PASS
