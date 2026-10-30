import fs from "node:fs";

const manifestPath=process.argv[2]||"uat/private-zoki-uat-scenarios.json";
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const base=String(process.env.UAT_BASE_URL||"").replace(/\/$/,"");
const membershipKey=String(process.env.UAT_MEMBERSHIP_KEY||"");
const expectedOrigin=String(process.env.UAT_EXPECTED_ORIGIN||"").replace(/\/$/,"");
const accessClientId=String(process.env.CF_ACCESS_CLIENT_ID||"");
const accessClientSecret=String(process.env.CF_ACCESS_CLIENT_SECRET||"");
const timeoutMs=Math.max(10000,Math.min(90000,Number(process.env.UAT_REQUEST_TIMEOUT_MS||60000)));

const fail=m=>{console.error("PRIVATE ZOKI UAT EXECUTOR FAIL:",m);process.exit(1);};
if(!base) fail("UAT_BASE_URL is required");
if(!membershipKey) fail("UAT_MEMBERSHIP_KEY is required");
if(!expectedOrigin) fail("UAT_EXPECTED_ORIGIN is required");
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

const commonHeaders={
  "content-type":"application/json",
  ...(accessClientId?{"CF-Access-Client-Id":accessClientId}:{}),
  ...(accessClientSecret?{"CF-Access-Client-Secret":accessClientSecret}:{})
};

const report={
  schema:"ai-advokat-private-zoki-uat-run/v1",
  startedAt:new Date().toISOString(),
  origin:new URL(base).origin,
  cycles:[],
  totalExpected:manifest.scenarios.length*manifest.cycles_required
};

let totalPassed=0;
for(let cycle=1;cycle<=manifest.cycles_required;cycle++){
  const results=[];
  for(const scenario of manifest.scenarios){
    const headers={...commonHeaders};
    if(scenario.auth==="membership") headers.authorization="Bearer "+membershipKey;
    const started=Date.now();
    let result;
    try{
      const {response,payload}=await fetchJson(base+manifest.endpoint,{
        method:manifest.default_method||"POST",
        headers,
        body:JSON.stringify({...scenario.request,sessionId:`zoki-uat-${cycle}-${scenario.id}`})
      });
      const assertions=(scenario.assertions||[]).map(a=>({
        path:a.path,op:a.op,pass:assertionPass(payload,a)
      }));
      const pass=response.status===scenario.expect_status && assertions.every(a=>a.pass);
      if(pass) totalPassed++;
      result={id:scenario.id,status:response.status,expectedStatus:scenario.expect_status,pass,assertions,elapsedMs:Date.now()-started};
    }catch(error){
      result={id:scenario.id,status:null,expectedStatus:scenario.expect_status,pass:false,error:String(error).slice(0,300),elapsedMs:Date.now()-started};
    }
    results.push(result);
    console.log(`[${result.pass?"PASS":"FAIL"}] cycle=${cycle} scenario=${scenario.id} status=${result.status}`);
  }
  report.cycles.push({cycle,pass:results.every(r=>r.pass),results});
}

report.finishedAt=new Date().toISOString();
report.totalPassed=totalPassed;
report.pass=totalPassed===report.totalExpected && report.cycles.every(c=>c.pass);
fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/private-zoki-uat-run.json",JSON.stringify(report,null,2));

if(!report.pass) fail(`expected ${report.totalExpected}/${report.totalExpected}, got ${totalPassed}/${report.totalExpected}`);
console.log(`PRIVATE ZOKI UAT: PASS ${totalPassed}/${report.totalExpected}`);
