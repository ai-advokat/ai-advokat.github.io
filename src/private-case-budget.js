// RC8-A / TP-01 F-02: fail-closed private-case provider cost and concurrency guard.
// Uses existing atomic D1 tables; this file changes no legal corpus or intake.
import { consumeWindow, reserveMonthlyQuota, currentPeriod, secondsUntilNextMonth } from "./security.js";

export const PRIVATE_CASE_AI_LIMITS=Object.freeze({
  accountHour:6,globalDay:120,accountConcurrent:2,globalConcurrent:12,staleLeaseMinutes:10
});

// Each concurrent operation has its own UUID-fenced lease row. The atomic
// INSERT...SELECT performs the active-count check and insert as one SQLite
// statement; a delayed release removes only its own lease, never a successor.
// Expired rows are ignored independently, so busy accounts cannot keep a
// leaked shared counter alive forever. No migration to the existing D1 table.
async function acquireLease(env,scope,subject,limit){
  const token="lease:"+crypto.randomUUID();
  const result=await env.DB.prepare(
    "INSERT INTO security_rate_limit_windows(scope,subject_key,window_start,request_count,updated_at) " +
    "SELECT ?,?,?,1,CURRENT_TIMESTAMP " +
    "WHERE (SELECT COUNT(*) FROM security_rate_limit_windows " +
    "WHERE scope=? AND subject_key=? AND window_start LIKE 'lease:%' " +
    "AND updated_at >= datetime('now','-10 minutes')) < ? " +
    "RETURNING window_start"
  ).bind(scope,subject,token,scope,subject,limit).run();
  return (result.results||[]).length>0 ? token : null;
}

async function releaseLease(env,scope,subject,token){
  if(!token) return;
  await env.DB.prepare(
    "DELETE FROM security_rate_limit_windows " +
    "WHERE scope=? AND subject_key=? AND window_start=?"
  ).bind(scope,subject,token).run();
}

export async function reservePrivateCaseBudget(env,{subject,quota,now=new Date()}={}){
  if(!env?.DB || typeof env.DB.prepare!=="function")
    return {ok:false,status:503,error:"case_ai_budget_unavailable"};
  if(typeof subject!=="string" || !/^account:[A-Za-z0-9:_-]{1,180}$/.test(subject))
    return {ok:false,status:503,error:"case_ai_identity_unavailable"};
  if(!Number.isSafeInteger(Number(quota)) || Number(quota)<=0)
    return {ok:false,status:429,error:"case_ai_quota_exhausted",retryAfter:secondsUntilNextMonth(now)};
  let accountLease=null,globalLease=null,success=false;
  try{
    const hourly=await consumeWindow(env,{
      scope:"private_case_ai_account_hour",subject,limit:PRIVATE_CASE_AI_LIMITS.accountHour,windowSeconds:3600,now
    });
    if(!hourly.allowed)
      return {ok:false,status:429,error:"case_ai_account_rate_limited",retryAfter:hourly.retryAfter};
    const daily=await consumeWindow(env,{
      scope:"private_case_ai_global_day",subject:"__all_clients__",
      limit:PRIVATE_CASE_AI_LIMITS.globalDay,windowSeconds:86400,now
    });
    if(!daily.allowed)
      return {ok:false,status:429,error:"case_ai_global_budget_exhausted",retryAfter:daily.retryAfter};
    accountLease=await acquireLease(env,"private_case_ai_account_active",subject,PRIVATE_CASE_AI_LIMITS.accountConcurrent);
    if(!accountLease)return {ok:false,status:429,error:"case_ai_account_busy",retryAfter:60};
    globalLease=await acquireLease(env,"private_case_ai_global_active","__all_clients__",PRIVATE_CASE_AI_LIMITS.globalConcurrent);
    if(!globalLease)return {ok:false,status:429,error:"case_ai_service_busy",retryAfter:60};
    const reserved=await reserveMonthlyQuota(env,{subject,period:currentPeriod(now),quota:Number(quota)});
    if(!reserved.reserved)
      return {ok:false,status:429,error:"case_ai_quota_exhausted",retryAfter:secondsUntilNextMonth(now)};
    success=true;
    return {ok:true,lease:{subject,account:accountLease,global:globalLease},used:reserved.used};
  }catch{
    return {ok:false,status:503,error:"case_ai_budget_unavailable"};
  }finally{
    if(!success){
      if(globalLease)await releaseLease(env,"private_case_ai_global_active","__all_clients__",globalLease).catch(()=>{});
      if(accountLease)await releaseLease(env,"private_case_ai_account_active",subject,accountLease).catch(()=>{});
    }
  }
}

export async function releasePrivateCaseBudget(env,budget){
  const lease=budget?.lease;
  if(!lease || !env?.DB)return;
  // Conservative fail closed on release error; the stale lease expires.
  if(lease.global)await releaseLease(env,"private_case_ai_global_active","__all_clients__",lease.global).catch(()=>{});
  if(lease.account)await releaseLease(env,"private_case_ai_account_active",lease.subject,lease.account).catch(()=>{});
}
