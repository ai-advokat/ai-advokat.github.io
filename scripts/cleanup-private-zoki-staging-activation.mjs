import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ACCOUNT="0fee10e2bd9a2183d16eb0d73f13dfce";
const WORKER="ai-advokat-staging";
const DB_ID="309f72b8-8711-47fc-bea7-fbd1d649561d";
const STATE_PATH="artifacts/private-zoki-one-button-uat-state.json";
const EVIDENCE_PATH="artifacts/private-zoki-one-button-uat-evidence.json";
const UAT_PROGRESS_PATH="artifacts/private-zoki-uat-progress.json";
const UAT_RUN_PATH="artifacts/private-zoki-uat-run.json";
const QUIESCENCE_MS=180000;

function fail(message){ throw new Error(message); }
function env(name){
  const value=String(process.env[name]||"");
  if(!value) fail("missing required environment variable: "+name);
  return value;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function api(url,token,{method="GET",body=null,timeoutMs=15000}={}){
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
async function retry(label,fn,{attempts=2}={}){
  let last;
  for(let i=1;i<=attempts;i++){
    try{ return await fn(); }
    catch(error){
      last=error;
      if(i<attempts) await sleep(1000*i);
    }
  }
  throw new Error(label+": "+String(last?.message||last));
}
async function d1(sql,params=[]){
  const payload=await api(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    env("HG2_C_UAT_D1_TOKEN_W"),
    {method:"POST",body:{sql,params}}
  );
  const batches=Array.isArray(payload?.result) ? payload.result : (payload?.result ? [payload.result] : []);
  if(!batches.length) fail("D1 query returned no result batch");
  for(const batch of batches){
    if(batch?.success!==true) fail("D1 query batch failed: "+String(batch?.error||batch?.message||"unknown"));
  }
  return payload;
}
function runWrangler(config,label){
  const cli=path.resolve("node_modules","wrangler","bin","wrangler.js");
  if(!fs.existsSync(cli)) fail("Wrangler CLI not installed");
  const result=spawnSync(process.execPath,[cli,"deploy","--config",config],{
    encoding:"utf8",
    timeout:90000,
    killSignal:"SIGTERM",
    env:{
      ...process.env,
      CLOUDFLARE_ACCOUNT_ID:ACCOUNT,
      CLOUDFLARE_API_TOKEN:env("HG2_C_UAT_WORKER_TOKEN_B")
    },
    shell:false
  });
  if(result.error) fail(label+" failed: "+String(result.error.message||result.error));
  if(result.status!==0) fail(label+" failed: "+String(result.stderr||"").slice(-2000));
}
function firstResultRows(payload){
  const batch=Array.isArray(payload?.result) ? payload.result[0] : payload?.result;
  return Array.isArray(batch?.results) ? batch.results : [];
}
async function findAccessByName(token,endpoint,name){
  const matches=[];
  let page=1;
  for(;;){
    const payload=await api(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/${endpoint}?page=${page}&per_page=100`,
      token
    );
    const list=Array.isArray(payload?.result) ? payload.result : [];
    matches.push(...list.filter(x=>String(x?.name||"")===name));
    const totalPages=Math.max(1,Number(payload?.result_info?.total_pages||1));
    if(page>=totalPages) break;
    page++;
    if(page>100) fail("Access pagination exceeded safety bound");
  }
  return matches;
}

fs.mkdirSync("artifacts",{recursive:true});
const state=fs.existsSync(STATE_PATH)
  ? JSON.parse(fs.readFileSync(STATE_PATH,"utf8"))
  : {
      schema:"ai-advokat-private-zoki-one-button-state/v2",
      target:{accountId:ACCOUNT,worker:WORKER,databaseId:DB_ID},
      access:{serviceTokenName:null,serviceTokenId:null,appName:null,appId:null},
      worker:{uatDeployAttempted:false,openAISecretAddAttempted:false,workersDevEnableAttempted:false},
      membership:{accountId:null,provisionAttempted:false},
      uat:{executed:false,passed:false,totalPassed:null,totalExpected:20,telemetryWindowStartedAt:null,telemetryWindowEndedAt:null,governanceRunIds:[]},
      runError:"state file missing"
    };
const evidence=fs.existsSync(EVIDENCE_PATH)
  ? JSON.parse(fs.readFileSync(EVIDENCE_PATH,"utf8"))
  : {
      schema:"ai-advokat-private-zoki-one-button-uat/v2",
      target:state.target,
      productionTouched:false,
      uat:state.uat,
      finalStatus:"CLEANUP_WITHOUT_EXECUTION_EVIDENCE"
    };

const cleanup={
  startedAt:new Date().toISOString(),
  accessRevokedBeforeMembershipCleanup:false,
  quiescenceMs:0,
  telemetry:{capturedRunIds:0,windowRunIds:0,deletedRunIds:0,verifiedAbsent:false,windowVerifiedEmpty:false},
  membershipDeletes:{usage:false,rateLimits:false,keys:false,entitlements:false,account:false,verifiedAbsent:false},
  workersDevDisabled:false,
  openAISecretRemoved:false,
  baselineRedeployed:false,
  accessAppDeleted:false,
  serviceTokenDeleted:false,
  errors:[]
};
const recordError=(label,error)=>cleanup.errors.push({label,message:String(error?.message||error).slice(0,700)});

// 1) Revoke the external request path before touching membership rows.
if(state.worker?.workersDevEnableAttempted){
  try{
    await retry("disable workers.dev",()=>api(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/subdomain`,
      env("HG2_C_UAT_WORKER_TOKEN_B"),
      {method:"POST",body:{enabled:false,previews_enabled:false}}
    ));
    cleanup.workersDevDisabled=true;
  }catch(error){ recordError("workers_dev_disable",error); }
}else cleanup.workersDevDisabled=true;

const accessToken=String(process.env.HG2_C_UAT_ACCESS_TOKEN_A||"");
if(accessToken){
  try{
    let appIds=[];
    if(state.access?.appId) appIds=[state.access.appId];
    else if(state.access?.appName) appIds=(await findAccessByName(accessToken,"apps",state.access.appName)).map(x=>String(x?.id||"")).filter(Boolean);
    for(const id of appIds){
      await retry("delete Access app",()=>api(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/apps/${id}`,
        accessToken,{method:"DELETE"}
      ));
    }
    cleanup.accessAppDeleted=true;
  }catch(error){ recordError("access_app_delete",error); }

  try{
    let tokenIds=[];
    if(state.access?.serviceTokenId) tokenIds=[state.access.serviceTokenId];
    else if(state.access?.serviceTokenName) tokenIds=(await findAccessByName(accessToken,"service_tokens",state.access.serviceTokenName)).map(x=>String(x?.id||"")).filter(Boolean);
    for(const id of tokenIds){
      await retry("delete Access service token",()=>api(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/access/service_tokens/${id}`,
        accessToken,{method:"DELETE"}
      ));
    }
    cleanup.serviceTokenDeleted=true;
  }catch(error){ recordError("service_token_delete",error); }
}else{
  recordError("access_token_missing",new Error("HG2_C_UAT_ACCESS_TOKEN_A unavailable to cleanup"));
}

// 2) Remove provider capability and restore the closed baseline.
if(state.worker?.openAISecretAddAttempted){
  try{
    await retry("remove staging OpenAI secret",()=>api(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/secrets/OPENAI_API_KEY`,
      env("HG2_C_UAT_WORKER_TOKEN_B"),
      {method:"DELETE"}
    ));
    cleanup.openAISecretRemoved=true;
  }catch(error){
    const msg=String(error?.message||error);
    if(/404|not found/i.test(msg)) cleanup.openAISecretRemoved=true;
    else recordError("openai_secret_remove",error);
  }
}else cleanup.openAISecretRemoved=true;

if(state.worker?.uatDeployAttempted){
  try{
    await retry("restore baseline staging config",async()=>runWrangler("wrangler.staging.jsonc","restore baseline staging config"));
    cleanup.baselineRedeployed=true;
  }catch(error){ recordError("baseline_redeploy",error); }
}else cleanup.baselineRedeployed=true;

cleanup.accessRevokedBeforeMembershipCleanup=
  cleanup.workersDevDisabled===true &&
  cleanup.accessAppDeleted===true &&
  cleanup.serviceTokenDeleted===true;

// Allow any request that had already resolved membership before revocation to finish.
if(state.membership?.accountId && state.worker?.workersDevEnableAttempted){
  await sleep(QUIESCENCE_MS);
  cleanup.quiescenceMs=QUIESCENCE_MS;
}

// 3) Remove UAT-only LIOE telemetry after the request path is closed and quiescent.
{
  const runIds=new Set();
  const addRunIds=value=>{
    for(const id of Array.isArray(value)?value:[]){
      if(typeof id==="string" && /^LIOE-RT-[A-Za-z0-9-]+$/.test(id)) runIds.add(id);
    }
  };
  addRunIds(state.uat?.governanceRunIds);

  for(const file of [UAT_PROGRESS_PATH,UAT_RUN_PATH]){
    try{
      if(!fs.existsSync(file)) continue;
      const payload=JSON.parse(fs.readFileSync(file,"utf8"));
      addRunIds(payload?.governanceRunIds);
    }catch(error){
      recordError("telemetry_evidence_read",error);
    }
  }
  cleanup.telemetry.capturedRunIds=runIds.size;

  const windowStart=state.uat?.telemetryWindowStartedAt||null;
  const windowEnd=state.uat?.telemetryWindowEndedAt||cleanup.startedAt;
  if(windowStart){
    try{
      const payload=await retry("enumerate UAT telemetry window",()=>d1(
        "SELECT run_id FROM lioe_runtime_runs WHERE started_at >= ? AND started_at <= ? ORDER BY started_at",
        [windowStart,windowEnd]
      ));
      const windowIds=firstResultRows(payload)
        .map(row=>String(row?.run_id||""))
        .filter(id=>/^LIOE-RT-[A-Za-z0-9-]+$/.test(id));
      cleanup.telemetry.windowRunIds=windowIds.length;
      for(const id of windowIds) runIds.add(id);
    }catch(error){
      recordError("telemetry_window_enumerate",error);
    }
  }

  const ids=[...runIds];
  if(ids.length){
    const placeholders=ids.map(()=>"?").join(",");
    try{
      await retry("delete UAT telemetry batch",()=>d1(
        `DELETE FROM lioe_runtime_runs WHERE run_id IN (${placeholders})`,
        ids
      ));
      cleanup.telemetry.deletedRunIds=ids.length;
    }catch(error){
      recordError("telemetry_delete",error);
    }

    try{
      const payload=await d1(
        `SELECT COUNT(*) AS n FROM lioe_runtime_runs WHERE run_id IN (${placeholders})`,
        ids
      );
      const remaining=Number(firstResultRows(payload)[0]?.n||0);
      cleanup.telemetry.verifiedAbsent=remaining===0;
      if(!cleanup.telemetry.verifiedAbsent){
        recordError("telemetry_verify",new Error("captured UAT telemetry rows remain"));
      }
    }catch(error){
      recordError("telemetry_verify",error);
    }
  }else{
    cleanup.telemetry.verifiedAbsent=true;
  }

  if(windowStart){
    try{
      const payload=await d1(
        "SELECT COUNT(*) AS n FROM lioe_runtime_runs WHERE started_at >= ? AND started_at <= ?",
        [windowStart,windowEnd]
      );
      cleanup.telemetry.windowVerifiedEmpty=Number(firstResultRows(payload)[0]?.n||0)===0;
      if(!cleanup.telemetry.windowVerifiedEmpty){
        recordError("telemetry_window_verify",new Error("UAT telemetry window still contains rows"));
      }
    }catch(error){
      recordError("telemetry_window_verify",error);
    }
  }else{
    cleanup.telemetry.windowVerifiedEmpty=true;
  }
}

// 4) Remove membership state only after the request path is closed and quiescent.
if(state.membership?.accountId){
  const accountId=state.membership.accountId;
  const ops=[
    ["keys",()=>d1("DELETE FROM membership_access_keys WHERE account_id=?",[accountId])],
    ["entitlements",()=>d1("DELETE FROM membership_entitlements WHERE account_id=?",[accountId])],
    ["account",()=>d1("DELETE FROM membership_accounts WHERE id=?",[accountId])],
    ["usage",()=>d1("DELETE FROM membership_usage_monthly WHERE subject_key=?",["account:"+accountId])],
    ["rateLimits",()=>d1("DELETE FROM security_rate_limit_windows WHERE subject_key=?",["account:"+accountId])]
  ];
  for(const [name,fn] of ops){
    try{
      await retry("membership cleanup "+name,fn);
      cleanup.membershipDeletes[name]=true;
    }catch(error){
      recordError("membership_"+name,error);
    }
  }

  // One final usage sweep catches any late quota write from a request that was
  // already in flight when the external request path was revoked.
  try{
    await sleep(3000);
    await retry("membership cleanup final usage sweep",()=>d1(
      "DELETE FROM membership_usage_monthly WHERE subject_key=?",
      ["account:"+accountId]
    ));
    cleanup.membershipDeletes.usage=true;
  }catch(error){
    recordError("membership_usage_final_sweep",error);
  }

  try{
    const checks=await Promise.all([
      d1("SELECT COUNT(*) AS n FROM membership_accounts WHERE id=?",[accountId]),
      d1("SELECT COUNT(*) AS n FROM membership_access_keys WHERE account_id=?",[accountId]),
      d1("SELECT COUNT(*) AS n FROM membership_entitlements WHERE account_id=?",[accountId]),
      d1("SELECT COUNT(*) AS n FROM membership_usage_monthly WHERE subject_key=?",["account:"+accountId]),
      d1("SELECT COUNT(*) AS n FROM security_rate_limit_windows WHERE subject_key=?",["account:"+accountId])
    ]);
    const counts=checks.map(x=>Number(firstResultRows(x)[0]?.n||0));
    cleanup.membershipDeletes.verifiedAbsent=counts.every(n=>n===0);
    if(!cleanup.membershipDeletes.verifiedAbsent) recordError("membership_verify",new Error("temporary membership or usage rows remain"));
  }catch(error){
    recordError("membership_verify",error);
  }
}else{
  cleanup.membershipDeletes={usage:true,rateLimits:true,keys:true,entitlements:true,account:true,verifiedAbsent:true};
}

cleanup.finishedAt=new Date().toISOString();
const cleanupOk=
  cleanup.accessRevokedBeforeMembershipCleanup===true &&
  cleanup.telemetry.verifiedAbsent===true &&
  cleanup.telemetry.windowVerifiedEmpty===true &&
  cleanup.membershipDeletes.verifiedAbsent===true &&
  cleanup.workersDevDisabled===true &&
  cleanup.openAISecretRemoved===true &&
  cleanup.baselineRedeployed===true &&
  cleanup.accessAppDeleted===true &&
  cleanup.serviceTokenDeleted===true &&
  cleanup.errors.length===0;

evidence.cleanup=cleanup;
evidence.uat=state.uat||evidence.uat;
if(evidence.uat?.passed===true && Number(evidence.uat?.totalPassed||0)===20 && cleanupOk){
  evidence.finalStatus="PASS_CLEANUP_VERIFIED";
}else if(cleanupOk){
  evidence.finalStatus="UAT_NOT_PASS_CLEANUP_VERIFIED";
}else{
  evidence.finalStatus=evidence.uat?.passed===true ? "UAT_PASS_CLEANUP_FAIL" : "UAT_FAIL_CLEANUP_FAIL";
}
evidence.finishedAt=new Date().toISOString();
const evidenceTmp=EVIDENCE_PATH+".tmp";
fs.writeFileSync(evidenceTmp,JSON.stringify(evidence,null,2));
fs.renameSync(evidenceTmp,EVIDENCE_PATH);

if(!cleanupOk){
  console.error("PRIVATE ZOKI STAGING CLEANUP: FAIL");
  process.exit(1);
}
console.log("PRIVATE ZOKI STAGING CLEANUP: VERIFIED");
