import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createD1, seedArticles } from "./d1-shim.mjs";
import { loadWorker } from "./load-worker.mjs";

const { worker } = await loadWorker();
const BASE="https://ai-advokat-github-io.aiadvokat16.workers.dev";
let ip=80;
const envFor=(d1)=>({
  DB:d1,
  RATE_LIMIT_SALT:"s".repeat(40),
  ASSETS:{fetch:async()=>new Response("x")}
});
async function get(env,path){
  const r=await worker.fetch(new Request(BASE+path),env,{});
  return {status:r.status,body:await r.json()};
}
async function ask(env,q,extra={}){
  const r=await worker.fetch(new Request(BASE+"/api/assistant",{
    method:"POST",
    headers:{
      "content-type":"application/json",
      "CF-Connecting-IP":`192.0.2.${ip++}`
    },
    body:JSON.stringify({q,...extra})
  }),env,{});
  return {status:r.status,body:await r.json()};
}
function ziFixture(){
  const {d1,raw}=createD1();
  seedArticles(raw,"mk:zi",[
    {number:"217",text:"Одредба пред член 218."},
    {number:"218",text:"Текст на член 218 за тест на статусното предупредување."}
  ],{
    status:"needs_version_review",
    review:"pending",
    version:{
      label:"zi-overlay-runtime-test",
      valid_from:"2023-07-20",
      valid_to:null,
      is_current:0,
      human_review_status:"pending",
      version_class:"dated_snapshot"
    }
  });
  return {env:envFor(d1),raw};
}

test("LSOR1 /api/articles attaches Article 218 pending constitutional-review notice without rewriting status",async()=>{
  const {env}=ziFixture();
  const r=await get(env,"/api/articles?instrument=mk:zi&article=218");
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.equal(r.body.articles.length,1);
  const a=r.body.articles[0];
  assert.equal(a.articleNumber,"218");
  assert.equal(a.status,"needs_version_review");
  assert.equal(a.legalStatusOverlays.length,1);
  assert.equal(a.legalStatusOverlays[0].caseNumber,"U.br.86/2025");
  assert.equal(a.legalStatusOverlays[0].legalEffect,"none_identified");
  assert.equal(a.legalStatusOverlays[0].humanGateRequired,true);
  assert.equal(r.body.legalStatusOverlays.length,1);
});

test("LSOR2 overlay is temporal: absent before initiation and absent from unrelated Article 217",async()=>{
  const {env}=ziFixture();
  const before=await get(env,"/api/articles?instrument=mk:zi&article=218&date=2026-01-20");
  assert.equal(before.status,200,JSON.stringify(before.body));
  assert.deepEqual(before.body.articles[0].legalStatusOverlays,[]);
  assert.deepEqual(before.body.legalStatusOverlays,[]);

  const other=await get(env,"/api/articles?instrument=mk:zi&article=217");
  assert.equal(other.status,200,JSON.stringify(other.body));
  assert.deepEqual(other.body.articles[0].legalStatusOverlays,[]);
});

test("LSOR3 future reference date is explicitly unverified",async()=>{
  const {env}=ziFixture();
  const r=await get(env,"/api/articles?instrument=mk:zi&article=218&date=2027-01-01");
  assert.equal(r.status,200,JSON.stringify(r.body));
  const o=r.body.articles[0].legalStatusOverlays[0];
  assert.equal(o.futureReferenceUnverified,true);
  assert.match(o.warningMk,/не е потврден/);
});

test("LSOR4 /api/assistant deterministically surfaces Article 218 warning and stays pending",async()=>{
  const {env}=ziFixture();
  const r=await ask(env,"ЗИ член 218");
  assert.equal(r.status,200,JSON.stringify(r.body).slice(0,800));
  assert.equal(r.body.instrument.canonicalKey,"mk:zi");
  assert.equal(r.body.citations[0].articleNumber,"218");
  assert.equal(r.body.citations[0].legalStatusOverlays.length,1);
  assert.equal(r.body.legalStatusOverlays.length,1);
  assert.equal(r.body.legalStatusOverlays[0].caseNumber,"U.br.86/2025");
  assert.match(r.body.legalStatusWarning,/У\.бр\.86\/2025/);
  assert.match(r.body.answer,/Статусно предупредување:/);
  assert.match(r.body.answer,/У\.бр\.86\/2025/);
  assert.equal(r.body.answerProvenance.verificationState,"pending_verification");
});

test("LSOR5 runtime source contains governed notices in both assistant and chat corpus context",()=>{
  const src=fs.readFileSync("src/index.js","utf8");
  assert.match(src,/LEGAL_STATUS_NOTICES/);
  assert.match(src,/legalStatusOverlaysForArticles/);
  assert.match(src,/pending_constitutional_review/);
  assert.match(src,/legalStatusOverlays:Array\.isArray\(article\.legalStatusOverlays\)/);
});
