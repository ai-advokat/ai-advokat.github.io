import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LEGAL_RETRIEVAL_ROUTER_VERSION,
  legalRetrievalPlan
} from "../src/legal-retrieval-router.js";

test("R15 retrieval router avoids expensive unrelated lanes",()=>{
  assert.equal(LEGAL_RETRIEVAL_ROUTER_VERSION,"AI_ADVOCAT_LEGAL_RETRIEVAL_ROUTER_R15");
  const debt=legalRetrievalPlan("Подготви работен нацрт за наплата на долг од 150.000 денари.");
  assert.equal(debt.caseLaw,false);
  assert.equal(debt.gazette,false);
  assert.equal(debt.echr,false);
  assert.equal(debt.scholarly,false);
  assert.equal(debt.authorial,false);
});

test("R15 retrieval router keeps explicit case-law and ECHR research available",()=>{
  const detention=legalRetrievalPlan("За притвор наведи поддржувачка и спротивна судска практика.");
  assert.equal(detention.caseLaw,true);
  const echr=legalRetrievalPlan("Провери предмети во HUDOC и ЕСЧП.");
  assert.equal(echr.echr,true);
});

test("statutory ZKP judgment taxonomy bypasses case-law search",()=>{
  const taxonomy=legalRetrievalPlan("Кои се законските видови пресуди во ЗКП?");
  assert.equal(taxonomy.taxonomy,true);
  assert.equal(taxonomy.caseLaw,false);
});

test("chat runtime applies bounded FREE context and conditional language editor",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/FREE_CHAT_MAX_CORPUS_CHARS=22000/);
  assert.match(worker,/slice\(0,12\)/);
  assert.match(worker,/forceEditorialPass:false/);
  assert.match(worker,/stems\.length>=4/);
  assert.match(worker,/Math\.max\(12,Math\.min\(24,Number\(limit\|\|4\)\*6\)\)/);
  assert.match(worker,/canonical_zkp_articles_401_404_no_model/);
  assert.match(worker,/legalRetrievalPlan\(routingQuery/);
  assert.match(worker,/async function loadInstrumentArticleCandidatesForChat/);
  assert.match(worker,/async function findRelevantArticlesForChat/);
  assert.match(worker,/const retrieval=await findRelevantArticlesForChat\(env,routing\.key,q,5/);
  assert.match(worker,/LIMIT \?\`/);
});
