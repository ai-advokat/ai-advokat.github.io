import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createD1, seedArticles } from "./d1-shim.mjs";
import { loadWorker } from "./load-worker.mjs";

const { worker }=await loadWorker();
const BASE="https://ai-advokat-github-io.aiadvokat16.workers.dev";
const SOURCE_URL="https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf";
const SOURCE_SHA="15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55";
let ip=150;

function fixture(){
  const {d1,raw}=createD1();
  seedArticles(raw,"mk:zi",[
    {number:"4",heading:"Обем на извршување",text:"Извршувањето заради остварување на парично побарување ќе се спроведе во обем што е потребен за намирување на тоа побарување.\n1 Редакциски пречистениот текст на Законот за извршување ги опфаќа: основниот текст... Oдлуката..."},
    {number:"104",heading:"Записник за пописот и процената",text:"(1) За пописот и процената извршителот составува записник.\n(2) Во записникот, покрај другото, посебно се назначуваат поединечно попишаните предмети, нивната проценета вредност, изјавите од странките и од учесниците во постапката, како и изјавите од трети лица за постоењето на права што го спречуваат извршувањето.\n(3) Записникот за извршен попис на подвижни предмети со вредност поголема од 1.000 евра, задолжително се доставува до Заложниот регистар заради упис на заложното право.\nЗабелешка наместо попис"},
    {number:"269",text:"Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија“ а ќе започне да се применува по четири месеци од денот на неговото влегување во сила.\n*Членот 269 е изменет, види: член 1 од Законот за изменување на Законот за извршување („Службен весник на РМ“ бр.142/16)."}
  ],{
    status:"needs_version_review",
    review:"pending",
    version:{
      label:"official-editorial-consolidated-through-154/2023",
      valid_from:"2023-07-20",
      valid_to:null,
      is_current:0,
      human_review_status:"pending",
      version_class:"dated_snapshot"
    }
  });
  raw.prepare("UPDATE legal_article_versions SET source_url=?,source_sha256=? WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')").run(SOURCE_URL,SOURCE_SHA);
  return {
    env:{DB:d1,RATE_LIMIT_SALT:"s".repeat(40),ASSETS:{fetch:async()=>new Response("x")}},
    raw
  };
}

async function get(env,path){
  const r=await worker.fetch(new Request(BASE+path),env,{});
  return {status:r.status,body:await r.json()};
}
async function ask(env,q){
  const r=await worker.fetch(new Request(BASE+"/api/assistant",{
    method:"POST",
    headers:{"content-type":"application/json","CF-Connecting-IP":`192.0.2.${ip++}`},
    body:JSON.stringify({q,instrument:"mk:zi"})
  }),env,{});
  return {status:r.status,body:await r.json()};
}

test("ZIRR1 /api/articles preserves raw Article 4 while exposing reviewedText separately",async()=>{
  const {env}=fixture();
  const r=await get(env,"/api/articles?instrument=mk:zi&article=4");
  assert.equal(r.status,200,JSON.stringify(r.body));
  const a=r.body.articles[0];
  assert.match(a.text,/Редакциски пречистениот текст/);
  assert.doesNotMatch(a.reviewedText,/Редакциски пречистениот текст/);
  assert.equal(a.reviewedRepresentation.id,"mk:zi:art:4:reviewed-derived:v1");
  assert.equal(a.reviewedRepresentation.rawSourcePreserved,true);
  assert.equal(a.status,"needs_version_review");
});

test("ZIRR2 Article 104 reviewed representation excludes the next-article heading",async()=>{
  const {env}=fixture();
  const r=await get(env,"/api/articles?instrument=mk:zi&article=104");
  assert.equal(r.status,200,JSON.stringify(r.body));
  const a=r.body.articles[0];
  assert.match(a.text,/Забелешка наместо попис/);
  assert.doesNotMatch(a.reviewedText,/Забелешка наместо попис/);
  assert.equal(a.reviewedRepresentation.legalCurrencyState,"pending_current_gate");
});

test("ZIRR3 assistant synthesis and citation use reviewed Article 269, never the raw four-month phrase",async()=>{
  const {env}=fixture();
  const r=await ask(env,"Што предвидува член 269?");
  assert.equal(r.status,200,JSON.stringify(r.body).slice(0,1200));
  assert.match(r.body.answer,/1 јануари 2017/);
  assert.doesNotMatch(r.body.answer,/по четири месеци/);
  assert.equal(r.body.citations[0].articleNumber,"269");
  assert.match(r.body.citations[0].excerpt,/1 јануари 2017/);
  assert.doesNotMatch(r.body.citations[0].excerpt,/по четири месеци/);
  assert.equal(r.body.citations[0].reviewedRepresentation.amendmentGazetteIssue,"142/2016");
  assert.equal(r.body.answerProvenance.verificationState,"pending_verification");
});

test("ZIRR4 search scoring uses the reviewed representation for Article 269",async()=>{
  const {env}=fixture();
  const r=await get(env,"/api/articles?instrument=mk:zi&q=1%20јануари%202017");
  assert.equal(r.status,200,JSON.stringify(r.body));
  assert.ok(r.body.articles.some(a=>a.articleNumber==="269"));
});

test("ZIRR5 wrong source fingerprint returns raw-only even for the governed article number",async()=>{
  const {env,raw}=fixture();
  raw.prepare("UPDATE legal_article_versions SET source_sha256=? WHERE article_number_normalized='104'").run("0".repeat(64));
  const r=await get(env,"/api/articles?instrument=mk:zi&article=104");
  assert.equal(r.status,200,JSON.stringify(r.body));
  const a=r.body.articles[0];
  assert.equal(a.reviewedText,null);
  assert.equal(a.reviewedRepresentation,null);
  assert.match(a.text,/Забелешка наместо попис/);
});

test("ZIRR6 runtime source uses reviewed text in assistant and governed chat context without raw overwrite",()=>{
  const src=fs.readFileSync("src/index.js","utf8");
  assert.match(src,/articleTextForLegalSynthesis/);
  assert.match(src,/TEXT_REPRESENTATION/);
  assert.match(src,/RAW_SOURCE_PRESERVED/);
  assert.match(src,/reviewedRepresentation:a\.reviewedRepresentation/);
  assert.doesNotMatch(src,/UPDATE legal_article_versions SET article_text/);
});
