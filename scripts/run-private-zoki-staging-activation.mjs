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
async function api(url,token,{method="GET",body=null}={}){
  const response=await fetch(url,{
    method,
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
    env:{
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID:ACCOUNT,
      CLOUDFLARE_API_TOKEN:env("HG2_C_UAT_WORKER_TOKEN_B")
    },
    shell:false
  });
  if(result.status!==0){
    const stderr=String(result.stderr||"").slice(-2000);
    fail(label+" failed: "+stderr);
  }
}
function runUat(membershipKey,accessId,accessSecret){
  const result=spawnSync(process.execPath,["scripts/run-private-zoki-uat.mjs"],{
    encoding:"utf8",
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

const evidence={
  schema:"ai-advokat-private-zoki-one-button-uat/v1",
  startedAt:new Date().toISOString(),
  humanGate:GATE,
  target:{accountId:ACCOUNT,worker:WORKER,databaseName:DB_NAME,databaseId:DB_ID,origin:ORIGIN},
  productionTouched:false,
  preflight:{baselineClosed:false,openAISecretAbsent:false},
  temporary:{accessAppCreated:false,serviceTokenCreated:false,workersDevEnabled:false,openAISecretAdded:false,membershipProvisioned:false},
  uat:{executed:false,passed:false,totalPassed:null,totalExpected:20},
  cleanup:{membershipRemoved:false,workersDevDisabled:false,openAISecretRemoved:false,baselineRedeployed:false,accessAppDeleted:false,serviceTokenDeleted:false},
  finalStatus:"RUNNING"
};
fs.mkdirSync("artifacts",{recursive:true});
const writeEvidence=()=>fs.writeFileSync("artifacts/private-zoki-one-button-uat-evidence.json",JSON.stringify(evidence,null,2));

let accessAppId=null;
let serviceTokenId=null;
let accessClientId=null;
let accessClientSecret=null;
let membershipAccountId=null;
let membershipKey=null;
let uatConfigPath=null;
let deployedUatConfig=false;

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
  writeEvidence();

  const svc=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/service_tokens`,
    accessToken,
    {method:"POST",body:{name:"AI ADVOKAT 4 Private Zoki UAT "+Date.now(),duration:"2h"}}
  );
  serviceTokenId=String(svc?.result?.id||"");
  accessClientId=String(svc?.result?.client_id||"");
  accessClientSecret=String(svc?.result?.client_secret||"");
  if(!serviceTokenId || !accessClientId || !accessClientSecret) fail("Access service token creation returned incomplete credentials");
  evidence.temporary.serviceTokenCreated=true;

  const app=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/apps`,
    accessToken,
    {method:"POST",body:{
      name:"AI ADVOKAT 4 Private Zoki UAT",
      type:"self_hosted",
      domain:HOST,
      session_duration:"1h",
      policies:[{
        name:"Private Zoki UAT service auth",
        decision:"non_identity",
        precedence:1,
        include:[{service_token:{token_id:serviceTokenId}}]
      }]
    }}
  );
  accessAppId=String(app?.result?.id||"");
  if(!accessAppId) fail("Access application creation did not return id");
  evidence.temporary.accessAppCreated=true;

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
  runWrangler(uatConfigPath,"deploy staging UAT config");
  deployedUatConfig=true;

  await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/secrets`,
    workerToken,
    {method:"PUT",body:{name:"OPENAI_API_KEY",text:env("UAT_OPENAI_API_KEY"),type:"secret_text"}}
  );
  evidence.temporary.openAISecretAdded=true;

  await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`,
    workerToken,
    {method:"POST",body:{enabled:true,previews_enabled:false}}
  );
  evidence.temporary.workersDevEnabled=true;

  const random=randomBytes(24).toString("base64url");
  membershipKey="AIADV-UAT-"+random;
  const hash=createHash("sha256").update(membershipKey,"utf8").digest("hex");
  const prefix=membershipKey.slice(0,12);
  membershipAccountId="UAT-ZOKI-"+Date.now();
  const entitlementId="UAT-ENT-"+randomBytes(8).toString("hex");
  const keyId="UAT-KEY-"+randomBytes(8).toString("hex");
  const starts=new Date();
  const expires=new Date(starts.getTime()+2*60*60*1000);

  await d1("INSERT INTO membership_accounts (id,display_name,email,organization_name,status) VALUES (?,?,NULL,?,'active')",
    [membershipAccountId,"Private Zoki UAT","AI ADVOKAT 4 staging UAT"]);
  await d1("INSERT INTO membership_entitlements (id,account_id,plan_code,status,billing_cycle,monthly_quota,seat_limit,price_mkd,starts_at,expires_at) VALUES (?,?,'office','active','manual',40,1,0,?,?)",
    [entitlementId,membershipAccountId,starts.toISOString(),expires.toISOString()]);
  await d1("INSERT INTO membership_access_keys (id,account_id,key_hash,key_prefix,label,status,expires_at) VALUES (?,?,?,?,?,'active',?)",
    [keyId,membershipAccountId,hash,prefix,"Private Zoki UAT temporary key",expires.toISOString()]);
  evidence.temporary.membershipProvisioned=true;
  evidence.temporary.membership={accountId:membershipAccountId,keyPrefix:prefix,startsAt:starts.toISOString(),expiresAt:expires.toISOString(),quota:40};

  const accessHeaders={"CF-Access-Client-Id":accessClientId,"CF-Access-Client-Secret":accessClientSecret};
  let healthOk=false;
  for(let attempt=1;attempt<=12;attempt++){
    try{
      const response=await fetch(ORIGIN+"/api/health",{headers:accessHeaders});
      if(response.ok){
        const body=await response.json().catch(()=>null);
        if(body?.ok===true){ healthOk=true; break; }
      }
    }catch{}
    await new Promise(r=>setTimeout(r,5000));
  }
  if(!healthOk) fail("Access-protected staging health route did not become ready");

  runUat(membershipKey,accessClientId,accessClientSecret);
  evidence.uat.executed=true;
  const report=JSON.parse(fs.readFileSync("artifacts/private-zoki-uat-run.json","utf8"));
  evidence.uat.passed=report?.pass===true;
  evidence.uat.totalPassed=Number(report?.totalPassed||0);
  if(!evidence.uat.passed || evidence.uat.totalPassed!==20) fail("UAT did not achieve 20/20");
  evidence.finalStatus="UAT_PASS_PENDING_CLEANUP";
  writeEvidence();
}catch(error){
  evidence.error=String(error?.message||error).slice(0,1000);
  evidence.finalStatus="FAIL_PENDING_CLEANUP";
}finally{
  if(membershipAccountId){
    try{
      await d1("DELETE FROM membership_usage_monthly WHERE subject_key=?",["account:"+membershipAccountId]);
      await d1("DELETE FROM membership_access_keys WHERE account_id=?",[membershipAccountId]);
      await d1("DELETE FROM membership_entitlements WHERE account_id=?",[membershipAccountId]);
      await d1("DELETE FROM membership_accounts WHERE id=?",[membershipAccountId]);
      evidence.cleanup.membershipRemoved=true;
    }catch(error){ evidence.cleanup.membershipError=String(error?.message||error).slice(0,500); }
  }

  try{
    await api(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`,
      workerToken,
      {method:"POST",body:{enabled:false,previews_enabled:false}}
    );
    evidence.cleanup.workersDevDisabled=true;
  }catch(error){ evidence.cleanup.workersDevError=String(error?.message||error).slice(0,500); }

  if(evidence.temporary.openAISecretAdded){
    try{
      await api(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/secrets/OPENAI_API_KEY`,
        workerToken,
        {method:"DELETE"}
      );
      evidence.cleanup.openAISecretRemoved=true;
    }catch(error){ evidence.cleanup.openAISecretError=String(error?.message||error).slice(0,500); }
  }else{
    evidence.cleanup.openAISecretRemoved=true;
  }

  if(deployedUatConfig){
    try{
      runWrangler("wrangler.staging.jsonc","restore baseline staging config");
      evidence.cleanup.baselineRedeployed=true;
    }catch(error){ evidence.cleanup.baselineRedeployError=String(error?.message||error).slice(0,500); }
  }else{
    evidence.cleanup.baselineRedeployed=true;
  }

  if(accessAppId){
    try{
      await api(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/apps/${accessAppId}`,
        accessToken,{method:"DELETE"}
      );
      evidence.cleanup.accessAppDeleted=true;
    }catch(error){ evidence.cleanup.accessAppError=String(error?.message||error).slice(0,500); }
  }else evidence.cleanup.accessAppDeleted=true;

  if(serviceTokenId){
    try{
      await api(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/service_tokens/${serviceTokenId}`,
        accessToken,{method:"DELETE"}
      );
      evidence.cleanup.serviceTokenDeleted=true;
    }catch(error){ evidence.cleanup.serviceTokenError=String(error?.message||error).slice(0,500); }
  }else evidence.cleanup.serviceTokenDeleted=true;

  evidence.finishedAt=new Date().toISOString();
  const cleanupOk=Object.entries(evidence.cleanup)
    .filter(([k])=>!k.endsWith("Error"))
    .every(([,v])=>v===true);
  if(evidence.uat.passed===true && cleanupOk){
    evidence.finalStatus="PASS_CLEANUP_VERIFIED";
  }else if(evidence.finalStatus==="UAT_PASS_PENDING_CLEANUP"){
    evidence.finalStatus="UAT_PASS_CLEANUP_FAIL";
  }
  writeEvidence();
  if(uatConfigPath){ try{fs.unlinkSync(uatConfigPath);}catch{} }
  membershipKey=null;
  accessClientSecret=null;
}

if(evidence.finalStatus!=="PASS_CLEANUP_VERIFIED"){
  console.error("PRIVATE ZOKI STAGING UAT:",evidence.finalStatus);
  process.exit(1);
}
console.log("PRIVATE ZOKI STAGING UAT: PASS 20/20 · CLEANUP VERIFIED");
