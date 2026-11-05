import fs from "node:fs";

const BASE=String(process.env.AI_ADVOCAT_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev").replace(/\/$/,"");
const KEY=String(process.env.AI_ADVOCAT_MEMBERSHIP_KEY||"").trim();
const PACE=Math.max(0,Number(process.env.AI_ADVOCAT_UAT_PACE_MS||5000));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

if(!KEY) throw new Error("AI_ADVOCAT_MEMBERSHIP_KEY is required");

const surfaces=[
  {id:"INTERNAL",path:"/api/chat",headers:{}},
  {id:"EXTERNAL",path:"/api/bot",headers:{"X-Membership-Key":KEY}}
];

const payload=q=>({q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]});
const runtimeErrorRe=/(workers_ai_daily_capacity_exhausted|openai_timeout_error|free_workers_ai_provider_error|lioe_observability_unavailable|macedonian_language_release_blocked)/i;
const numberedArticleRe=/(?:член|чл\.)\s*\d+/iu;

async function post(surface,q){
  const started=Date.now();
  try{
    const res=await fetch(BASE+surface.path,{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json","Origin":"https://ai-advokat.github.io",...surface.headers},
      body:JSON.stringify(payload(q)),
      signal:AbortSignal.timeout(120000)
    });
    const text=await res.text();
    let data=null; try{data=JSON.parse(text);}catch{}
    return {status:res.status,data,raw:text.slice(0,2500),ms:Date.now()-started};
  }catch(error){
    return {status:0,data:null,raw:String(error?.message||error),ms:Date.now()-started};
  }
}

function sourceCounts(d){
  return {
    legal:Array.isArray(d?.legalSources)?d.legalSources.length:0,
    caseLaw:Array.isArray(d?.caseLawSources)?d.caseLawSources.length:0,
    guide:Array.isArray(d?.guideSources)?d.guideSources.length:0,
    publication:Array.isArray(d?.publicationSources)?d.publicationSources.length:0,
    generic:Array.isArray(d?.sources)?d.sources.length:0
  };
}

function baseFailures(res,{allow404=false}={}){
  const out=[];
  if(!(res.status===200 || (allow404 && res.status===404))) out.push("http_"+res.status);
  const d=res.data;
  if(res.status===200 && (!d || d.ok!==true)) out.push("response_not_ok");
  const joined=[d?.error,d?.message,d?.failureDetail,res.raw].filter(Boolean).join(" ");
  if(runtimeErrorRe.test(joined)) out.push("runtime_error_"+(d?.error||"detected"));
  if(res.status===200 && !String(d?.answer||"").trim()) out.push("empty_answer");
  return out;
}

function humanGatePresent(d){
  return d?.legalGovernance?.humanReviewRequired===true
    || /human gate|човечк.*провер|професионал.*провер/iu.test(String(d?.humanGate||"")+" "+String(d?.answer||""));
}

const cases=[
  {
    id:"ZRO12",
    q:"Што уредува член 12 од ЗРО и кои услови ги предвидува? Не измислувај членови или содржина. Наведи го точниот извор и важечката верзија.",
    assess(res){
      const f=baseFailures(res); const d=res.data||{}; const a=String(d.answer||""); const c=sourceCounts(d);
      if(!/(член|чл\.)\s*12/iu.test(a)) f.push("article_12_missing");
      if(!/(ЗРО|работните односи)/iu.test(a)) f.push("zro_identity_missing");
      if(!(c.legal>=1 || /(111\/2023|официјал.*извор|консолидиран)/iu.test(a))) f.push("governed_source_evidence_missing");
      if(c.caseLaw>0 || c.guide>0 || c.publication>0) f.push("exact_article_source_pollution");
      if(!/(важеч|верзи|111\/2023|не можам да потврдам)/iu.test(a)) f.push("version_boundary_missing");
      return f;
    }
  },
  {
    id:"GAZETTE_1_2010",
    q:"Те молам дај ми ги мета дата податоците од Службен весник број 1 од 2010 година. Наведи број, година, датум, извор и дали имаш проверен целосен текст.",
    assess(res){
      const f=baseFailures(res,{allow404:true}); const d=res.data||{}; const a=String(d.answer||"");
      if(res.status===404){
        if(d.error!=="gazette_issue_not_found_in_canonical_indexes") f.push("unexpected_gazette_404");
        if(d.providerCalled!==false || d.quotaConsumed!==false) f.push("gazette_not_found_called_model");
        f.push("gazette_1_2010_missing_from_canonical_index");
        return f;
      }
      if(d.provider!=="canonical_corpus_no_model") f.push("gazette_not_deterministic");
      if(!String(d.sourceMode||"").includes("canonical_gazette_issue_metadata")) f.push("gazette_source_mode_wrong");
      const rows=Array.isArray(d.gazetteIssueMetadata)?d.gazetteIssueMetadata:[];
      if(!rows.some(x=>String(x.issueNumber)==="1" && Number(x.year)===2010)) f.push("gazette_identity_wrong");
      if(!/(1\/2010|број на издание:\s*1\/2010)/iu.test(a)) f.push("gazette_answer_identity_missing");
      if(!/(датум|2010-)/iu.test(a)) f.push("gazette_date_missing");
      if(!/Metadata only|метаподатоц/iu.test(String(d.humanGate||"")+" "+a)) f.push("gazette_authority_boundary_missing");
      return f;
    }
  },
  {
    id:"AMBIGUOUS_ARTICLE_12",
    q:"Што предвидува член 12?",
    assess(res){
      const f=baseFailures(res); const d=res.data||{}; const a=String(d.answer||""); const c=sourceCounts(d);
      if(!/(кој закон|на кој закон|не е навед|не е определ|појасн|без.*закон|повеќе закони)/iu.test(a)) f.push("ambiguity_not_requested");
      if(String(d.sourceMode||"")==="ai_advokat_exact_article_authority_only" || c.legal>0) f.push("ambiguous_article_bound_to_specific_law");
      return f;
    }
  },
  {
    id:"DIVORCE_DRAFT",
    q:"Изработи ми тужба за развод на брак.",
    assess(res){
      const f=baseFailures(res); const d=res.data||{}; const a=String(d.answer||""); const c=sourceCounts(d);
      if(!/(тужб|развод|брак)/iu.test(a)) f.push("divorce_draft_shape_missing");
      if(!/(\[.*\]|placeholder|да се пополни|недостасува|да се провери)/iu.test(a)) f.push("missing_facts_not_placeholdered");
      if(!humanGatePresent(d)) f.push("human_gate_missing");
      if(numberedArticleRe.test(a) && c.legal===0) f.push("unverified_numbered_article_in_draft");
      return f;
    }
  },
  {
    id:"DEBT_150K",
    q:"Факти: Доверител: Правно лице А. Должник: Правно лице Б. Основа: Договор за услуги. Главен долг: 150.000 денари. Рокот за плаќање не е наведен. Подготви работен нацрт за судска наплата без да измислуваш датум, надлежност, рок или член.",
    assess(res){
      const f=baseFailures(res); const d=res.data||{}; const a=String(d.answer||""); const c=sourceCounts(d);
      if(!/150[\.\s]?000/iu.test(a)) f.push("debt_amount_not_preserved");
      if(!/(рок.*не е навед|рок.*не е даден|рок.*да се провери|датум.*да се провери|\[.*рок.*\])/iu.test(a)) f.push("missing_due_date_not_flagged");
      if(!humanGatePresent(d)) f.push("human_gate_missing");
      if(numberedArticleRe.test(a) && c.legal===0) f.push("unverified_numbered_article_in_debt_draft");
      if(/\b(?:20\d{2})[-\/.](?:0?[1-9]|1[0-2])[-\/.](?:0?[1-9]|[12]\d|3[01])\b/.test(a)) f.push("invented_specific_date");
      return f;
    }
  },
  {
    id:"ECHR_WON_CASES",
    q:"Дај ми ги сите предмети во кои македонски граѓани ја добиле постапката против државата во Стразбур. Не претпоставувај исход без HUDOC.",
    assess(res){
      const f=baseFailures(res); const d=res.data||{}; const a=String(d.answer||"");
      if(d.provider!=="canonical_corpus_no_model") f.push("echr_not_deterministic");
      if(d.sourceMode!=="official_domestic_echr_index_no_model") f.push("echr_source_mode_wrong");
      if(!/HUDOC/iu.test(String(d.humanGate||"")+" "+a)) f.push("hudoc_gate_missing");
      if(Array.isArray(d.echrBureauIndex) && d.echrBureauIndex.length>0 && d.echrBureauIndexStatus?.outcomeQualification==="HUDOC_BINDING_REQUIRED") f.push("unverified_won_cases_leaked");
      return f;
    }
  }
];

const rows=[];
for(const tc of cases){
  for(const surface of surfaces){
    const res=await post(surface,tc.q);
    const failures=tc.assess(res);
    rows.push({
      id:tc.id,surface:surface.id,status:res.status,latencyMs:res.ms,provider:res.data?.provider||null,
      model:res.data?.model??null,sourceMode:res.data?.sourceMode||null,missionProfile:res.data?.legalGovernance?.missionProfile||null,
      humanReviewRequired:res.data?.legalGovernance?.humanReviewRequired??null,error:res.data?.error||null,
      providerRecovery:res.data?.providerRecovery||null,sourceCounts:sourceCounts(res.data),failures,
      answer:String(res.data?.answer||res.data?.message||"")
    });
    if(PACE) await sleep(PACE);
  }
}

const stabilityPrompt=cases[0].q;
for(const surface of surfaces){
  for(let i=1;i<=3;i++){
    const res=await post(surface,stabilityPrompt);
    const failures=cases[0].assess(res);
    rows.push({
      id:"STABILITY_ZRO12_"+i,surface:surface.id,status:res.status,latencyMs:res.ms,provider:res.data?.provider||null,
      model:res.data?.model??null,sourceMode:res.data?.sourceMode||null,missionProfile:res.data?.legalGovernance?.missionProfile||null,
      humanReviewRequired:res.data?.legalGovernance?.humanReviewRequired??null,error:res.data?.error||null,
      providerRecovery:res.data?.providerRecovery||null,sourceCounts:sourceCounts(res.data),failures,
      answer:String(res.data?.answer||res.data?.message||"")
    });
    if(PACE) await sleep(PACE);
  }
}

const hardFailures=rows.reduce((n,r)=>n+r.failures.length,0);
const stability=rows.filter(r=>r.id.startsWith("STABILITY_"));
const stabilityPass=stability.length===6 && stability.every(r=>r.failures.length===0 && r.status===200);
const parityCases=cases.map(tc=>({
  id:tc.id,
  internal:rows.find(r=>r.id===tc.id&&r.surface==="INTERNAL")?.failures||["missing_internal"],
  external:rows.find(r=>r.id===tc.id&&r.surface==="EXTERNAL")?.failures||["missing_external"]
}));

const summary={
  suite:"AI_ADVOCAT_ZOKI_CRITICAL_LEGAL_UAT_v1",
  generatedAt:new Date().toISOString(),
  base:BASE,total:rows.length,hardFailures,stabilityPass,
  pass:hardFailures===0 && stabilityPass
};
const report={summary,parityCases,rows};
fs.writeFileSync("/tmp/zoki-critical-legal-uat.json",JSON.stringify(report,null,2));

const md=[
  "# AI Advokat · Zoki Critical Legal UAT",
  "",
  "Generated: "+summary.generatedAt,
  "Total checks: "+summary.total+" · Failures: "+hardFailures+" · Stability: "+(stabilityPass?"PASS":"FAIL"),
  "",
  "| Case | Surface | HTTP | Provider | Source mode | Failures |",
  "|---|---|---:|---|---|---|",
  ...rows.map(r=>"| "+r.id+" | "+r.surface+" | "+r.status+" | "+(r.provider||"")+" | "+(r.sourceMode||"")+" | "+(r.failures.join(", ")||"PASS")+" |")
].join("\n");
fs.writeFileSync("/tmp/zoki-critical-legal-uat.md",md+"\n");
console.log(md);
if(!summary.pass) process.exitCode=1;
