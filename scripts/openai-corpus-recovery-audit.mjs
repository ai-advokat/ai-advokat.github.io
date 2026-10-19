import fs from "node:fs";

const API_BASE="https://api.openai.com/v1";
const apiKey=String(process.env.OPENAI_API_KEY||"").trim();
if(!apiKey || apiKey.length<20) throw new Error("OPENAI_API_KEY missing");

const optionalProject=String(process.env.OPENAI_PROJECT_ID||"").trim();
const optionalOrg=String(process.env.OPENAI_ORG_ID||"").trim();

function headers(extra={}){
  return {
    "Authorization":"Bearer "+apiKey,
    "Content-Type":"application/json",
    "OpenAI-Beta":"assistants=v2",
    ...(optionalProject?{"OpenAI-Project":optionalProject}:{}),
    ...(optionalOrg?{"OpenAI-Organization":optionalOrg}:{}),
    ...extra
  };
}

async function api(path,options={}){
  const res=await fetch(API_BASE+path,{...options,headers:headers(options.headers||{})});
  let body=null;
  try{ body=await res.json(); }catch{}
  if(!res.ok){
    const code=body?.error?.code||body?.error?.type||("http_"+res.status);
    const err=new Error(String(code));
    err.status=res.status;
    throw err;
  }
  return body||{};
}

async function listPaged(basePath){
  const out=[];
  let after="";
  for(let page=0;page<500;page++){
    const join=basePath.includes("?")?"&":"?";
    const url=basePath+join+"limit=100"+(after?"&after="+encodeURIComponent(after):"");
    const payload=await api(url);
    const rows=Array.isArray(payload.data)?payload.data:[];
    out.push(...rows);
    if(!payload.has_more || !payload.last_id || rows.length===0) break;
    after=String(payload.last_id);
  }
  return out;
}

function unixInWindow(ts,start,end){
  const n=Number(ts||0);
  return Number.isFinite(n) && n>=start && n<=end;
}

function legalNameHint(name){
  const s=String(name||"").toLowerCase();
  return /(paragraf|pravo|legal|law|zakon|sud|court|presud|obras|template|maked|maced|mk\b|advokat)/i.test(s);
}

async function probeVectorStore(id){
  const probes=[
    "Закон за парничната постапка член",
    "Кривичен законик Службен весник",
    "Врховен суд Република Северна Македонија пресуда",
    "тужба жалба образец адвокат"
  ];
  let successful=0;
  let withHits=0;
  for(const query of probes){
    try{
      const result=await api("/vector_stores/"+encodeURIComponent(id)+"/search",{
        method:"POST",
        body:JSON.stringify({query,max_num_results:3})
      });
      successful++;
      if(Array.isArray(result.data) && result.data.length>0) withHits++;
    }catch{
      // Read-only audit: a search incompatibility must not stop top-level inventory.
    }
  }
  return {successful,withHits};
}

const startedAt=new Date().toISOString();
const stores=await listPaged("/vector_stores?order=desc");
let files=[];
try{ files=await listPaged("/files?order=desc"); }catch{ files=[]; }

const start=Math.floor(Date.parse("2026-03-01T00:00:00Z")/1000);
const end=Math.floor(Date.parse("2026-05-31T23:59:59Z")/1000);

const windowStores=stores.filter(s=>unixInWindow(s.created_at,start,end));
const candidatePool=stores.filter(s=>{
  const total=Number(s?.file_counts?.total||0);
  return (unixInWindow(s.created_at,start,end) && total>=20) || (legalNameHint(s.name) && total>=20);
});

const candidates=[];
for(const s of candidatePool.slice(0,40)){
  const probe=await probeVectorStore(String(s.id||""));
  if(probe.withHits>=2 || (unixInWindow(s.created_at,start,end) && Number(s?.file_counts?.total||0)>=100)){
    candidates.push({
      id:String(s.id||""),
      created_at:Number(s.created_at||0),
      files:Number(s?.file_counts?.total||0),
      completed:Number(s?.file_counts?.completed||0),
      usage_bytes:Number(s.usage_bytes||0),
      status:String(s.status||""),
      probe_successful:probe.successful,
      probe_hit_queries:probe.withHits
    });
  }
}

const candidateTotals=candidates.reduce((a,s)=>{
  a.files+=s.files;
  a.usage_bytes+=s.usage_bytes;
  return a;
},{files:0,usage_bytes:0});

const purposeCounts={};
for(const f of files){
  const p=String(f.purpose||"unknown");
  purposeCounts[p]=(purposeCounts[p]||0)+1;
}

const inventory={
  audit_version:"AI_ADVOCAT_OPENAI_CORPUS_RECOVERY_AUDIT_v1",
  started_at:startedAt,
  completed_at:new Date().toISOString(),
  scope:{
    project_header_supplied:Boolean(optionalProject),
    organization_header_supplied:Boolean(optionalOrg),
    read_only:true,
    secret_values_logged:false
  },
  totals:{
    vector_stores:stores.length,
    vector_stores_created_2026_03_to_2026_05:windowStores.length,
    api_files:files.length,
    vector_store_reported_files:stores.reduce((n,s)=>n+Number(s?.file_counts?.total||0),0),
    vector_store_usage_bytes:stores.reduce((n,s)=>n+Number(s.usage_bytes||0),0)
  },
  candidate_summary:{
    strong_legal_candidates:candidates.length,
    candidate_reported_files:candidateTotals.files,
    candidate_usage_bytes:candidateTotals.usage_bytes,
    candidate_created_in_target_window:candidates.filter(s=>unixInWindow(s.created_at,start,end)).length,
    candidate_probe_queries_with_hits:candidates.reduce((n,s)=>n+s.probe_hit_queries,0)
  },
  file_purpose_counts:purposeCounts,
  // IDs are retained only in the ephemeral runner file. The workflow must not print/upload them.
  private_candidate_ids:candidates.map(s=>s.id),
  private_candidate_details:candidates
};

fs.mkdirSync("/tmp/ai-advokat-openai-recovery",{recursive:true});
fs.writeFileSync("/tmp/ai-advokat-openai-recovery/inventory.json",JSON.stringify(inventory,null,2));

const mb=n=>(Number(n||0)/1024/1024).toFixed(2);
const safe={
  audit_version:inventory.audit_version,
  read_only:true,
  vector_stores:inventory.totals.vector_stores,
  target_window_stores:inventory.totals.vector_stores_created_2026_03_to_2026_05,
  api_files:inventory.totals.api_files,
  reported_vector_store_files:inventory.totals.vector_store_reported_files,
  total_vector_store_usage_mb:mb(inventory.totals.vector_store_usage_bytes),
  strong_legal_candidates:inventory.candidate_summary.strong_legal_candidates,
  candidate_reported_files:inventory.candidate_summary.candidate_reported_files,
  candidate_usage_mb:mb(inventory.candidate_summary.candidate_usage_bytes),
  candidates_in_march_may_2026:inventory.candidate_summary.candidate_created_in_target_window,
  legal_probe_hit_queries:inventory.candidate_summary.candidate_probe_queries_with_hits,
  file_purpose_counts:inventory.file_purpose_counts
};

fs.writeFileSync("/tmp/ai-advokat-openai-recovery/safe-summary.json",JSON.stringify(safe,null,2));
console.log("OPENAI_CORPUS_RECOVERY_SAFE_SUMMARY="+JSON.stringify(safe));
