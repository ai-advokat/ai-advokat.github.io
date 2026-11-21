import test from "node:test";
import assert from "node:assert/strict";
import {loadWorker} from "./load-worker.mjs";
import {reservePrivateCaseBudget,releasePrivateCaseBudget,PRIVATE_CASE_AI_LIMITS} from "../src/private-case-budget.js";
import {reserveMonthlyQuota} from "../src/security.js";

function fakeBudgetDB({throwSql=false}={}){
  const events=[],active=new Map();
  const DB={prepare(sql){
    if(throwSql)throw new Error("synthetic DB failure");
    return {bind(...args){return {run:async()=>{
      events.push({sql,args});
      // Lease ownership is per token, not a mutable shared counter.
      if(sql.startsWith("DELETE FROM security_rate_limit_windows")){
        const key=args[0]+":"+args[1];
        active.get(key)?.delete(args[2]);
        return {results:[]};
      }
      if(sql.includes("window_start LIKE 'lease:%'")){
        const key=args[0]+":"+args[1],token=args[2],limit=Number(args[5]);
        const leases=active.get(key)||new Set();
        active.set(key,leases);
        if(leases.size>=limit)return {results:[]};
        leases.add(token);
        return {results:[{window_start:token}]};
      }
      if(sql.includes("INSERT INTO membership_usage_monthly"))
        return {results:[{assistant_requests:1}]};
      return {results:[{request_count:1}]};
    }};}};
  }};
  return {DB,events,active};
}

test("RC8-A zero quota never reaches D1 UPSERT or provider",async()=>{
  const {DB,events}=fakeBudgetDB();
  const result=await reservePrivateCaseBudget({DB},{subject:"account:synthetic",quota:0});
  assert.equal(result.status,429);assert.equal(result.error,"case_ai_quota_exhausted");
  assert.equal(events.length,0);
  const direct=await reserveMonthlyQuota({DB},{subject:"account:synthetic",period:"2026-11",quota:0});
  assert.equal(direct.reserved,false);assert.equal(events.length,0);
});

test("RC8-A private gate shares per-account monthly and service-wide limits",async()=>{
  const {DB,events}=fakeBudgetDB(),env={DB};
  const result=await reservePrivateCaseBudget(env,{subject:"account:synthetic",quota:3});
  assert.equal(result.ok,true);
  assert.ok(events.some(x=>x.sql.includes("membership_usage_monthly")));
  assert.ok(events.some(x=>x.args[0]==="private_case_ai_account_hour" && x.args[1]==="account:synthetic"));
  assert.ok(events.some(x=>x.args[0]==="private_case_ai_global_day" && x.args[1]==="__all_clients__"));
  assert.equal(PRIVATE_CASE_AI_LIMITS.accountConcurrent,2);
  await releasePrivateCaseBudget(env,result);
});

test("RC8-A two active operations per account; third rejected; release restores slot",async()=>{
  const {DB}=fakeBudgetDB(),env={DB},opt={subject:"account:concurrency",quota:99};
  const one=await reservePrivateCaseBudget(env,opt),two=await reservePrivateCaseBudget(env,opt);
  const three=await reservePrivateCaseBudget(env,opt);
  assert.equal(one.ok,true);assert.equal(two.ok,true);
  assert.equal(three.status,429);assert.equal(three.error,"case_ai_account_busy");
  await releasePrivateCaseBudget(env,one);
  const four=await reservePrivateCaseBudget(env,opt);
  assert.equal(four.ok,true);
  await releasePrivateCaseBudget(env,two);
  await releasePrivateCaseBudget(env,four);
});

test("RC8-A stale lease release does not release successor token",async()=>{
  const {DB,active}=fakeBudgetDB(),env={DB};
  const opt={subject:"account:replacement",quota:99};
  const a=await reservePrivateCaseBudget(env,opt);
  const b=await reservePrivateCaseBudget(env,opt);
  assert.equal(a.ok,true);assert.equal(b.ok,true);
  // Emulate expiry of A's account lease while B continues operating.
  active.get("private_case_ai_account_active:account:replacement").delete(a.lease.account);
  const c=await reservePrivateCaseBudget(env,opt);
  assert.equal(c.ok,true);
  await releasePrivateCaseBudget(env,a);
  const d=await reservePrivateCaseBudget(env,opt);
  assert.equal(d.status,429);assert.equal(d.error,"case_ai_account_busy");
  assert.equal(active.get("private_case_ai_account_active:account:replacement").has(c.lease.account),true);
  await releasePrivateCaseBudget(env,b);
  await releasePrivateCaseBudget(env,c);
});

test("RC8-A lease IDs are unique and releases are ownership-fenced",async()=>{
  const {DB,active}=fakeBudgetDB(),env={DB};
  const opts={subject:"account:unique",quota:99};
  const a=await reservePrivateCaseBudget(env,opts);
  const b=await reservePrivateCaseBudget(env,opts);
  assert.equal(a.ok,true);assert.equal(b.ok,true);
  assert.notEqual(a.lease.account,b.lease.account);
  assert.match(a.lease.account,/^lease:[0-9a-f-]+$/);
  await releasePrivateCaseBudget(env,a);
  const live=active.get("private_case_ai_account_active:account:unique");
  assert.equal(live.size,1);assert.equal(live.has(b.lease.account),true);
  await releasePrivateCaseBudget(env,b);
  assert.equal(live.size,0);
});

test("RC8-A missing or failing quota D1 fails closed",async()=>{
  const missing=await reservePrivateCaseBudget({}, {subject:"account:x",quota:3});
  const failed=await reservePrivateCaseBudget({DB:fakeBudgetDB({throwSql:true}).DB},{subject:"account:x",quota:3});
  assert.equal(missing.status,503);assert.equal(failed.status,503);
  assert.equal(failed.error,"case_ai_budget_unavailable");
});

test("RC8-A public bot missing D1 gives controlled HTTP 503 with zero model calls",async()=>{
  const {worker}=await loadWorker();let calls=0;
  const env={EXTERNAL_BOT_TRAINING_OPEN:"true",FREE_CHAT_PROVIDER:"workers_ai",
    RATE_LIMIT_SALT:"synthetic-rc8a-limit-salt-32-chars-ok",
    AI:{run:async()=>{calls++;return {response:"UNEXPECTED"};}}};
  const request=new Request("https://audit.invalid/api/bot",{
    method:"POST",headers:{"content-type":"application/json","CF-Connecting-IP":"192.0.2.56"},
    body:JSON.stringify({q:"Објасни како настанува виножитото.",history:[],attachments:[]})
  });
  const r=await worker.fetch(request,env,{});
  assert.equal(r.status,503);assert.equal((await r.json()).error,"assistant_temporarily_unavailable");
  assert.equal(calls,0);
});

test("RC8-A public bot D1 exception gives controlled HTTP 503 with zero model calls",async()=>{
  const {worker}=await loadWorker();let calls=0;
  const env={DB:fakeBudgetDB({throwSql:true}).DB,
    EXTERNAL_BOT_TRAINING_OPEN:"true",FREE_CHAT_PROVIDER:"workers_ai",
    RATE_LIMIT_SALT:"synthetic-rc8a-limit-salt-32-chars-ok",
    AI:{run:async()=>{calls++;return {response:"UNEXPECTED"};}}};
  const request=new Request("https://audit.invalid/api/bot",{
    method:"POST",headers:{"content-type":"application/json","CF-Connecting-IP":"192.0.2.57"},
    body:JSON.stringify({q:"Објасни како настанува виножитото.",history:[],attachments:[]})
  });
  const r=await worker.fetch(request,env,{});
  assert.equal(r.status,503);assert.equal((await r.json()).error,"assistant_temporarily_unavailable");
  assert.equal(calls,0);
});

test("RC8-A private extraction zero-quota owner makes zero conversion and model calls",async()=>{
  const {worker}=await loadWorker();
  const caseId="CASE-00000000-0000-4000-8000-000000000001",documentId="DOC-00000000-0000-4000-8000-000000000002";
  let conversions=0,providers=0;
  const DB={prepare(sql){return {bind(){return this;},async first(){
    if(sql.includes("SELECT 1 AS ok"))return {ok:1};
    if(sql.includes("FROM schema_migrations"))return {version:"synthetic-schema"};
    if(sql.includes("sqlite_master"))return {n:4};
    if(sql.includes("membership_access_keys"))return {account_id:"SYNTHETIC-ACCOUNT",plan_code:"pro",entitlement_status:"active",monthly_quota:0,seat_limit:1};
    if(sql.includes("case_workspace_access"))return {id:caseId,role:"owner",status:"open",professional_use_locked:1};
    if(sql.includes("case_document_slots"))return {id:documentId,original_name:"SYNTHETIC.pdf",mime_type:"application/pdf",storage_key:"synthetic-document",storage_state:"uploaded",extraction_state:"not_started"};
    return null;
  },async all(){return {results:[]};},async run(){return {results:[]};}};}};
  const bytes=new TextEncoder().encode("%PDF-SYNTHETIC TEST ONLY");
  const env={DB,CASE_WORKSPACE_ENABLED:"true",FREE_CHAT_PROVIDER:"workers_ai",WORKERS_AI_MARKDOWN_ENABLED:"true",
    CASE_FILES:{async put(){},async delete(){},async get(){return {size:bytes.length,async arrayBuffer(){return bytes.buffer;}};}},
    AI:{async toMarkdown(){conversions++;return [{data:"SYNTHETIC TEST ONLY"}];},async run(){providers++;return {response:"{}"};}}
  };
  const request=new Request("https://audit.invalid/api/cases/"+caseId+"/documents/"+documentId+"/extract",{
    method:"POST",headers:{authorization:"Bearer synthetic-rc8a-audit-key"}
  });
  const response=await worker.fetch(request,env,{});
  const body=await response.json();
  assert.equal(response.status,429);assert.equal(body.error,"case_ai_quota_exhausted");
  assert.equal(conversions,0);assert.equal(providers,0);
});
