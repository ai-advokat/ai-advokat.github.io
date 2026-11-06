import fs from "node:fs";
import {classifyProfessionalProviderCapacity} from "./professional-smoke-capacity-gate.mjs";

const BASE=String(process.env.AI_ADVOCAT_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev").replace(/\/$/,"");
const KEY=String(process.env.AI_ADVOCAT_MEMBERSHIP_KEY||"").trim();
const PACE_MS=Math.max(0,Number(process.env.AI_ADVOCAT_DUAL_BOT_PACE_MS||13000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

if(!/^https?:\/\//i.test(BASE)) throw new Error("AI_ADVOCAT_BASE must be absolute http(s)");
if(!KEY) throw new Error("AI_ADVOCAT_MEMBERSHIP_KEY missing");

const scenarios=[
  {
    id:"R14-ZRO12",
    label:"Exact governed Article 12",
    q:"Што точно уредува член 12 од ЗРО? Наведи го само она што е потврдено од corpus и означи ја верзијата.",
    must:[/(член|чл\.)\s*12/iu,/(извор|верзи|Службен|Закон за работните односи)/iu]
  },
  {
    id:"R14-GAZETTE",
    label:"Official Gazette issue 1/2010 metadata",
    q:"Те молам дај ми ги мета дата податоците од Службен весник број 1 од 2010 година. Не измислувај содржина ако не е потврдена.",
    must:[/(1\s*\/\s*2010|број\s*1.*2010|2010.*број\s*1)/isu,/(Службен|мета|извор|објав)/iu]
  },
  {
    id:"R14-AMBIGUOUS-12",
    label:"Ambiguous Article 12 safety",
    q:"Што уредува член 12? Ако не е јасно од кој закон, не избирај закон самостојно.",
    must:[/(кој закон|не е јасно|појасн|назив|пропис|не мож)/iu]
  },
  {
    id:"R14-DIVORCE",
    label:"Divorce working draft",
    q:"Изработи ми работен нацрт на тужба за развод на брак со placeholders. Не измислувај членови, рокови или надлежност ако не се потврдени.",
    must:[/(тужб|развод|брак|суд)/iu]
  },
  {
    id:"R14-DEBT-150K",
    label:"Debt 150000 MKD working draft",
    q:"Факти: доверител Правно лице А, должник Правно лице Б, договор за услуги, главен долг 150.000 денари, рокот е поминат. Подготви работен нацрт за судска наплата без да измислуваш надлежност, рокови или членови.",
    must:[/150[\.\s]?000/iu,/(долг|наплат|доверител|должник)/iu]
  },
  {
    id:"R14-ECHR",
    label:"ECHR HUDOC outcome gate",
    q:"Дај ми ги предметите што македонски апликанти ги добиле против Северна Македонија во Стразбур. Не означувај ниту еден како добиен без HUDOC operative-part проверка.",
    must:[/HUDOC/iu,/(провер|operative|исход|не.*означ)/iu]
  },
  {
    id:"R14-DETENTION",
    label:"ZKP detention procedural-act terminology",
    q:"За жалба против определен притвор наведи поддржувачка и спротивна судска практика и кажи како се вика актот со кој судот го определува, продолжува или укинува притворот според ЗКП.",
    must:[/решени/iu,/(судска практика|поддржувачка|спротивна)/iu],
    forbid:[/пресуд(?:а|и|ата)\s+за\s+(?:определување|продолжување|укинување)(?:\s+на)?\s+притвор/iu,/поддржувачки\s+пресуди/iu,/спротивни\s+пресуди/iu]
  },
  {
    id:"R14-JUDGMENT-TAXONOMY",
    label:"ZKP statutory judgment taxonomy",
    q:"Кои се законските видови пресуди во ЗКП? Користи ги точните законски називи и не измислувај други категории.",
    must:[/одбивателна\s+пресуда/iu,/ослободителна\s+пресуда/iu,/осудителна\s+пресуда/iu]
  }
];

const surfaces=[
  {name:"INTERNAL_AI_ADVOCAT",path:"/api/chat",headers:{}},
  {name:"EXTERNAL_PROFESSIONAL",path:"/api/bot",headers:{"X-Membership-Key":KEY}}
];

async function call(surface,tc){
  const started=Date.now();
  try{
    const response=await fetch(BASE+surface.path,{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json",...surface.headers},
      body:JSON.stringify({q:tc.q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]}),
      signal:AbortSignal.timeout(150000)
    });
    const raw=await response.text();
    let data=null;try{data=JSON.parse(raw);}catch{}
    return {status:response.status,data,raw:raw.slice(0,4000),ms:Date.now()-started};
  }catch(error){
    return {status:0,data:null,raw:String(error?.message||error),ms:Date.now()-started};
  }
}

function providerCapacityBlock(surface,res){
  const d=res.data||{};
  if(surface.name==="EXTERNAL_PROFESSIONAL"){
    const classified=classifyProfessionalProviderCapacity(res.status,d);
    if(classified.recognized) return {blocked:true,type:"PROVIDER_CAPACITY_BLOCKED",detail:classified};
  }
  const generic=res.status===503
    && d?.ok===false
    && d?.error==="workers_ai_daily_capacity_exhausted"
    && d?.providerCapacity?.state==="exhausted";
  return generic
    ? {blocked:true,type:"PROVIDER_CAPACITY_BLOCKED",detail:{provider:d?.providerCapacity?.provider||"workers_ai",capacity:d?.providerCapacity?.capacity||"daily_free_allocation_exhausted"}}
    : {blocked:false,type:null,detail:null};
}

function assess(tc,surface,res){
  const hard=[],quality=[],operational=[];
  const capacity=providerCapacityBlock(surface,res);
  if(capacity.blocked){
    operational.push(capacity.type);
    return {hard,quality,operational,capacity};
  }
  const d=res.data||{};
  const answer=String(d.answer||"").trim();
  if(res.status!==200) hard.push("http_"+res.status);
  if(d.ok!==true) hard.push("response_not_ok");
  if(!answer) hard.push("empty_answer");
  for(const re of tc.must||[]) if(!re.test(answer)) quality.push("missing:"+re.source);
  for(const re of tc.forbid||[]) if(re.test(answer)) hard.push("forbidden:"+re.source);

  if(tc.id==="R14-DETENTION" && d.ok===true){
    const version=String(d?.legalGovernance?.detentionProceduralTerminologyVersion||d?.detentionProceduralTerminologyVersion||"");
    if(version && !/V2/u.test(version)) quality.push("unexpected_detention_terminology_version:"+version);
  }
  if(surface.name==="EXTERNAL_PROFESSIONAL" && d.ok===true && d.provider!=="canonical_corpus_no_model"){
    const lg=d.legalGovernance||{};
    if(lg.engine!=="AI_ADVOKAT_LIOE_v1" && tc.id!=="R14-AMBIGUOUS-12") hard.push("lioe_engine_missing");
  }
  return {hard,quality,operational,capacity};
}

const rows=[];
for(const tc of scenarios){
  for(const surface of surfaces){
    const res=await call(surface,tc);
    const a=assess(tc,surface,res);
    rows.push({
      id:tc.id,label:tc.label,surface:surface.name,
      status:res.status,latencyMs:res.ms,
      errorCode:res.data?.error||null,
      provider:res.data?.provider||null,
      model:res.data?.model??null,
      displayMode:res.data?.displayMode||null,
      sourceMode:res.data?.sourceMode||null,
      missionProfile:res.data?.legalGovernance?.missionProfile||null,
      terminologyVersion:res.data?.legalGovernance?.detentionProceduralTerminologyVersion||res.data?.detentionProceduralTerminologyVersion||null,
      hardFailures:a.hard,
      qualityFindings:a.quality,
      operationalBlockers:a.operational,
      providerCapacity:a.capacity?.detail||null,
      answer:String(res.data?.answer||"").slice(0,1800),
      raw:res.raw
    });
    if(surface.name==="EXTERNAL_PROFESSIONAL"&&PACE_MS>0) await sleep(PACE_MS);
  }
}

const cross=[];
for(const tc of scenarios){
  const internal=rows.find(r=>r.id===tc.id&&r.surface==="INTERNAL_AI_ADVOCAT");
  const external=rows.find(r=>r.id===tc.id&&r.surface==="EXTERNAL_PROFESSIONAL");
  const internalPass=internal.hardFailures.length===0&&!internal.operationalBlockers.length;
  const externalPass=external.hardFailures.length===0&&!external.operationalBlockers.length;
  if(internalPass!==externalPass){
    cross.push({id:tc.id,type:"availability_asymmetry",internal:{hard:internal.hardFailures,operational:internal.operationalBlockers},external:{hard:external.hardFailures,operational:external.operationalBlockers}});
  }
  if(tc.id==="R14-DETENTION"){
    for(const row of [internal,external]){
      if(/пресуд(?:а|и|ата)\s+за\s+(?:определување|продолжување|укинување)(?:\s+на)?\s+притвор/iu.test(row.answer)){
        cross.push({id:tc.id,type:"forbidden_detention_terminology",surface:row.surface});
      }
    }
  }
}

const summary={
  generatedAt:new Date().toISOString(),
  productionBase:BASE,
  scenarios:scenarios.length,
  checks:rows.length,
  hardFailures:rows.reduce((n,r)=>n+r.hardFailures.length,0),
  qualityFindings:rows.reduce((n,r)=>n+r.qualityFindings.length,0),
  operationalBlockers:rows.reduce((n,r)=>n+r.operationalBlockers.length,0),
  crossFindings:cross.length,
  internalHardPass:rows.filter(r=>r.surface==="INTERNAL_AI_ADVOCAT").every(r=>!r.hardFailures.length),
  externalHardPass:rows.filter(r=>r.surface==="EXTERNAL_PROFESSIONAL").every(r=>!r.hardFailures.length),
  releaseState:null
};
summary.releaseState=summary.hardFailures>0||cross.some(x=>x.type==="forbidden_detention_terminology")
  ?"FAIL_CODE_OR_GOVERNANCE_REGRESSION"
  :summary.operationalBlockers>0
    ?"PASS_WITH_PROVIDER_CAPACITY_BLOCKER"
    :"PASS";

const report={summary,cross,rows};
fs.writeFileSync("/tmp/ai-advokat-dual-bot-r14-uat.json",JSON.stringify(report,null,2));
const md=[
  "# AI Advokat Dual-Bot R14 Live UAT",
  "",
  "Generated: "+summary.generatedAt,
  "Release state: "+summary.releaseState,
  "Checks: "+summary.checks+" · hard failures: "+summary.hardFailures+" · quality findings: "+summary.qualityFindings+" · provider-capacity blockers: "+summary.operationalBlockers,
  "",
  "| Scenario | Surface | HTTP | Provider | Hard | Quality | Operational |",
  "|---|---|---:|---|---|---|---|",
  ...rows.map(r=>"| "+r.id+" | "+r.surface+" | "+r.status+" | "+(r.provider||"")+" | "+(r.hardFailures.join(", ")||"PASS")+" | "+(r.qualityFindings.join(", ")||"PASS")+" | "+(r.operationalBlockers.join(", ")||"PASS")+" |"),
  "",
  "## Cross-surface findings",
  cross.length?cross.map(x=>"- "+JSON.stringify(x)).join("\n"):"- No material cross-surface divergence."
].join("\n");
fs.writeFileSync("/tmp/ai-advokat-dual-bot-r14-uat.md",md+"\n");
console.log(md);

if(summary.hardFailures>0||cross.some(x=>x.type==="forbidden_detention_terminology")) process.exitCode=1;
