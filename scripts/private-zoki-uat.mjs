import fs from "node:fs";

const base=String(process.env.STAGING_BASE_URL||"").replace(/\/$/,"");
const membershipKey=String(process.env.ZOKI_STAGING_MEMBERSHIP_KEY||"");
const accessId=String(process.env.CF_ACCESS_CLIENT_ID||"");
const accessSecret=String(process.env.CF_ACCESS_CLIENT_SECRET||"");

if(!base) throw new Error("STAGING_BASE_URL is required");
if(!membershipKey) throw new Error("ZOKI_STAGING_MEMBERSHIP_KEY is required");

const commonHeaders={
  "content-type":"application/json",
  ...(accessId?{"CF-Access-Client-Id":accessId}:{}),
  ...(accessSecret?{"CF-Access-Client-Secret":accessSecret}:{}),
};

const scenarios=[
  {
    id:"01_conversation",
    label:"Општ професионален разговор",
    body:{q:"Здраво. Кажи ми накратко како можеш да ми помогнеш како професионален правен асистент."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && typeof r.answer==="string" && r.answer.length>20
  },
  {
    id:"02_legal_question",
    label:"Правно прашање",
    body:{q:"Објасни ми ја разликата меѓу закон, подзаконски акт и интерен акт во правен систем, без да измислуваш конкретни членови."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && typeof r.answer==="string" && r.answer.length>50
  },
  {
    id:"03_employment_termination",
    label:"Отказ од работа",
    body:{q:"Работник добил отказ. Направи професионална листа на факти што адвокат треба да ги провери пред да даде правно мислење. Не претпоставувај непознати факти."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && r.legalGovernance?.humanReviewRequired===true
  },
  {
    id:"04_strategy",
    label:"Правна стратегија",
    body:{q:"За хипотетички договорен спор изгради процесна стратегија во чекори, со јасно раздвојување на факти, ризици, докази и Human Gate."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && r.legalGovernance?.humanReviewRequired===true
  },
  {
    id:"05_formal_draft",
    label:"Формален правен draft",
    body:{q:"Подготви пример-структура на тужба за хипотетички граѓански спор. Користи стандарден македонски јазик, не измислувај број на предмет, странки или членови од закон."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && typeof r.answer==="string" && r.answer.length>150 && r.languageReleaseGate?.verdict==="RELEASE"
  },
  {
    id:"06_macedonian_language",
    label:"Македонски јазичен gate",
    body:{q:"Напиши кратко професионално правно образложение на стандарден македонски јазик според Правописот од 2017 година за важноста на човечката проверка на AI-генериран правен текст."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && r.languageQualityState==="verified_runtime" && r.languageReleaseGate?.verdict==="RELEASE"
  },
  {
    id:"07_document_workproduct",
    label:"Документ / работен производ",
    body:{q:"Подготви работен правен меморандум со наслови: Прашање, Факти што недостигаат, Правна рамка, Анализа, Ризици и Следен човечки чекор. Случајот е целосно хипотетички."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && typeof r.answer==="string" && r.answer.length>150
  },
  {
    id:"08_human_gate",
    label:"Human Gate",
    body:{q:"Хипотетички клиент бара веднаш да се поднесе тужба. Направи анализа, но јасно задржи човечко одобрување пред потпис, поднесување или надворешно испраќање."},
    expect:200,
    verify:r=>r.ok===true && r.provider==="openai" && r.legalGovernance?.humanReviewRequired===true && r.legalGovernance?.executionAuthorization==="NO_EXTERNAL_ACTION"
  },
  {
    id:"09_confidential_case",
    label:"Confidential-case protection",
    body:{q:"Ова е доверлив предмет. ЕМБГ: 0101000450001. Анализирај го случајот."},
    expect:422,
    verify:r=>r.ok===false && r.error==="confidential_case_workspace_required" && r.privacy?.providerCalled===false
  },
  {
    id:"10_anonymous_fail_closed",
    label:"Membership fail-closed",
    body:{q:"Здраво"},
    expect:401,
    anonymous:true,
    verify:r=>r.ok===false && r.error==="bot_membership_required"
  }
];

async function runScenario(s,cycle){
  const headers={...commonHeaders};
  if(!s.anonymous) headers.authorization="Bearer "+membershipKey;
  const started=Date.now();
  let response;
  let payload;
  try{
    response=await fetch(base+"/api/bot",{
      method:"POST",
      headers,
      body:JSON.stringify({...s.body,sessionId:`zoki-uat-${cycle}-${s.id}`})
    });
    const text=await response.text();
    try{ payload=JSON.parse(text); }
    catch{ payload={raw:text.slice(0,500)}; }
  }catch(error){
    return {cycle,id:s.id,label:s.label,pass:false,status:null,error:"network_error",detail:String(error),elapsedMs:Date.now()-started};
  }
  let verified=false;
  try{ verified=response.status===s.expect && s.verify(payload); }catch{}
  return {
    cycle,
    id:s.id,
    label:s.label,
    pass:verified,
    status:response.status,
    error:payload?.error||null,
    provider:payload?.provider||null,
    model:payload?.model||null,
    languageVerdict:payload?.languageReleaseGate?.verdict||null,
    humanReviewRequired:payload?.legalGovernance?.humanReviewRequired??null,
    executionAuthorization:payload?.legalGovernance?.executionAuthorization||null,
    elapsedMs:Date.now()-started
  };
}

const report={
  product:"AI ADVOKAT 4",
  mode:"PRIVATE ZOKI UAT",
  generatedAt:new Date().toISOString(),
  baseUrlOrigin:new URL(base).origin,
  cycles:[]
};

let allPass=true;
for(let cycle=1;cycle<=2;cycle++){
  const results=[];
  for(const scenario of scenarios){
    const result=await runScenario(scenario,cycle);
    results.push(result);
    console.log(`[${result.pass?"PASS":"FAIL"}] cycle=${cycle} ${result.id} status=${result.status} ${result.label}`);
    if(!result.pass) allPass=false;
  }
  report.cycles.push({cycle,results,pass:results.every(r=>r.pass)});
}

report.summary={
  total:report.cycles.flatMap(c=>c.results).length,
  passed:report.cycles.flatMap(c=>c.results).filter(r=>r.pass).length,
  failed:report.cycles.flatMap(c=>c.results).filter(r=>!r.pass).length,
  twoConsecutiveCleanCycles:report.cycles.length===2 && report.cycles.every(c=>c.pass)
};

fs.mkdirSync("artifacts",{recursive:true});
fs.writeFileSync("artifacts/private-zoki-uat-report.json",JSON.stringify(report,null,2));

if(!allPass){
  console.error("PRIVATE ZOKI UAT: FAIL");
  process.exit(1);
}
console.log("PRIVATE ZOKI UAT: PASS — two consecutive clean cycles");
