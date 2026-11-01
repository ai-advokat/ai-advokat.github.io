import fs from "node:fs";
import assert from "node:assert/strict";

const base=String(process.env.AI_ADVOCAT_BASE||"https://ai-advokat-github-io.aiadvokat16.workers.dev");
const key=String(process.env.ROOT_SMOKE_KEY||process.env.R13_SMOKE_KEY||"");
assert.ok(key,"ROOT_SMOKE_KEY missing");

const q="Што уредува член 12 од ЗРО и кои услови ги предвидува? Не измислувај членови или содржина. Наведи го точниот извор и важечката верзија.";
const response=await fetch(base+"/api/bot",{
  method:"POST",
  headers:{
    "content-type":"application/json",
    "accept":"application/json",
    "X-Membership-Key":key,
    "Origin":"https://ai-advokat.github.io"
  },
  body:JSON.stringify({q,mode:"auto",webSearch:false,history:[],guideIds:[],guideDocuments:[],attachments:[]})
});
const raw=await response.text();
let data=null; try{data=JSON.parse(raw);}catch{}
const summary={
  httpStatus:response.status,
  ok:data?.ok===true,
  error:data?.error||null,
  displayMode:data?.displayMode||null,
  sourceMode:data?.sourceMode||null,
  articleCorpusState:data?.articleCorpusState||null,
  governanceRunId:data?.governanceRunId||null,
  provider:data?.provider??null,
  model:data?.model??null,
  legalSourceCount:Array.isArray(data?.legalSources)?data.legalSources.length:0,
  answerLength:String(data?.answer||"").length
};
fs.writeFileSync("/tmp/pro-zro12-summary.json",JSON.stringify(summary,null,2));
if(response.status!==200 || data?.ok!==true){
  console.error("ZRO12_LIVE_FAILURE",JSON.stringify(summary));
  process.exit(1);
}
const answer=String(data.answer||"").trim();
assert.ok(answer.length>40,"ZRO12 answer/source-gap text too short");
assert.doesNotMatch(answer,/AI runtime не успеа безбедно/iu);
assert.doesNotMatch(answer,/LIOE-RT-/u);
if(data.displayMode==="professional_exact_article_source_gap"){
  assert.match(answer,/SOURCE\/VERSION GAP/u);
  assert.match(answer,/член 12/iu);
  assert.match(answer,/не избира произволно една од повеќе верзии/iu);
}else{
  assert.ok(Array.isArray(data.legalSources)||Array.isArray(data.sources),"source arrays missing");
  assert.match(answer,/12/u);
}
console.log("ZRO ARTICLE 12 LIVE REGRESSION: PASS",JSON.stringify(summary));
