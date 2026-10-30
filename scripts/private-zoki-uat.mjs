import fs from "node:fs";

const base=String(process.env.STAGING_BASE_URL||"").replace(/\/$/,"");
const membershipKey=String(process.env.ZOKI_STAGING_MEMBERSHIP_KEY||"");
const accessId=String(process.env.CF_ACCESS_CLIENT_ID||"");
const accessSecret=String(process.env.CF_ACCESS_CLIENT_SECRET||"");
const requestTimeoutMs=Math.max(10000,Math.min(90000,Number(process.env.UAT_REQUEST_TIMEOUT_MS||60000)));

if(!base) throw new Error("STAGING_BASE_URL is required");
if(!membershipKey) throw new Error("ZOKI_STAGING_MEMBERSHIP_KEY is required");

const parsedBase=new URL(base);
if(parsedBase.protocol!=="https:") throw new Error("STAGING_BASE_URL must use https");
if(parsedBase.hostname==="ai-advokat-github-io.aiadvokat16.workers.dev") throw new Error("Production origin is forbidden");

const commonHeaders={
  "content-type":"application/json",
  ...(accessId?{"CF-Access-Client-Id":accessId}:{}),
  ...(accessSecret?{"CF-Access-Client-Secret":accessSecret}:{}),
};

async function fetchJson(url,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new Error("uat_request_timeout")),requestTimeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal});
    const text=await response.text();
    let payload;
    try{ payload=JSON.parse(text); }
    catch{ payload={raw:text.slice(0,500)}; }
    return {response,payload};
  } finally {
    clearTimeout(timer);
  }
}

const identityHeaders={...commonHeaders};
delete identityHeaders["content-type"];
const identityResult=await fetchJson(base+"/api/uat-identity",{method:"GET",headers:identityHeaders});
const identity=identityResult.payload;
if(identityResult.response.status!==200) throw new Error("Dedicated staging identity endpoint is not reachable");
if(identity?.ok!==true) throw new Error("Dedicated staging identity did not return ok");
if(identity?.identity!=="AI_ADVOKAT_4_DEDICATED_STAGING") throw new Error("Unexpected runtime identity");
if(identity?.workerName!=="ai-advokat-staging") throw new Error("Unexpected Worker identity");
if(identity?.databaseName!=="ai-advokat-staging-db") throw new Error("Unexpected staging database identity");
if(identity?.productionAuthorized!==false || identity?.uatOnly!==true) throw new Error("Runtime is not marked staging UAT only");
if(identity?.database?.reachable!==true || identity?.database?.schemaReady!==true) throw new Error("Staging D1 is not ready");

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
  try{
    const {response,payload}=await fetchJson(base+"/api/bot",{
      method:"POST",
      headers,
      body:JSON.stringify({...s.body,sessionId:`zoki-uat-${cycle}-${s.id}`})
    });
    let verified=false;
    try{ verified=response.status===s.expect && s.verify(payload); }catch{}
    return {
      cycle,id:s.id,label:s.label,pass:verified,status:response.status,
      error:payload?.error||null,provider:payload?.provider||null,model:payload?.model||null,
      languageVerdict:payload?.languageReleaseGate?.verdict||null,
      humanReviewRequired:payload?.legalGovernance?.humanReviewRequired??null,
      executionAuthorization:payload?.legalGovernance?.executionAuthorization||null,
      elapsedMs:Date.now()-started
    };
  }catch(error){
    const timeout=String(error?.name||"")==="AbortError" || String(error).includes("uat_request_timeout");
    return {
      cycle,id:s.id,label:s.label,pass:false,status:null,
      error:timeout?"request_timeout":"network_error",
      detail:String(error).slice(0,300),
      elapsedMs:Date.now()-started
    };
  }
}

const report={
  product:"AI ADVOKAT 4",
  mode:"PRIVATE ZOKI UAT",
  generatedAt:new Date().toISOString(),
  baseUrlOrigin:parsedBase.origin,
  identity:{
    identity:identity.identity,
    workerName:identity.workerName,
    databaseName:identity.databaseName,
    schemaVersion:identity.database?.schemaVersion??null,
    productionAuthorized:identity.productionAuthorized,
    uatOnly:identity.uatOnly
  },
  requestTimeoutMs,
  cycles:[]
};

fs.mkdirSync("artifacts",{recursive:true});
let allPass=true;
for(let cycle=1;cycle<=2;cycle++){
  const results=[];
  for(const scenario of scenarios){
    const result=await runScenario(scenario,cycle);
    results.push(result);
    console.log(`[${result.pass?"PASS":"FAIL"}] cycle=${cycle} ${result.id} status=${result.status} ${result.label}`);
    if(!result.pass) allPass=false;
    report.cycles=[...report.cycles.filter(c=>c.cycle!==cycle),{cycle,results,pass:results.every(r=>r.pass)}].sort((a,b)=>a.cycle-b.cycle);
    fs.writeFileSync("artifacts/private-zoki-uat-report.json",JSON.stringify(report,null,2));
  }
}

report.summary={
  total:report.cycles.flatMap(c=>c.results).length,
  passed:report.cycles.flatMap(c=>c.results).filter(r=>r.pass).length,
  failed:report.cycles.flatMap(c=>c.results).filter(r=>!r.pass).length,
  twoConsecutiveCleanCycles:report.cycles.length===2 && report.cycles.every(c=>c.pass)
};
fs.writeFileSync("artifacts/private-zoki-uat-report.json",JSON.stringify(report,null,2));

if(!allPass){
  console.error("PRIVATE ZOKI UAT: FAIL");
  process.exit(1);
}
console.log("PRIVATE ZOKI UAT: PASS — two consecutive clean cycles");
