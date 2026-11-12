import fs from "node:fs";

const BASE=process.env.LIVE_WORKER_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev";
const exactPrompt="Да те замолам да ми направиш Тужба за лиферување на лажни информации во јавност, со измислени имиња, однапред многу ти благодарам ,Сашо";
const report={
  version:"AI_ADVOCAT_SASHO_LAWSUIT_LIVE_V1",
  testedAt:new Date().toISOString(),
  base:BASE,
  prompt:exactPrompt,
  pass:false
};

try{
  const response=await fetch(BASE+"/api/chat",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "accept":"application/json",
      "Origin":"https://ai-advokat.github.io"
    },
    body:JSON.stringify({
      q:exactPrompt,
      mode:"auto",
      webSearch:false,
      history:[],
      guideIds:[],
      guideDocuments:[],
      attachments:[]
    }),
    signal:AbortSignal.timeout(120000)
  });
  const raw=await response.text();
  let data=null;
  try{data=JSON.parse(raw);}catch{}
  const answer=String(data?.answer||"").trim();

  report.httpStatus=response.status;
  report.ok=data?.ok===true;
  report.provider=data?.provider??null;
  report.model=data?.model??null;
  report.sourceMode=data?.sourceMode??null;
  report.answerSample=answer.slice(0,1200);
  report.performance=data?.performance??null;
  report.legalGovernance=data?.legalGovernance??null;

  const failures=[];
  if(response.status!==200||data?.ok!==true) failures.push("http_or_ok");
  if(answer.length<180) failures.push("answer_too_short");
  if(!/[Ѐ-ӿ]/u.test(answer)) failures.push("not_macedonian_cyrillic");
  if(!/тужб/iu.test(answer)) failures.push("lawsuit_structure_missing");
  if(!/тужител/iu.test(answer)) failures.push("claimant_missing");
  if(!/тужен/iu.test(answer)) failures.push("defendant_missing");
  if(/macedonian_language_release_blocked/iu.test(answer)||String(data?.error||"")==="macedonian_language_release_blocked"){
    failures.push("macedonian_language_release_blocked");
  }
  if(/Одговорот не е прикажан затоа што задолжителната македонска јазична проверка не помина/iu.test(answer)){
    failures.push("language_gate_block_message");
  }
  if(/РАБОТЕН ПРИМЕР — ПРАВНАТА ОСНОВА НЕ Е ВЕРИФИКУВАНА/u.test(answer)){
    failures.push("forbidden_generic_degraded_draft");
  }
  if(/ДО: \[НАДЛЕЖЕН СУД \/ ОРГАН — ДА СЕ ПРОВЕРИ\]/u.test(answer)){
    failures.push("forbidden_generic_court_placeholder");
  }
  if(/[ЂђЋћЪъЫыЭэЁёЮюЯяЙйЬьЩщ]/u.test(answer)){
    failures.push("foreign_cyrillic_contamination");
  }
  if(data?.legalGovernance && data.legalGovernance.humanReviewRequired!==true){
    failures.push("human_gate_weakened");
  }

  report.failures=failures;
  report.pass=failures.length===0;
}catch(error){
  report.error=String(error?.message||error);
  report.failures=["request_failed"];
  report.pass=false;
}

fs.writeFileSync("/tmp/ai-advokat-sasho-lawsuit-live.json",JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.pass) process.exitCode=1;
