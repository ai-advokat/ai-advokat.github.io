// Evidence-first R25 live conversation probe; synthetic public prompts only.
// Absolute cap: 20 sequential FREE requests, no retries, no paid fallback.
// Proactive is a UI-generated follow-up over /api/chat, NOT a third model API.
import fs from "node:fs";
import crypto from "node:crypto";
import {suggestLegalNextTurns} from "../assets/ai-advokat-proactive.mjs";
const preview="https://feat-zoki-bot-formats-translator-r24-20261-ai-advokat-github-io.aiadvokat16.workers.dev";
const questions=[
  [
    "internal",
    "Што претставува правна понуда во измислен договор? Одговори во две реченици."
  ],
  [
    "internal",
    "Во претходниот измислен договор, што е прифаќање на понудата?"
  ],
  [
    "internal",
    "Кои три факти би ги побарал пред анализа на спорна договорна клаузула?"
  ],
  [
    "internal",
    "Дали можеш да го сумираш досегашниот разговор во две точки без измислени законски членови?"
  ],
  [
    "internal",
    "Како да разликувам доказ од претпоставка во граѓански спор?"
  ],
  [
    "internal",
    "Кои документи би ги побарал за работен спор, без лични податоци?"
  ],
  [
    "internal",
    "Објасни зошто роковите треба да се проверат во важечки официјален извор."
  ],
  [
    "internal",
    "Кое прашање треба да ти го поставам следно за подобра анализа на измислениот предмет?"
  ],
  [
    "external",
    "Здраво, објасни што е договор со две реченици, без лични податоци."
  ],
  [
    "external",
    "Што значи договорна обврска во примерот што го спомна?"
  ],
  [
    "external",
    "Што ако една страна тврди дека договорот не е исполнет?"
  ],
  [
    "external",
    "Кои факти недостигаат во овој измислен пример?"
  ],
  [
    "external",
    "Дали паметиш дека разговараме за договор? Одговори кратко."
  ],
  [
    "external",
    "Направи кратка листа на документи за адвокатска проверка."
  ],
  [
    "external",
    "Како ќе ги провериш важечките правни извори без да измислуваш членови?"
  ],
  [
    "external",
    "Резимирај ги претходните прашања во две точки."
  ],
  [
    "proactive",
    "За претходниот измислен договор, постави ми три прашања за фактите што недостигаат."
  ],
  [
    "proactive",
    "Продолжи го претходниот разговор: кои официјални извори би требало да се проверат?"
  ],
  [
    "proactive",
    "Предложи работна чек-листа за адвокатски преглед без поднесување акт."
  ],
  [
    "proactive",
    "Која е најлогичната следна информација што треба да ја побарам, и зошто?"
  ]
];
const report={protocol:"ZOKI_20_QUESTIONS_R25_LIVE_V1",time:new Date().toISOString(),
  preview,sourceCommit:"523781ad4ca0977cd6f7911f999af44f6d78fce1",
  userData:"none; synthetic legal scenarios only",freeCallCap:20,paidModelsAllowed:false,
  channels:{internal:"/api/chat",external:"/api/bot",proactive:"UI suggestions over /api/chat"},
  results:[],releaseReady:false};
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const save=()=>{report.summary={pass:report.results.filter(x=>x.status==="PASS").length,
  fail:report.results.filter(x=>x.status==="FAIL").length,
  notTested:report.results.filter(x=>x.status==="NOT_TESTED").length,
  total:report.results.length,realProviderCalls:report.results.filter(x=>x.requested).length,
  releaseReady:false};
  fs.writeFileSync("/tmp/zoki-20-question-results.json",JSON.stringify(report,null,2));};
const markRemaining=(reason,start)=>{for(let j=start;j<questions.length;j++)
  report.results.push({number:j+1,channel:questions[j][0],status:"NOT_TESTED",reason});};
try{
  const local=hash(fs.readFileSync("index.html"));
  const check=await fetch(preview+"/?zoki_audit="+Date.now(),{headers:{"cache-control":"no-cache"},signal:AbortSignal.timeout(18000)});
  const remote=check.ok?hash(Buffer.from(await check.arrayBuffer())):"none";
  report.parity={http:check.status,exactIndexMatch:local===remote};
  if(!check.ok||local!==remote){markRemaining("preview_source_parity_mismatch",0);save();process.exitCode=1;}
  else{
    const sessions={internal:crypto.randomUUID(),external:crypto.randomUUID(),proactive:crypto.randomUUID()};
    const histories={internal:[],external:[],proactive:[]};
    const blocked=new Set();
    for(let i=0;i<questions.length;i++){
      const [channel,baseQuestion]=questions[i];
      if(blocked.has(channel)){report.results.push({number:i+1,channel,status:"NOT_TESTED",reason:"previous_provider_or_access_failure"});continue;}
      let q=baseQuestion;
      if(channel==="proactive"){
        const opts=suggestLegalNextTurns({question:"Измислен договор меѓу две фирми",answer:"Треба да се утврдат факти и извори.",language:"mk",history:histories.proactive});
        report.proactiveSuggestionGenerated=Boolean(opts);
      }
      const body={q,mode:"auto",webSearch:false,guideIds:[],attachments:[],
        sessionId:sessions[channel],history:histories[channel].slice(-8)};
      const path=channel==="external"?"/api/bot":"/api/chat";
      let status=0,data={},failure="";
      try{
        const resp=await fetch(preview+path,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
        status=resp.status;data=await resp.json().catch(()=>({}));
      }catch(e){failure=String(e?.name||"network_error");}
      const answer=String(data?.answer||"").trim();
      const provider=String(data?.provider||"");
      const real=status===200&&data?.ok===true&&answer.length>=25
        &&provider!=="canonical_corpus_no_model"&&provider!==""&&data?.privacy?.providerCalled!==false;
      const row={number:i+1,channel,status:real?"PASS":"FAIL",http:status,provider,
        error:String(data?.error||failure).slice(0,120),answerChars:answer.length,
        trulyModelGenerated:real,requested:true,sessionPreserved:true,
        semanticLawyerReview:"NOT_TESTED"};
      report.results.push(row);
      console.log("ZOKI20",JSON.stringify(row));
      if(real){
        histories[channel].push({role:"user",text:q},{role:"assistant",text:answer.slice(0,1400)});
      }else{
        // Never drain quota / repeatedly hit membership denial or provider lock.
        blocked.add(channel);
      }
    }
    save();
    if(report.summary.pass!==20)process.exitCode=1;
  }
}catch(e){report.fatal=String(e?.message||e).slice(0,160);markRemaining("preflight_or_connection_error",report.results.length);save();process.exitCode=1;}
console.log("ZOKI20_FINAL",JSON.stringify(report.summary));
if(process.env.GITHUB_STEP_SUMMARY){
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   "### Zoki 20-question REAL AI audit (synthetic only)\n\n"+
   "| Result | Count |\n|---|---:|\n| Genuine AI PASS | "+report.summary.pass+
   " |\n| FAIL | "+report.summary.fail+" |\n| NOT_TESTED | "+report.summary.notTested+
   " |\n\nFailed/blocked calls are never counted as AI answers. This workflow never authorises production or legal reliance.\n");
}
