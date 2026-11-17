/* LexNova Conversation Intelligence v1: opt-in, local-only aggregate metrics.
 * No prompts, answers, case IDs, IP addresses, auth tokens or source URLs.
 * No fetch/beacons; this cannot act as a cross-user admin dashboard.
 */
(function(scope){
"use strict";
const KEY="lexnova_conversation_intelligence_aggregates_v1";
const OPT="lexnova_conversation_intelligence_optin_v1";
const VERSION="LEXNOVA_LOCAL_METRICS_V1";
const CATEGORIES=new Set(["law","case_law","documents","contract","news","general","other"]);
const OUTCOMES=new Set(["success","provider_error","timeout","stopped","blocked"]);
const LEVELS=[500,2000,5000,10000,30000,90000,180000];
function storage(){try{return scope.localStorage||null;}catch{return null;}}
function enabled(){try{return storage()?.getItem(OPT)==="yes";}catch{return false;}}
function setEnabled(next){
  const store=storage();if(!store)return false;
  if(next)store.setItem(OPT,"yes");else store.removeItem(OPT);
  return enabled();
}
function empty(){return {version:VERSION,total:0,outcomes:{},routes:{},latencyBuckets:{},lastUpdated:null};}
function snapshot(){
  try{
    const x=JSON.parse(storage()?.getItem(KEY)||"null");
    if(!x||x.version!==VERSION)return empty();
    return {
      version:VERSION,
      total:Math.max(0,Math.min(1000000,Number(x.total)||0)),
      outcomes:Object.fromEntries(Object.entries(x.outcomes||{}).filter(([k])=>OUTCOMES.has(k))),
      routes:Object.fromEntries(Object.entries(x.routes||{}).filter(([k])=>CATEGORIES.has(k))),
      latencyBuckets:Object.fromEntries(Object.entries(x.latencyBuckets||{}).filter(([k])=>k==="overflow"||LEVELS.some(n=>String(n)===k))),
      lastUpdated:/^\d{4}-\d{2}-\d{2}$/.test(String(x.lastUpdated||""))?x.lastUpdated:null
    };
  }catch{return empty();}
}
function record({category="other",outcome="blocked",durationMs=0}={}){
  if(!enabled())return false;
  const next=snapshot();
  const route=CATEGORIES.has(category)?category:"other";
  const result=OUTCOMES.has(outcome)?outcome:"blocked";
  const n=Number.isFinite(durationMs)?Math.max(0,Math.min(600000,Math.round(durationMs))):0;
  const bucket=String(LEVELS.find(x=>n<=x)||"overflow");
  next.total=Math.min(1000000,next.total+1);
  next.routes[route]=Math.min(1000000,(Number(next.routes[route])||0)+1);
  next.outcomes[result]=Math.min(1000000,(Number(next.outcomes[result])||0)+1);
  next.latencyBuckets[bucket]=Math.min(1000000,(Number(next.latencyBuckets[bucket])||0)+1);
  next.lastUpdated=new Date().toISOString().slice(0,10);
  try{storage()?.setItem(KEY,JSON.stringify(next));return true;}catch{return false;}
}
function reset(){try{storage()?.removeItem(KEY);return true;}catch{return false;}}
scope.LexNovaAnalytics=Object.freeze({version:VERSION,enabled,setEnabled,record,snapshot,reset});
})(typeof window!=="undefined"?window:globalThis);
