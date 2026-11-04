import fs from "node:fs";

// Production recheck after PR #516 merge 63cce0c6
const BASE=String(process.env.AI_ADVOCAT_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev").replace(/\/$/,"");
const KEY=String(process.env.AI_ADVOCAT_MEMBERSHIP_KEY||"").trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SELF_CHECK=process.argv.includes("--self-check");

if(!/^https?:\/\//i.test(BASE)) throw new Error("AI_ADVOCAT_BASE must be an absolute http(s) URL");
if(SELF_CHECK){
  console.log(JSON.stringify({ok:true,mode:"self-check",productionBase:BASE,node:process.version}));
  process.exit(0);
}

const scenarios=[
  {id:"V4-ECHR",label:"Strict ECHR won-case HUDOC gate",
   q:"Дај ми ги предметите што македонски апликанти ги добиле против Северна Македонија во Стразбур. Не означувај ниту еден како добиен без HUDOC operative-part проверка.",
   must:[/HUDOC/iu,/(не враќа|не означува|operative part|исход|провер)/iu],
   echr:true},
  {id:"V4-TEMPORAL",label:"Historical case-law temporal gate",
   q:"Дали правен став на Апелационен суд Штип од 1997 година автоматски е важечко право во 2026? Оддели историски извор од тековна применливост.",
   must:[/(1997|2026)/u,/(не.*автомат|истор|провер|важеч|примен)/iu]},
  {id:"V4-CONTROL",label:"Non-legal control and reliability",
   q:"Напиши кратка и професионална порака до клиент: Го примивме вашиот документ и ќе го разгледаме.",
   must:[/документ/iu],
   forbid:[/член\s+\d+|Службен весник|HUDOC/iu],
   nonLegal:true}
];

async function call(path,q,headers={}){
  const started=Date.now();
  try{
    const res=await fetch(BASE+path,{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json",...headers},
      body:JSON.stringify({q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]}),
      signal:AbortSignal.timeout(120000)
    });
    const raw=await res.text();
    let data=null; try{data=JSON.parse(raw);}catch{}
    return {status:res.status,data,raw:raw.slice(0,3000),ms:Date.now()-started};
  }catch(e){
    return {status:0,data:null,raw:String(e?.message||e),ms:Date.now()-started};
  }
}

function assess(tc,res,surface){
  const d=res.data||{}, answer=String(d.answer||"");
  const hard=[], quality=[];
  if(res.status!==200) hard.push("http_"+res.status);
  if(d.ok!==true) hard.push("response_not_ok");
  if(!answer.trim()) hard.push("empty_answer");

  for(const re of tc.must||[]) if(!re.test(answer)) quality.push("missing:"+re.source);
  for(const re of tc.forbid||[]) if(re.test(answer)) hard.push("forbidden:"+re.source);

  if(tc.echr && d.ok===true){
    const s=d.echrBureauIndexStatus||{};
    if(s.outcomeClaimRequested!==true) hard.push("echr_outcome_request_not_detected");
    if(s.state!=="hudoc_verification_required") hard.push("echr_wrong_state:"+String(s.state||""));
    if(Number(s.selectedRecords)!==0) hard.push("echr_unverified_cases_released:"+String(s.selectedRecords));
    if(d.displayMode!=="canonical_echr_bureau_outcome_verification_required") hard.push("echr_wrong_display_mode");
  }

  if(surface==="EXTERNAL_PRO" && d.ok===true && !tc.nonLegal && d.provider!=="canonical_corpus_no_model"){
    const lg=d.legalGovernance||{};
    if(lg.engine!=="AI_ADVOKAT_LIOE_v1") hard.push("lioe_missing");
    if(!lg.missionProfile) quality.push("mission_profile_missing");
  }

  const score=Math.max(0,10-hard.length*4-quality.length);
  return {hard,quality,score};
}

const surfaces=[
  {name:"INTERNAL_FREE",path:"/api/chat",headers:{}},
  {name:"EXTERNAL_PRO",path:"/api/bot",headers:{"X-Membership-Key":KEY}}
];

if(!KEY) throw new Error("AI_ADVOCAT_MEMBERSHIP_KEY missing");

const rows=[];
for(const tc of scenarios){
  // Internal first: one FREE request per scenario, below the configured quota.
  const internal=await call("/api/chat",tc.q,{});
  const ia=assess(tc,internal,"INTERNAL_FREE");
  rows.push({
    id:tc.id,label:tc.label,surface:"INTERNAL_FREE",status:internal.status,latencyMs:internal.ms,
    errorCode:internal.data?.error||null,provider:internal.data?.provider||null,model:internal.data?.model||null,
    displayMode:internal.data?.displayMode||null,sourceMode:internal.data?.sourceMode||null,
    hardFailures:ia.hard,qualityFindings:ia.quality,score:ia.score,
    raw:internal.raw,answer:String(internal.data?.answer||"").slice(0,1800)
  });

  // Professional: one request per scenario, paced to stay below 5 requests / 60s burst gate.
  const pro=await call("/api/bot",tc.q,{"X-Membership-Key":KEY});
  const pa=assess(tc,pro,"EXTERNAL_PRO");
  rows.push({
    id:tc.id,label:tc.label,surface:"EXTERNAL_PRO",status:pro.status,latencyMs:pro.ms,
    errorCode:pro.data?.error||null,provider:pro.data?.provider||null,model:pro.data?.model||null,
    displayMode:pro.data?.displayMode||null,sourceMode:pro.data?.sourceMode||null,
    missionProfile:pro.data?.legalGovernance?.missionProfile||null,
    providerFallbackMode:pro.data?.legalGovernance?.providerFallbackMode||null,
    hardFailures:pa.hard,qualityFindings:pa.quality,score:pa.score,
    raw:pro.raw,answer:String(pro.data?.answer||"").slice(0,1800)
  });
  await sleep(18000);
}

const bySurface={};
for(const name of ["INTERNAL_FREE","EXTERNAL_PRO"]){
  const rr=rows.filter(r=>r.surface===name);
  bySurface[name]={
    tests:rr.length,
    hardFailures:rr.reduce((n,r)=>n+r.hardFailures.length,0),
    qualityFindings:rr.reduce((n,r)=>n+r.qualityFindings.length,0),
    averageScore:Number((rr.reduce((n,r)=>n+r.score,0)/rr.length).toFixed(2)),
    hardPass:rr.every(r=>r.hardFailures.length===0)
  };
}
const cross=[];
for(const tc of scenarios){
  const a=rows.find(r=>r.id===tc.id&&r.surface==="INTERNAL_FREE");
  const b=rows.find(r=>r.id===tc.id&&r.surface==="EXTERNAL_PRO");
  if(Math.abs(a.score-b.score)>=3) cross.push({id:tc.id,type:"score_divergence",internal:a.score,external:b.score});
  if((a.hardFailures.length===0)!==(b.hardFailures.length===0)) cross.push({id:tc.id,type:"hard_asymmetry",internal:a.hardFailures,external:b.hardFailures});
}

const report={generatedAt:new Date().toISOString(),productionBase:BASE,method:"dual-bot-v4-focused-paced",scenarioCount:scenarios.length,bySurface,cross,totalHardFailures:rows.reduce((n,r)=>n+r.hardFailures.length,0),rows};
fs.writeFileSync("/tmp/dual-bot-v3.json",JSON.stringify(report,null,2));

const md=[
  "# AI Advokat Dual-Bot v4 Focused Production Audit",
  "",
  `Generated: ${report.generatedAt}`,
  `Internal FREE: ${bySurface.INTERNAL_FREE.averageScore}/10 · hard=${bySurface.INTERNAL_FREE.hardFailures} · quality=${bySurface.INTERNAL_FREE.qualityFindings}`,
  `External Professional: ${bySurface.EXTERNAL_PRO.averageScore}/10 · hard=${bySurface.EXTERNAL_PRO.hardFailures} · quality=${bySurface.EXTERNAL_PRO.qualityFindings}`,
  "",
  "| Test | Scenario | Surface | HTTP | Provider | Score | Hard | Quality |",
  "|---|---|---|---:|---|---:|---|---|",
  ...rows.map(r=>`| ${r.id} | ${r.label} | ${r.surface} | ${r.status} | ${r.provider||""} | ${r.score}/10 | ${r.hardFailures.join(", ")||"PASS"} | ${r.qualityFindings.join(", ")||"PASS"} |`),
  "",
  "## Cross-surface",
  cross.length?cross.map(x=>"- "+JSON.stringify(x)).join("\n"):"- No material divergence"
].join("\n");
fs.writeFileSync("/tmp/dual-bot-v3.md",md+"\n");
console.log(md);

if(report.totalHardFailures>0) process.exitCode=1;
