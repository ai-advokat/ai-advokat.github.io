import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ACCOUNT="0fee10e2bd9a2183d16eb0d73f13dfce";
const WORKER="ai-advokat-staging";
const DB_NAME="ai-advokat-staging-db";
const DB_ID="309f72b8-8711-47fc-bea7-fbd1d649561d";
const HOST="ai-advokat-staging.ai-advokat-4-staging.workers.dev";
const ORIGIN="https://"+HOST;
const PROD_DB_ID="12ece285-74bb-4f27-a025-2dbd1be6c59a";
const PROD_WORKER="ai-advokat-github-io";
const GATE="APPROVE_PRIVATE_ZOKI_STAGING_UAT";
const RUN_KEY=(String(process.env.GITHUB_RUN_ID||Date.now())+"-"+String(process.env.GITHUB_RUN_ATTEMPT||"1")).replace(/[^A-Za-z0-9_-]/g,"");
const STATE_PATH="artifacts/private-zoki-one-button-uat-state.json";
const EVIDENCE_PATH="artifacts/private-zoki-one-button-uat-evidence.json";
const UAT_PROGRESS_PATH="artifacts/private-zoki-uat-progress.json";

function fail(message){ throw new Error(message); }
function env(name){
  const value=String(process.env[name]||"");
  if(!value) fail("missing required environment variable: "+name);
  return value;
}
function readJsonc(file){
  return JSON.parse(fs.readFileSync(file,"utf8")
    .replace(/^\s*\/\/.*$/gm,"")
    .replace(/\/\*[\s\S]*?\*\//g,""));
}
async function api(url,token,{method="GET",body=null,timeoutMs=30000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      method,
      signal:controller.signal,
      headers:{
        Authorization:"Bearer "+token,
        ...(body?{"content-type":"application/json"}:{})
      },
      ...(body?{body:JSON.stringify(body)}:{})
    });
    let payload=null;
    const text=await response.text();
    try{ payload=text?JSON.parse(text):null; }catch{ payload={raw:text.slice(0,500)}; }
    if(!response.ok || payload?.success===false){
      const detail=Array.isArray(payload?.errors)
        ? payload.errors.map(x=>String(x?.message||x?.code||"error")).join(" | ")
        : "HTTP "+response.status;
      fail(method+" "+url+" failed: "+detail);
    }
    return payload;
  }finally{
    clearTimeout(timer);
  }
}
async function d1(sql,params=[]){
  const token=env("HG2_C_UAT_D1_TOKEN_W");
  const payload=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    token,
    {method:"POST",body:{sql,params}}
  );
  const batches=Array.isArray(payload?.result)
    ? payload.result
    : (payload?.result ? [payload.result] : []);
  if(!batches.length) fail("D1 query returned no result batch");
  for(const batch of batches){
    if(batch?.success!==true){
      const detail=String(batch?.error||batch?.message||"D1 batch reported failure").slice(0,500);
      fail("D1 query batch failed: "+detail);
    }
  }
  return payload;
}
function runWrangler(config,label){
  const cli=path.resolve("node_modules","wrangler","bin","wrangler.js");
  if(!fs.existsSync(cli)) fail("Wrangler CLI not installed");
  const result=spawnSync(process.execPath,[cli,"deploy","--config",config],{
    encoding:"utf8",
    timeout:120000,
    killSignal:"SIGTERM",
    env:{
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID:ACCOUNT,
      CLOUDFLARE_API_TOKEN:env("HG2_C_UAT_WORKER_TOKEN_B")
    },
    shell:false
  });
  if(result.error) fail(label+" failed: "+String(result.error.message||result.error));
  if(result.status!==0){
    const stderr=String(result.stderr||"").slice(-2000);
    fail(label+" failed: "+stderr);
  }
}
function runUat(membershipKey,accessId,accessSecret){
  const result=spawnSync(process.execPath,["scripts/run-private-zoki-uat.mjs"],{
    encoding:"utf8",
    timeout:25*60*1000,
    killSignal:"SIGTERM",
    env:{
      ...process.env,
      UAT_BASE_URL:ORIGIN,
      UAT_EXPECTED_ORIGIN:ORIGIN,
      UAT_MEMBERSHIP_KEY:membershipKey,
      CF_ACCESS_CLIENT_ID:accessId,
      CF_ACCESS_CLIENT_SECRET:accessSecret,
      UAT_REQUEST_TIMEOUT_MS:"60000"
    },
    shell:false
  });
  process.stdout.write(result.stdout||"");
  process.stderr.write(result.stderr||"");
  if(result.error) fail("private Zoki UAT executor failed: "+String(result.error.message||result.error));
  if(result.status!==0) fail("private Zoki UAT executor failed");
}

if(String(process.env.UAT_HUMAN_GATE||"")!==GATE) fail("exact UAT Human Gate is required");

const workerToken=env("HG2_C_UAT_WORKER_TOKEN_B");
const accessToken=env("HG2_C_UAT_ACCESS_TOKEN_A");
env("HG2_C_UAT_D1_TOKEN_W");
env("UAT_OPENAI_API_KEY");

const staging=readJsonc("wrangler.staging.jsonc");
const db=staging.d1_databases?.[0];
if(staging.name!==WORKER) fail("staging Worker identity mismatch");
if(staging.workers_dev!==false || staging.preview_urls!==false) fail("baseline staging exposure is not closed");
if(!db || db.database_name!==DB_NAME || db.database_id!==DB_ID) fail("staging D1 identity mismatch");
if(JSON.stringify(staging).includes(PROD_DB_ID) || JSON.stringify(staging).includes(PROD_WORKER)) fail("production identity detected in staging config");

fs.mkdirSync("artifacts",{recursive:true});
const state={
  schema:"ai-advokat-private-zoki-one-button-state/v2",
  runKey:RUN_KEY,
  target:{accountId:ACCOUNT,worker:WORKER,databaseName:DB_NAME,databaseId:DB_ID,origin:ORIGIN},
  access:{serviceTokenName:"AI ADVOKAT 4 Private Zoki UAT "+RUN_KEY,serviceTokenId:null,appName:"AI ADVOKAT 4 Private Zoki UAT "+RUN_KEY,appId:null},
  worker:{uatDeployAttempted:false,uatDeployed:false,openAISecretAddAttempted:false,openAISecretAdded:false,workersDevEnableAttempted:false,workersDevEnabled:false},
  membership:{accountId:"UAT-ZOKI-"+RUN_KEY,provisionAttempted:false,provisioned:false},
  uat:{executed:false,passed:false,totalPassed:null,totalExpected:20,telemetryWindowStartedAt:null,telemetryWindowEndedAt:null,governanceRunIds:[]},
  runError:null
};
const evidence={
  schema:"ai-advokat-private-zoki-one-button-uat/v2",
  startedAt:new Date().toISOString(),
  humanGate:GATE,
  target:state.target,
  productionTouched:false,
  preflight:{baselineClosed:false,openAISecretAbsent:false},
  temporary:{accessAppCreated:false,serviceTokenCreated:false,workersDevEnabled:false,openAISecretAdded:false,membershipProvisioned:false},
  uat:state.uat,
  cleanup:{status:"PENDING"},
  finalStatus:"RUNNING"
};
function writeJsonAtomic(file,value){
  const tmp=file+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(value,null,2));
  fs.renameSync(tmp,file);
}
const persist=()=>{
  writeJsonAtomic(STATE_PATH,state);
  writeJsonAtomic(EVIDENCE_PATH,evidence);
};
persist();

let membershipKey=null;
let accessClientId=null;
let accessClientSecret=null;
let uatConfigPath=null;

try{
  const sub=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`,
    workerToken
  );
  if(sub?.result?.enabled!==false || sub?.result?.previews_enabled!==false) fail("staging workers.dev/preview URL is not closed before UAT");
  evidence.preflight.baselineClosed=true;

  const secrets=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/secrets`,
    workerToken
  );
  const names=(secrets?.result||[]).map(x=>String(x?.name||""));
  if(names.includes("OPENAI_API_KEY")) fail("staging already has OPENAI_API_KEY; refuse to overwrite unknown state");
  evidence.preflight.openAISecretAbsent=true;
  persist();

  const svc=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/service_tokens`,
    accessToken,
    {method:"POST",body:{name:state.access.serviceTokenName,duration:"2h"}}
  );
  state.access.serviceTokenId=String(svc?.result?.id||"");
  accessClientId=String(svc?.result?.client_id||"");
  accessClientSecret=String(svc?.result?.client_secret||"");
  if(!state.access.serviceTokenId || !accessClientId || !accessClientSecret) fail("Access service token creation returned incomplete credentials");
  evidence.temporary.serviceTokenCreated=true;
  persist();

  const app=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/apps`,
    accessToken,
    {method:"POST",body:{
      name:state.access.appName,
      type:"self_hosted",
      domain:HOST,
      session_duration:"1h",
      policies:[{
        name:"Private Zoki UAT service auth",
        decision:"non_identity",
        precedence:1,
        include:[{service_token:{token_id:state.access.serviceTokenId}}]
      }]
    }}
  );
  state.access.appId=String(app?.result?.id||"");
  if(!state.access.appId) fail("Access application creation did not return id");
  evidence.temporary.accessAppCreated=true;
  persist();

  const uatConfig=structuredClone(staging);
  uatConfig.vars={
    ...(uatConfig.vars||{}),
    OPENAI_MODEL:"gpt-6.1-sol",
    OPENAI_REASONING_EFFORT:"medium",
    OPENAI_ORCHESTRATOR_ENABLED:"true",
    OPENAI_EXTERNAL_RESEARCH_TOOLS_ENABLED:"false",
    OPENAI_FILE_INPUT_ENABLED:"false",
    OPENAI_PROVIDER_ACTIVATION_STATE:"staging_private_uat_only",
    LIOE_RUNTIME_GOVERNANCE_ENABLED:"true",
    LIOE_POSTFLIGHT_ENABLED:"true",
    LIOE_RUNTIME_TELEMETRY_ENABLED:"true",
    LIOE_SPECIALIST_EXECUTION_ENABLED:"true"
  };
  uatConfig.workers_dev=false;
  uatConfig.preview_urls=false;
  uatConfigPath=path.resolve("wrangler.private-zoki-uat.jsonc");
  fs.writeFileSync(uatConfigPath,JSON.stringify(uatConfig,null,2));
  state.worker.uatDeployAttempted=true;
  persist();
  runWrangler(uatConfigPath,"deploy staging UAT config");
  state.worker.uatDeployed=true;
  persist();

  state.worker.openAISecretAddAttempted=true;
  persist();
  await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/secrets`,
    workerToken,
    {method:"PUT",body:{name:"OPENAI_API_KEY",text:env("UAT_OPENAI_API_KEY"),type:"secret_text"}}
  );
  state.worker.openAISecretAdded=true;
  evidence.temporary.openAISecretAdded=true;
  persist();

  state.worker.workersDevEnableAttempted=true;
  persist();
  await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`,
    workerToken,
    {method:"POST",body:{enabled:true,previews_enabled:false}}
  );
  state.worker.workersDevEnabled=true;
  evidence.temporary.workersDevEnabled=true;
  persist();

  const random=randomBytes(24).toString("base64url");
  membershipKey="AIADV-UAT-"+random;
  const hash=createHash("sha256").update(membershipKey,"utf8").digest("hex");
  const prefix=membershipKey.slice(0,12);
  const entitlementId="UAT-ENT-"+randomBytes(8).toString("hex");
  const keyId="UAT-KEY-"+randomBytes(8).toString("hex");
  const starts=new Date();
  const expires=new Date(starts.getTime()+2*60*60*1000);

  state.membership.provisionAttempted=true;
  state.membership.keyPrefix=prefix;
  state.membership.startsAt=starts.toISOString();
  state.membership.expiresAt=expires.toISOString();
  persist();
  await d1("INSERT INTO membership_accounts (id,display_name,email,organization_name,status) VALUES (?,?,NULL,?,'active')",
    [state.membership.accountId,"Private Zoki UAT","AI ADVOKAT 4 staging UAT"]);
  await d1("INSERT INTO membership_entitlements (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at) VALUES (?,?,'office','active','manual',40,1,0,?,?)",
    [entitlementId,state.membership.accountId,starts.toISOString(),expires.toISOString()]);
  await d1("INSERT INTO membership_access_keys (id,account_id,key_hash,key_prefix,label,status,expires_at) VALUES (?,?,?,?,?,'active',?)",
    [keyId,state.membership.accountId,hash,prefix,"Private Zoki UAT temporary key",expires.toISOString()]);
  state.membership.provisioned=true;
  evidence.temporary.membershipProvisioned=true;
  evidence.temporary.membership={accountId:state.membership.accountId,keyPrefix:prefix,startsAt:starts.toISOString(),expiresAt:expires.toISOString(),quota:40};
  persist();

  const accessHeaders={"CF-Access-Client-Id":accessClientId,"CF-Access-Client-Secret":accessClientSecret};
  let healthOk=false;
  for(let attempt=1;attempt<=12;attempt++){
    try{
      const response=await fetch(ORIGIN+"/api/health",{headers:accessHeaders,signal:AbortSignal.timeout(15000)});
      if(response.ok){
        const body=await response.json().catch(()=>null);
        if(body?.ok===true){ healthOk=true; break; }
      }
    }catch{}
    await new Promise(r=>setTimeout(r,5000));
  }
  if(!healthOk) fail("Access-protected staging health route did not become ready");

  state.uat.telemetryWindowStartedAt=new Date().toISOString();
  persist();
  runUat(membershipKey,accessClientId,accessClientSecret);
  state.uat.telemetryWindowEndedAt=new Date().toISOString();
  state.uat.executed=true;
  evidence.uat.executed=true;
  const report=JSON.parse(fs.readFileSync("artifacts/private-zoki-uat-run.json","utf8"));
  state.uat.passed=report?.pass===true;
  state.uat.totalPassed=Number(report?.totalPassed||0);
  state.uat.governanceRunIds=Array.isArray(report?.governanceRunIds)
    ? [...new Set(report.governanceRunIds.filter(x=>typeof x==="string" && /^LIOE-RT-[A-Za-z0-9-]+$/.test(x)))]
    : [];
  evidence.uat.passed=state.uat.passed;
  evidence.uat.totalPassed=state.uat.totalPassed;
  if(!state.uat.passed || state.uat.totalPassed!==20) fail("UAT did not achieve 20/20");
  evidence.finalStatus="UAT_PASS_PENDING_INDEPENDENT_CLEANUP";
  persist();
  console.log("PRIVATE ZOKI STAGING UAT EXECUTION: PASS 20/20 · CLEANUP REQUIRED");
}catch(error){
  if(state.uat.telemetryWindowStartedAt && !state.uat.telemetryWindowEndedAt){
    state.uat.telemetryWindowEndedAt=new Date().toISOString();
  }
  try{
    if(fs.existsSync(UAT_PROGRESS_PATH)){
      const progress=JSON.parse(fs.readFileSync(UAT_PROGRESS_PATH,"utf8"));
      state.uat.governanceRunIds=[...new Set([
        ...(state.uat.governanceRunIds||[]),
        ...((Array.isArray(progress?.governanceRunIds)?progress.governanceRunIds:[])
          .filter(x=>typeof x==="string" && /^LIOE-RT-[A-Za-z0-9-]+$/.test(x)))
      ])];
    }
  }catch{}
  state.runError=String(error?.message||error).slice(0,1000);
  evidence.error=state.runError;
  evidence.finalStatus="UAT_FAIL_PENDING_INDEPENDENT_CLEANUP";
  persist();
  console.error("PRIVATE ZOKI STAGING UAT EXECUTION:",state.runError);
  process.exitCode=1;
}finally{
  membershipKey=null;
  accessClientSecret=null;
  if(uatConfigPath){ try{fs.unlinkSync(uatConfigPath);}catch{} }
}
