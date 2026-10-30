import fs from "node:fs";

const manifestPath=process.argv[2]||"uat/private-zoki-uat-scenarios.json";
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const base=String(process.env.UAT_BASE_URL||"").replace(/\/$/,"");
const membershipKey=String(process.env.UAT_MEMBERSHIP_KEY||"");
const expectedOrigin=String(process.env.UAT_EXPECTED_ORIGIN||"").replace(/\/$/,"");
const ingressToken=String(process.env.UAT_INGRESS_TOKEN||"");
const timeoutMs=Math.max(10000,Math.min(180000,Number(process.env.UAT_REQUEST_TIMEOUT_MS||175000)));
const membershipMinGapMs=Math.max(13000,Number(process.env.UAT_MEMBERSHIP_MIN_GAP_MS||13000));
const maxRateLimitRetries=2;
const maxTransientRetries=1;
const transient503Errors=new Set([
  "openai_network_error",
  "openai_timeout_error",
  "openai_request_deadline_exhausted",
  "openai_response_error",
  "openai_incomplete_response",
  "openai_empty_response",
  "legal_postflight_timeout_error",
  "legal_postflight_network_error",
  "legal_postflight_response_error",
  "legal_postflight_incomplete",
  "legal_postflight_deadline_exhausted"
]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let lastMembershipStartedAt=0;
const progressPath="artifacts/private-zoki-uat-progress.json";
const governanceRunIds=new Set();

const fail=m=>{console.error("PRIVATE ZOKI UAT EXECUTOR FAIL:",m);process.exit(1);};
if(!base) fail("UAT_BASE_URL is required");
if(!membershipKey) fail("UAT_MEMBERSHIP_KEY is required");
if(!expectedOrigin) fail("UAT_EXPECTED_ORIGIN is required");
if(!ingressToken) fail("UAT_INGRESS_TOKEN is required");
if(new URL(base).origin!==new URL(expectedOrigin).origin) fail("UAT_BASE_URL does not match UAT_EXPECTED_ORIGIN");
if(/ai-advokat-github-io\.aiadvokat16\.workers\.dev$/i.test(new URL(base).hostname)) fail("production workers.dev origin is forbidden");
if(manifest?.endpoint!=="/api/bot") fail("manifest endpoint mismatch");
if(manifest?.cycles_required!==2) fail("manifest must require two cycles");
if(manifest?.production_authorization!==false) fail("production authorization must remain false");

function valueAt(obj,path){
  return String(path).split(".").reduce((v,k)=>v==null?undefined:v[k],obj);
}
function assertionPass(payload,a){
  const value=valueAt(payload,a.path);
  if(a.op==="eq") return value===a.value;
  if(a.op==="nonempty_string") return typeof value==="string" && value.trim().length>0;
  return false;
}
async function fetchJson(url,options){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal});
    const text=await response.text();
    let payload;
    try{payload=JSON.parse(text);}catch{payload={raw:text.slice(0,500)};}
    return {response,payload};
  } finally {
    clearTimeout(timer);
  }
}
async function paceMembershipRequest(){
  const wait=Math.max(0,(lastMembershipStartedAt+membershipMinGapMs)-Date.now());
  if(wait>0) await sleep(wait);
  lastMembershipStartedAt=Date.now();
}
function retryAfterMs(response){
  const raw=String(response?.headers?.get("retry-after")||"").trim();
  const seconds=Number(raw);
  if(Number.isFinite(seconds) && seconds>=0) return Math.min(120000,Math.max(1000,Math.ceil(seconds*1000)+500));
  const when=Date.parse(raw);
  if(Number.isFinite(when)) return Math.min(120000,Math.max(1000,when-Date.now()+500));
  return 65000;
}
function transient503(payload){
  return transient503Errors.has(String(payload?.error||""));
}

const commonHeaders={
  "content-type":"application/json",
  "X-AI-Advokat-UAT-Token":ingressToken
};

const report={
  schema:"ai-advokat-private-zoki-uat-run/v1",
  startedAt:new Date().toISOString(),
  origin:new URL(base).origin,
  cycles:[],
  totalExpected:manifest.scenarios.length*manifest.cycles_required
};
fs.mkdirSync("artifacts",{recursive:true});
function persistProgress(extra={}){
  const tmp=progressPath+".tmp";
  fs.writeFileSync(tmp,JSON.stringify({
    schema:"ai-advokat-private-zoki-uat-progress/v1",
    startedAt:report.startedAt,
    updatedAt:new Date().toISOString(),
    origin:report.origin,
    governanceRunIds:[...governanceRunIds],
    ...extra
  },null,2));
  fs.renameSync(tmp,progressPath);
}
persistProgress({status:"RUNNING"});

let totalPassed=0;
for(let cycle=1;cycle<=manifest.cycles_required;cycle++){
  const results=[];
  for(const scenario of manifest.scenarios){
    const headers={...commonHeaders};
    if(scenario.auth==="membership") headers.authorization="Bearer "+membershipKey;
    const started=Date.now();
    let result;
    try{
      let response;
      let payload;
      let attempts=0;
      let rateLimitRetries=0;
      let transportRetries=0;
      let transientServerRetries=0;
      for(;;){
        attempts++;
        if(scenario.auth==="membership") await paceMembershipRequest();
        try{
          ({response,payload}=await fetchJson(base+manifest.endpoint,{
            method:manifest.default_method||"POST",
            headers,
            body:JSON.stringify({...scenario.request,sessionId:`zoki-uat-${cycle}-${scenario.id}`})
          }));
        }catch(error){
          if(scenario.auth==="membership" && transportRetries<maxTransientRetries){
            transportRetries++;
            const waitMs=1500*transportRetries;
            console.log(`[TRANSIENT_TRANSPORT] cycle=${cycle} scenario=${scenario.id} retry=${transportRetries} retryInMs=${waitMs}`);
            await sleep(waitMs);
            continue;
          }
          throw error;
        }
        if(response.status===429 && scenario.auth==="membership" && rateLimitRetries<maxRateLimitRetries){
          rateLimitRetries++;
          const waitMs=retryAfterMs(response);
          console.log(`[RATE_LIMIT] cycle=${cycle} scenario=${scenario.id} retry=${rateLimitRetries} retryInMs=${waitMs}`);
          await sleep(waitMs);
          continue;
        }
        if(response.status===503 && scenario.auth==="membership" && transient503(payload) && transientServerRetries<maxTransientRetries){
          transientServerRetries++;
          const waitMs=2000*transientServerRetries;
          console.log(`[TRANSIENT_503] cycle=${cycle} scenario=${scenario.id} error=${String(payload?.error||"unknown")} retry=${transientServerRetries} retryInMs=${waitMs}`);
          await sleep(waitMs);
          continue;
        }
        break;
      }
      const governanceRunId=typeof payload?.governanceRunId==="string" && /^LIOE-RT-[A-Za-z0-9-]+$/.test(payload.governanceRunId)
        ? payload.governanceRunId
        : null;
      if(governanceRunId) governanceRunIds.add(governanceRunId);
      const assertions=(scenario.assertions||[]).map(a=>({
        path:a.path,op:a.op,pass:assertionPass(payload,a)
      }));
      const pass=response.status===scenario.expect_status && assertions.every(a=>a.pass);
      if(pass) totalPassed++;
      result={
        id:scenario.id,
        status:response.status,
        expectedStatus:scenario.expect_status,
        pass,
        assertions,
        attempts,
        errorCode:typeof payload?.error==="string" ? payload.error.slice(0,120) : null,
        governanceRunId,
        elapsedMs:Date.now()-started
      };
    }catch(error){
      result={id:scenario.id,status:null,expectedStatus:scenario.expect_status,pass:false,error:String(error).slice(0,300),elapsedMs:Date.now()-started};
    }
    results.push(result);
    persistProgress({status:"RUNNING",cycle,scenarioId:scenario.id});
    console.log(`[${result.pass?"PASS":"FAIL"}] cycle=${cycle} scenario=${scenario.id} status=${result.status}`);
  }
  report.cycles.push({cycle,pass:results.every(r=>r.pass),results});
}

report.finishedAt=new Date().toISOString();
report.totalPassed=totalPassed;
report.pass=totalPassed===report.totalExpected && report.cycles.every(c=>c.pass);
report.governanceRunIds=[...governanceRunIds];
fs.writeFileSync("artifacts/private-zoki-uat-run.json",JSON.stringify(report,null,2));
persistProgress({status:report.pass?"PASS":"FAIL",finishedAt:report.finishedAt,totalPassed:report.totalPassed,totalExpected:report.totalExpected});

if(!report.pass) fail(`expected ${report.totalExpected}/${report.totalExpected}, got ${totalPassed}/${report.totalExpected}`);
console.log(`PRIVATE ZOKI UAT: PASS ${totalPassed}/${report.totalExpected}`);
