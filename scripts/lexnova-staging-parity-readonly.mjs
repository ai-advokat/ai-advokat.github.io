// Read-only, staging-only source parity. NO POST, AI request or deployment.
// Usage: STAGING_BASE_URL=https://ai-advokat-staging.<account>.workers.dev node scripts/lexnova-staging-parity-readonly.mjs
const raw=String(process.env.STAGING_BASE_URL||"").trim();
if(!raw){
  console.error("STAGING_BASE_URL is required; no URL inferred and no endpoint called.");
  process.exit(2);
}
let base;
try{base=new URL(raw);}catch{console.error("Invalid STAGING_BASE_URL.");process.exit(2);}
if(base.protocol!=="https:"||!base.hostname.endsWith(".workers.dev")||
   !base.hostname.startsWith("ai-advokat-staging.")||base.username||base.password||base.port||
   base.pathname!=="/"||base.search||base.hash){
  console.error("Refusing non-staging, non-root or credential-bearing URL. Production is never accessed.");
  process.exit(2);
}
const marker='name="lexnova-release-candidate" content="LEXNOVA_HYBRID_V1_20261117"';
const checks=[
  {path:"/bot/",label:"external_bot_release_marker",required:[marker,"lexnova-human-handoff.js","lexnova-source-card.js"]},
  {path:"/",label:"internal_bot_release_marker",required:[marker,"lexnova-quick-chat.js","lexnova-source-card.js"]},
  {path:"/lexnova-document-copilot.html",label:"local_document_ui",required:["LexNova Document Copilot"]},
  {path:"/lexnova-conversation-intelligence.html",label:"local_private_metrics_ui",required:["LexNova Conversation Intelligence"]},
  {path:"/assets/lexnova-hybrid-v1.css",label:"styles",required:["lexnova-source-card"]},
  {path:"/assets/lexnova-legal-router.js",label:"router_static_optional",required:[],optional:true},
  {path:"/assets/lexnova-document-copilot.mjs",label:"local_document_engine",required:["LEXNOVA_LOCAL_DOCUMENT_REVIEW_V1"]},
  {path:"/assets/lexnova-quick-chat.js",label:"lazy_widget",required:["LEXNOVA_QUICK_CHAT_V1"]},
  {path:"/assets/lexnova-human-handoff.js",label:"manual_handoff",required:["LEXNOVA_HUMAN_HANDOFF_V1"]},
  {path:"/assets/lexnova-source-card.js",label:"source_cards",required:["LEXNOVA_SOURCE_CARD_V1"]},
  {path:"/assets/lexnova-local-analytics.js",label:"optin_metrics",required:["LEXNOVA_LOCAL_METRICS_V1"]}
];
const report={target:base.origin,checkedAt:new Date().toISOString(),readOnly:true,providerCalls:0,status:"NOT_VERIFIED",results:[]};
let failed=false;
for(const check of checks){
 if(check.optional)continue;
 const url=base.origin+check.path+"?lexnova-static-parity=20261117";
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(url,{cache:"no-store",method:"GET",signal:controller.signal,redirect:"error",
    headers:{"accept":"text/html, text/css, text/javascript;q=0.9, */*;q=0.1"}});}
  finally{clearTimeout(timeout);}
  const body=await response.text();
  const ok=response.ok&&response.url.startsWith(base.origin+"/")&&check.required.every(text=>body.includes(text));
  if(!ok)failed=true;
  report.results.push({label:check.label,status:response.status,pass:ok,bytes:body.length});
 }catch(error){
  failed=true;report.results.push({label:check.label,status:"unreachable",pass:false,reason:String(error?.name||"network_error")});
 }
}
report.status=failed?"STATIC_PARITY_NOT_VERIFIED":"STATIC_PARITY_VERIFIED_BACKEND_NOT_TESTED";
console.log(JSON.stringify(report,null,2));
if(failed)process.exitCode=1;
