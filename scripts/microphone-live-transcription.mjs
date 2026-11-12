import fs from "node:fs";

const ROOT_URL=process.env.LIVE_ROOT_URL||"https://ai-advokat.github.io/";
const WORKER_BASE=process.env.LIVE_WORKER_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev";
const AUDIO_FILE=process.env.MIC_AUDIO_FILE||"/tmp/ai-advokat-mic-test.wav";
const ORIGIN="https://ai-advokat.github.io";
const report={
  version:"AI_ADVOCAT_MICROPHONE_LIVE_TRANSCRIPTION_V1",
  testedAt:new Date().toISOString(),
  rootUrl:ROOT_URL,
  workerBase:WORKER_BASE,
  checks:[]
};

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

await check("public_chat_bundle_routes_voice_to_worker",async()=>{
  const rootResponse=await fetch(ROOT_URL+"?mic_live="+Date.now(),{
    headers:{"cache-control":"no-cache"},
    signal:AbortSignal.timeout(30000)
  });
  if(!rootResponse.ok) throw new Error("root_http_"+rootResponse.status);
  const html=await rootResponse.text();
  const match=html.match(/<script[^>]+src="([^"]*ai-advokat-chat\.js[^"]*)"/i);
  if(!match) throw new Error("chat_bundle_not_found");
  const bundleUrl=new URL(match[1],ROOT_URL);
  bundleUrl.searchParams.set("mic_live",Date.now().toString());
  const bundleResponse=await fetch(bundleUrl,{
    headers:{"cache-control":"no-cache"},
    signal:AbortSignal.timeout(30000)
  });
  if(!bundleResponse.ok) throw new Error("chat_bundle_http_"+bundleResponse.status);
  const js=await bundleResponse.text();
  if(!js.includes('transcriptionEndpoint:CHAT_API_BASE+"/api/voice/transcribe"')){
    throw new Error("worker_transcription_endpoint_not_wired");
  }
  if(!js.includes("https://ai-advokat-github-io.aiadvokat16.workers.dev")){
    throw new Error("worker_api_base_not_present");
  }
  return {bundle:bundleUrl.pathname,bytes:js.length};
});

await check("voice_cors_preflight",async()=>{
  const response=await fetch(WORKER_BASE+"/api/voice/transcribe",{
    method:"OPTIONS",
    headers:{
      "Origin":ORIGIN,
      "Access-Control-Request-Method":"POST",
      "Access-Control-Request-Headers":"content-type,x-voice-language"
    },
    signal:AbortSignal.timeout(30000)
  });
  const allowOrigin=String(response.headers.get("access-control-allow-origin")||"");
  const allowHeaders=String(response.headers.get("access-control-allow-headers")||"").toLowerCase();
  if(response.status!==204) throw new Error("preflight_http_"+response.status);
  if(allowOrigin!==ORIGIN) throw new Error("allow_origin_mismatch:"+allowOrigin);
  if(!allowHeaders.includes("x-voice-language")) throw new Error("x_voice_language_not_allowed:"+allowHeaders);
  return {status:response.status,allowOrigin,allowHeaders};
});

await check("workers_ai_whisper_live_transcription",async()=>{
  const bytes=fs.readFileSync(AUDIO_FILE);
  if(!bytes.length) throw new Error("empty_audio_fixture");
  if(bytes.length>2*1024*1024) throw new Error("audio_fixture_too_large:"+bytes.length);
  const response=await fetch(WORKER_BASE+"/api/voice/transcribe",{
    method:"POST",
    headers:{
      "Origin":ORIGIN,
      "Content-Type":"audio/wav",
      "X-Voice-Language":"en-US",
      "Accept":"application/json"
    },
    body:bytes,
    signal:AbortSignal.timeout(90000)
  });
  let data=null;
  try{data=await response.json();}catch{}
  if(response.status!==200) throw new Error("transcribe_http_"+response.status+":"+JSON.stringify(data));
  if(data?.ok!==true) throw new Error("transcribe_not_ok:"+JSON.stringify(data));
  const text=String(data?.text||"").trim();
  if(text.length<3) throw new Error("transcript_empty_or_too_short");
  if(data?.provider!=="workers_ai") throw new Error("unexpected_provider:"+String(data?.provider||""));
  if(String(data?.model||"")!=="@cf/openai/whisper-large-v3-turbo"){
    throw new Error("unexpected_model:"+String(data?.model||""));
  }
  if(data?.retention!=="no_application_storage") throw new Error("retention_contract_missing");
  if(data?.humanGate!=="review_transcript_before_legal_use") throw new Error("human_gate_contract_missing");
  return {
    status:response.status,
    transcript:text.slice(0,240),
    provider:data.provider,
    model:data.model,
    retention:data.retention,
    humanGate:data.humanGate,
    audioBytes:bytes.length
  };
});

report.pass=report.checks.length===3&&report.checks.every(x=>x.pass===true);
report.summary={
  passed:report.checks.filter(x=>x.pass).length,
  failed:report.checks.filter(x=>!x.pass).length
};
fs.writeFileSync("/tmp/ai-advokat-microphone-live.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary));
if(!report.pass) process.exitCode=1;
