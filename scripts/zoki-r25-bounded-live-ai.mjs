// R25 bounded real-provider diagnostics on exact R24 Cloudflare Preview.
// This probes one UI translation, one synthetic voice WAV, one anonymous
// internal FREE chat and one external training greeting (usually no model).
// No client data; no paid fallback; no automatic retries; no production deploy.
import fs from "node:fs";
import {createHash} from "node:crypto";

const expectedPreview="https://feat-zoki-bot-formats-translator-r24-20261-ai-advokat-github-io.aiadvokat16.workers.dev";
const preview=String(process.env.PREVIEW_URL||"").replace(/\/+$/u,"");
if(preview!==expectedPreview) throw new Error("Refusing non-preview or unexpected host");
const reportPath="/tmp/zoki-r25-bounded-live-ai.json";
const report={
  protocol:"ZOKI_R25_LIVE_DIAGNOSTIC_V1",
  checkedAt:new Date().toISOString(),
  exactCommit:String(process.env.EXPECTED_HEAD_SHA||""),
  preview,
  data:"synthetic fixtures only; no client identities or documents",
  modelCallCap:{translation:1,voice:1,chat:1,externalGreeting:0},
  calls:{translation:0,voice:0,chat:0,externalGreeting:0},
  checks:[],
  productionTouched:false,
  paidFallbackAuthorised:false
};
const hash=x=>createHash("sha256").update(x).digest("hex");
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(name,fn){
  const t=Date.now();
  try{
    const outcome=await fn();
    report.checks.push({name,status:outcome.status||"PASS",ms:Date.now()-t,details:outcome.details||{}});
    console.log(name,JSON.stringify(report.checks[report.checks.length-1]).slice(0,900));
  }catch(e){
    report.checks.push({name,status:"FAIL",ms:Date.now()-t,details:{error:String(e?.message||e).slice(0,170)}});
    console.error(name,"FAIL (details are restricted to safe error code)");
  }
}
async function postJson(path,body,timeout=45000){
  const response=await fetch(preview+path,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(timeout)
  });
  return {http:response.status,data:await response.json().catch(()=>({}))};
}
let parity=false;
await check("exact_source_byte_parity",async()=>{
  const wanted=hash(fs.readFileSync("index.html"));
  let last="no response";
  for(let i=0;i<12;i++){
    try{
      const response=await fetch(preview+"/?r25="+Date.now(),{
        headers:{"cache-control":"no-cache"},
        signal:AbortSignal.timeout(15000)
      });
      if(response.status!==200){last="HTTP "+response.status;continue;}
      const received=hash(Buffer.from(await response.arrayBuffer()));
      if(received===wanted){parity=true;return {details:{sha256:received,attempt:i+1}};}
      last="different source hash";
    }catch(e){last=String(e?.name||"network_error");}
    if(i<11)await nap(3000);
  }
  throw new Error("exact preview not deployed: "+last);
});
if(parity){
  await check("capabilities_read_only",async()=>{
    const response=await fetch(preview+"/api/capabilities",{headers:{"accept":"application/json"},signal:AbortSignal.timeout(12000)});
    const data=await response.json().catch(()=>({}));
    return {status:response.ok&&data?.ok===true?"PASS":"FAIL",details:{
      http:response.status,
      providerState:String(data?.runtime?.provider||data?.capabilities?.provider||"unspecified"),
      freeModel:String(data?.capabilities?.freeChatModel||"unspecified"),
      translatorModel:String(data?.capabilities?.uiTranslationModel||"unspecified")
    }};
  });
  await check("one_real_short_translation_MK_to_SQ",async()=>{
    if(report.calls.translation!==0) throw new Error("translation call cap");
    report.calls.translation++;
    const result=await postJson("/api/ui-translate",{
      targetLanguage:"sq",items:[{id:"r25-synthetic-1",text:"Добар ден"}]
    },55000);
    const rows=result.data?.translations||[];
    const valid=result.http===200&&result.data?.ok===true
      &&Array.isArray(rows)&&rows.length===1
      &&rows[0].id==="r25-synthetic-1"
      &&String(rows[0].text||"").trim()!==""
      &&rows[0].text!=="Добар ден";
    return {status:valid?"PASS":"FAIL",details:{
      http:result.http,error:String(result.data?.error||"").slice(0,100),
      provider:String(result.data?.provider||"").slice(0,80),
      translated:valid
    }};
  });
  await check("one_real_synthetic_WAV_Whisper",async()=>{
    if(report.calls.voice!==0)throw new Error("voice call cap");
    const file=String(process.env.MIC_AUDIO_FILE||"");
    const wav=fs.readFileSync(file);
    if(wav.length<1000||wav.length>1024*1024)throw new Error("bad synthetic wav");
    report.calls.voice++;
    const response=await fetch(preview+"/api/voice/transcribe",{
      method:"POST",
      headers:{"Content-Type":"audio/wav","X-Voice-Language":"en-US","Accept":"application/json"},
      body:wav,signal:AbortSignal.timeout(55000)
    });
    const data=await response.json().catch(()=>({}));
    const ok=response.status===200&&data?.ok===true&&String(data.text||"").trim().length>=3
      &&data.retention==="no_application_storage";
    return {status:ok?"PASS":"FAIL",details:{
      http:response.status,error:String(data.error||"").slice(0,100),
      provider:String(data.provider||"").slice(0,80),
      transcriptNonempty:ok,
      originalWavBytes:wav.length
    }};
  });
  await check("one_real_anonymous_internal_FREE_legal_chat",async()=>{
    if(report.calls.chat!==0)throw new Error("chat call cap");
    report.calls.chat++;
    const r=await postJson("/api/chat",{
      q:"Во измислен договор, што значи правна понуда? Одговори кратко, без да измислуваш законски членови.",
      mode:"auto",webSearch:false,guideIds:[],attachments:[],history:[]
    },70000);
    const provider=String(r.data?.provider||"");
    const answer=String(r.data?.answer||"").trim();
    // Never mark deterministic/locked/template responses as real LLM semantics.
    const generative=r.http===200&&r.data?.ok===true
      &&provider==="workers_ai_free"&&answer.length>=30;
    return {status:generative?"PASS":"FAIL",details:{
      http:r.http,error:String(r.data?.error||"").slice(0,100),
      provider,model:String(r.data?.model||"").slice(0,80),
      replyChars:answer.length,
      genuinelyGenerated:generative,
      semanticCorrectness:"NOT_TESTED - requires Zoran human review"
    }};
  });
  await check("external_bot_training_gate_without_paid_model",async()=>{
    // A short hello is canonical and no AI provider call; 401 indicates
    // membership is intentionally required, not a broken model.
    const r=await postJson("/api/bot",{
      q:"Здраво",mode:"auto",webSearch:false,guideIds:[],attachments:[],history:[]
    },12000);
    const pass=r.http===401&&r.data?.error==="bot_membership_required"
      ||r.http===200&&r.data?.provider==="canonical_corpus_no_model"
      &&r.data?.privacy?.providerCalled===false;
    return {status:pass?"PASS":"FAIL",details:{
      http:r.http,error:String(r.data?.error||"").slice(0,100),
      provider:String(r.data?.provider||"").slice(0,80),
      externalRealSemantics:"NOT_TESTED - professional membership/Human Gate"
    }};
  });
}else{
  for(const name of ["capabilities_read_only","one_real_short_translation_MK_to_SQ",
    "one_real_synthetic_WAV_Whisper","one_real_anonymous_internal_FREE_legal_chat",
    "external_bot_training_gate_without_paid_model"]){
    report.checks.push({name,status:"NOT_TESTED",details:{reason:"exact_preview_sha_mismatch"}});
  }
}
report.summary={
  passed:report.checks.filter(x=>x.status==="PASS").length,
  failed:report.checks.filter(x=>x.status==="FAIL").length,
  notTested:report.checks.filter(x=>x.status==="NOT_TESTED").length,
  realModelsVerified:report.checks.filter(x=>x.status==="PASS"&&x.name.startsWith("one_real")).map(x=>x.name),
  releaseReady:false,
  legalHumanGate:"HOLD"
};
fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
console.log("R25_DIAGNOSTIC_SUMMARY",JSON.stringify(report.summary));
if(process.env.GITHUB_STEP_SUMMARY){
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "### R25 bounded live AI diagnosis (NOT release approval)\n\n"+
    "| Check | Status |\n|---|---|\n"+
    report.checks.map(x=>"| "+x.name+" | "+x.status+" |").join("\n")+
    "\n\n**Budget:** one translation, one synthetic voice, one internal free chat; no paid model or client data. All failed live functions remain **BLOCKER**.\n");
}
// Report always uploads in the workflow. A live provider failure must be RED,
// never a green release check hiding an exhausted or inaccessible AI provider.
if(report.summary.failed>0||report.summary.notTested>0)process.exitCode=1;
