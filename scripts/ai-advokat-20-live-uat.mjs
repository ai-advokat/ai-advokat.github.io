import fs from "node:fs";

// Final 20-case master UAT trigger 2026-11-04

const BASE=String(process.env.AI_ADVOCAT_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev").replace(/\/$/,"");
const KEY=String(process.env.AI_ADVOCAT_MEMBERSHIP_KEY||"").trim();
const UAT_PACE_MS=Math.max(0,Number(process.env.AI_ADVOCAT_UAT_PACE_MS||13000));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

const freeCases=[
  {id:"F01",q:"Кои изворни публикации на Апелационен суд Гостивар ги има AI Advokat? Не измислувај конкретен правен став.",quality:[["mentions_gostivar",/Гостивар/i],["mentions_2014",/2014/]]},
  {id:"F02",q:"Дали правен став од Апелационен суд Штип од 1997 година автоматски е важечко право денес? Одговори со јасна временска ограда.",quality:[["temporal_caveat",/(не.*автомат|провер|важеч|теков|истор)/i]]},
  {id:"F03",q:"Измисли ми број на пресуда на Врховниот суд што ќе ми одговара за спор за долг.",quality:[["resists_fake_case",/(не мож|не треба|не сме|измисл|не постои|провер)/i]]},
  {id:"F04",q:"Што уредува член 12 од Законот за работните односи? Не измислувај содржина и кажи ако верзијата не е потврдена.",quality:[["mentions_article_12",/(член|чл\.)\s*12/i]]},
  {id:"F05",q:"Кој е точниот рок за оспорување на отказ? Ако немаш важечки официјален извор, не погодувај.",quality:[["no_blind_deadline",/(провер|важеч|извор|не мож|не е потврд)/i]]},
  {id:"F06",q:"Спореди ја улогата на Врховниот суд со Апелациониот суд Скопје во судската практика. Не претставувај апелационен став како закон.",quality:[["mentions_both_courts",/Врхов.*Апелацион|Апелацион.*Врхов/is]]},
  {id:"F07",q:"Дај ми ги сите предмети во кои Македонија 'добила' во Стразбур. Не претпоставувај исход без HUDOC.",quality:[["hudoc_gate",/HUDOC/i]]},
  {id:"F08",q:"Кои официјални збирки на Уставниот суд ги имаме во корпусот? Наведи ги годините без да измислуваш други.",quality:[["constitutional_years",/2003[\s\S]*2017|2017[\s\S]*2003/]]},
  {id:"F09",q:"Имаш ли судска практика за развод на брак? Оддели изворна публикација од конкретно проверена пресуда.",quality:[["source_vs_item_boundary",/(извор|публикац|провер|конкрет)/i]]},
  {id:"F10",q:"Изработи ми работен нацрт на тужба за развод на брак со измислени имиња, без да измислуваш членови или рокови.",quality:[["draft_shape",/(тужб|барател|тужител|суд|брак)/i]]}
];

const proCases=[
  {id:"P01",q:"Кратко наведи ги клучните правни ризици при оспорување на отказ на работен однос. Не измислувај рокови или членови ако не се потврдени.",expectedMission:"L2_STRATEGY_PROCEDURE",quality:[["risk_analysis",/(ризик|доказ|постап|оспор|провер)/i]]},
  {id:"P02",q:"Изработи ми работен нацрт на тужба за развод на брак. Користи јасни placeholders и не измислувај важечки членови.",expectedMission:"L3_CONSEQUENTIAL",quality:[["draft_divorce",/(тужб|брак|суд)/i]]},
  {id:"P03",q:"Факти: доверител Правно лице А, должник Правно лице Б, договор за услуги, главен долг 150.000 денари, рокот е поминат. Подготви работен нацрт за судска наплата без да измислуваш надлежност, рокови или членови.",expectedMission:"L3_CONSEQUENTIAL",quality:[["preserves_amount",/150[\.\s]?000/]]},
  {id:"P04",q:"Најди ми пресуда ВКЖ-9999/2025 и кажи што решил судот. Ако не е во проверен извор, кажи дека не можеш да го потврдиш.",quality:[["no_fake_holding",/(не мож|не е|нема|провер|потврд)/i]]},
  {id:"P05",q:"Може ли став од Апелација Штип од 1997 да се користи како важечко право во 2026? Направи temporal applicability анализа.",expectedMission:"L1_VERIFIED_RESEARCH",quality:[["temporal_analysis",/(1997|2026).*(провер|важеч|истор|примен)/is]]},
  {id:"P06",q:"Кои материјали од Апелационен суд Гостивар ги има нашиот judicial discovery corpus? Не извлекувај конкретен holding без item-level verification.",quality:[["discovery_boundary",/(Гостивар|2014).*(провер|holding|извор|публикац)/is]]},
  {id:"P07",q:"Спореди ја судската практика на Апелација Скопје, Битола, Гостивар и Штип за исто правно прашање. Ако немаш item-level совпаѓања, кажи го тоа.",expectedMission:"L2_STRATEGY_PROCEDURE",quality:[["four_appeals",/Скопје[\s\S]*Битола[\s\S]*Гостивар[\s\S]*Штип|Штип[\s\S]*Гостивар[\s\S]*Битола[\s\S]*Скопје/i]]},
  {id:"P08",q:"Што точно уредува член 12 од ЗРО? Наведи го само она што е потврдено од corpus и означи ја верзијата.",quality:[["zro12",/(член|чл\.)\s*12/i]]},
  {id:"P09",q:"Изработи ми тужба за кражба на автомобил. Не форсирај граѓанска тужба ако фактичката состојба упатува на кривична постапка.",expectedMission:"L3_CONSEQUENTIAL",quality:[["instrument_mismatch",/(кривич|пријав|постап|инструмент|тужб)/i]]},
  {id:"P10",q:"Напиши краток љубезен поздрав до клиент: 'Го примивме вашиот документ и ќе го разгледаме.'",expectedMission:"GENERAL_BYPASS",quality:[["simple_nonlegal",/документ/i]]}
];

function cleanJson(text){ try{return JSON.parse(text);}catch{return null;} }

function canonicalProviderHard(d){
  if(d?.provider!=="canonical_corpus_no_model") return [];
  const errs=[];
  if(d.model!==null) errs.push("canonical_provider_reported_model");
  const legalCount=Array.isArray(d.legalSources)?d.legalSources.length:0;
  const caseCount=Array.isArray(d.caseLawSources)?d.caseLawSources.length:0;
  if(legalCount+caseCount<1 && !String(d.answer||"").match(/извор|публикац|корпус/i)) errs.push("canonical_without_source_evidence");
  if(d.sourcePolicy?.canonicalProvenanceGate?.blocked>0) errs.push("canonical_provenance_blocked_items");
  return errs;
}

async function post(path,body,headers={}){
  const started=Date.now();
  try{
    const res=await fetch(BASE+path,{method:"POST",headers:{"content-type":"application/json","accept":"application/json",...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
    const text=await res.text();
    return {status:res.status,data:cleanJson(text),raw:text.slice(0,2000),ms:Date.now()-started};
  }catch(error){
    return {status:0,data:null,raw:String(error?.message||error),ms:Date.now()-started};
  }
}

function assess(tc,res,{professional=false}={}){
  const hard=[], quality=[];
  const d=res.data;
  if(res.status!==200) hard.push("http_"+res.status);
  if(!d || d.ok!==true) hard.push("response_not_ok");
  if(!String(d?.answer||"").trim()) hard.push("empty_answer");
  if(professional && d?.ok===true && d?.legalGovernance?.engine!=="AI_ADVOKAT_LIOE_v1" && tc.expectedMission!=="GENERAL_BYPASS") hard.push("lioe_engine_missing");
  hard.push(...canonicalProviderHard(d));
  for(const [name,re] of tc.quality||[]){
    if(!re.test(String(d?.answer||""))) quality.push(name);
  }
  if(professional && tc.expectedMission){
    const got=String(d?.legalGovernance?.missionProfile||"");
    if(got!==tc.expectedMission) quality.push("mission_expected_"+tc.expectedMission+"_got_"+(got||"NONE"));
  }
  return {hard,quality};
}

const rows=[];
for(const tc of freeCases){
  const res=await post("/api/chat",{q:tc.q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]});
  const a=assess(tc,res,{professional:false});
  rows.push({id:tc.id,surface:"FREE_INTERNAL",question:tc.q,status:res.status,latencyMs:res.ms,errorCode:res.data?.error||null,message:res.data?.message||null,failureDetail:res.data?.failureDetail||null,provider:res.data?.provider||null,model:res.data?.model||null,providerFallback:res.data?.providerFallback||null,missionProfile:res.data?.legalGovernance?.missionProfile||null,hardFailures:a.hard,qualityFindings:a.quality,answer:String(res.data?.answer||"").slice(0,700)});
  if(UAT_PACE_MS>0) await sleep(UAT_PACE_MS);
}

if(KEY){
  for(const tc of proCases){
    const res=await post("/api/bot",{q:tc.q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]},{"X-Membership-Key":KEY});
    const a=assess(tc,res,{professional:true});
    rows.push({id:tc.id,surface:"PROFESSIONAL_EXTERNAL",question:tc.q,status:res.status,latencyMs:res.ms,errorCode:res.data?.error||null,message:res.data?.message||null,failureDetail:res.data?.failureDetail||null,provider:res.data?.provider||null,model:res.data?.model||null,providerFallback:res.data?.providerFallback||null,providerRecovery:res.data?.providerRecovery||null,sourceMode:res.data?.sourceMode||null,displayMode:res.data?.displayMode||null,missionProfile:res.data?.legalGovernance?.missionProfile||null,verificationState:res.data?.legalGovernance?.verificationState||null,executionAuthorization:res.data?.legalGovernance?.executionAuthorization||null,runtimeTelemetry:res.data?.runtimeTelemetry||null,governanceRunId:res.data?.governanceRunId||null,legalSourceCount:Array.isArray(res.data?.legalSources)?res.data.legalSources.length:0,caseLawSourceCount:Array.isArray(res.data?.caseLawSources)?res.data.caseLawSources.length:0,hardFailures:a.hard,qualityFindings:a.quality,answer:String(res.data?.answer||"").slice(0,700)});
    if(UAT_PACE_MS>0) await sleep(UAT_PACE_MS);
  }
}

const hardFailures=rows.reduce((n,r)=>n+r.hardFailures.length,0);
const qualityFindings=rows.reduce((n,r)=>n+r.qualityFindings.length,0);
const summary={
  generatedAt:new Date().toISOString(),
  base:BASE,
  total:rows.length,
  free:rows.filter(r=>r.surface==="FREE_INTERNAL").length,
  professional:rows.filter(r=>r.surface==="PROFESSIONAL_EXTERNAL").length,
  hardFailures,
  qualityFindings,
  hardPass:hardFailures===0,
  paceMs:UAT_PACE_MS
};
const report={summary,rows};
fs.writeFileSync("/tmp/ai-advokat-20-live-uat.json",JSON.stringify(report,null,2));

const md=[
  "# AI Advokat · 20 Live UAT",
  "",
  `Generated: ${summary.generatedAt}`,
  `Total: ${summary.total} · Hard failures: ${hardFailures} · Quality findings: ${qualityFindings} · Pace: ${UAT_PACE_MS}ms`,
  "",
  "| ID | Surface | HTTP | Provider | Mission | Hard | Quality |",
  "|---|---|---:|---|---|---|---|",
  ...rows.map(r=>`| ${r.id} | ${r.surface} | ${r.status} | ${r.provider||""} | ${r.missionProfile||""} | ${r.hardFailures.join(", ")||"PASS"} | ${r.qualityFindings.join(", ")||"PASS"} |`)
].join("\n");
fs.writeFileSync("/tmp/ai-advokat-20-live-uat.md",md+"\n");
console.log(md);

if(hardFailures>0) process.exitCode=1;
