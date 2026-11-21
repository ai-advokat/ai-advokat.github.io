// RC8-A / TP-01 F-02: fail-closed private-case provider cost and concurrency guard.
// Uses existing atomic D1 tables; this file changes no legal corpus or intake.
import { consumeWindow, reserveMonthlyQuota, currentPeriod, secondsUntilNextMonth } from "./security.js";

export const PRIVATE_CASE_AI_LIMITS=Object.freeze({
  accountHour:6,globalDay:120,accountConcurrent:2,globalConcurrent:12,staleLeaseMinutes:10
});

// Atomic cross-request lease using existing D1 security_rate_limit_windows.
// Stale leases can be reclaimed after 10 minutes; caller must release in finally.
async function acquireLease(env,scope,subject,limit){
  const result=await env.DB.prepare(
    "INSERT INTO security_rate_limit_windows(scope,subject_key,window_start,request_count,updated_at) " +
    "VALUES (?,?,'active:v1',1,CURRENT_TIMESTAMP) " +
    "ON CONFLICT(scope,subject_key,window_start) DO UPDATE SET " +
    "request_count=CASE WHEN security_rate_limit_windows.updated_at < datetime('now','-10 minutes') " +
    "THEN 1 ELSE security_rate_limit_windows.request_count+1 END, " +
    "updated_at=CURRENT_TIMESTAMP " +
    "WHERE security_rate_limit_windows.updated_at < datetime('now','-10 minutes') " +
    "OR security_rate_limit_windows.request_count < ? " +
    "RETURNING request_count"
  ).bind(scope,subject,limit).run();
  return (result.results||[]).length>0;
}

async function releaseLease(env,scope,subject){
  await env.DB.prepare(
    "UPDATE security_rate_limit_windows " +
    "SET request_count=CASE WHEN request_count>0 THEN request_count-1 ELSE 0 END, " +
    "updated_at=CURRENT_TIMESTAMP " +
    "WHERE scope=? AND subject_key=? AND window_start='active:v1' " +
    "AND updated_at >= datetime('now','-10 minutes')"
  ).bind(scope,subject).run();
}

export async function reservePrivateCaseBudget(env,{subject,quota,now=new Date()}={}){
  if(!env?.DB || typeof env.DB.prepare!=="function")
    return {ok:false,status:503,error:"case_ai_budget_unavailable"};
  if(typeof subject!=="string" || !/^account:[A-Za-z0-9:_-]{1,180}$/.test(subject))
    return {ok:false,status:503,error:"case_ai_identity_unavailable"};
  if(!Number.isSafeInteger(Number(quota)) || Number(quota)<=0)
    return {ok:false,status:429,error:"case_ai_quota_exhausted",retryAfter:secondsUntilNextMonth(now)};
  let accountLease=false,globalLease=false,success=false;
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
    return {ok:true,lease:{subject,account:true,global:true},used:reserved.used};
  }catch{
    return {ok:false,status:503,error:"case_ai_budget_unavailable"};
  }finally{
    if(!success){
      if(globalLease)await releaseLease(env,"private_case_ai_global_active","__all_clients__").catch(()=>{});
      if(accountLease)await releaseLease(env,"private_case_ai_account_active",subject).catch(()=>{});
    }
  }
}

export async function releasePrivateCaseBudget(env,budget){
  const lease=budget?.lease;
  if(!lease || !env?.DB)return;
  // Conservative fail closed on release error; the stale lease expires.
  if(lease.global)await releaseLease(env,"private_case_ai_global_active","__all_clients__").catch(()=>{});
  if(lease.account)await releaseLease(env,"private_case_ai_account_active",lease.subject).catch(()=>{});
}
