import test from "node:test";
import assert from "node:assert/strict";
import { loadWorker } from "./load-worker.mjs";

const { worker }=await loadWorker();
const BASE="https://ai-advokat-github-io.aiadvokat16.workers.dev";

const env={
  ASSETS:{fetch:async req=>new Response("asset:"+new URL(req.url).pathname,{status:200})}
};

async function call(path,{method="GET",body=null}={}){
  const headers=body?{"content-type":"application/json"}:{};
  const res=await worker.fetch(new Request(BASE+path,{method,headers,body:body?JSON.stringify(body):undefined}),env,{waitUntil(){}});
  return {status:res.status,body:await res.json()};
}

test("Open Legal Sources public runtime endpoint exposes 16 governed lanes",async()=>{
  const r=await call("/api/open-legal-sources-policy");
  assert.equal(r.status,200);
  assert.equal(r.body.ok,true);
  assert.equal(r.body.policy.version,"1.0.0");
  assert.equal(r.body.policy.sourceCount,16);
  assert.equal(r.body.sources.length,16);
  assert.equal(r.body.runtime.sourceRouter,"enabled");
  assert.equal(r.body.runtime.rightsGate,"enabled");
  assert.equal(r.body.runtime.corpusPromotion,"separate_human_gate");
});

test("Legal Base keeps its backward-compatible core official source directory",async()=>{
  const r=await call("/api/web-sources");
  assert.equal(r.status,200);
  assert.equal(r.body.mode,"curated_official_directory");
  assert.equal(r.body.sources.length,6);
  assert.ok(r.body.sources.some(x=>x.id==="ldbis"));
  assert.ok(r.body.sources.some(x=>x.id==="hudoc"));
  assert.ok(r.body.sources.some(x=>x.id==="eur-lex"));
});

test("the separate Open Legal Sources policy endpoint exposes all rights-aware lanes",async()=>{
  const r=await call("/api/open-legal-sources-policy");
  assert.equal(r.status,200);
  assert.equal(r.body.sources.length,16);
  const gazetteData=r.body.sources.find(x=>x.id==="mk-official-gazette-data-gov-2017");
  assert.equal(gazetteData.ingestStatus,"metadata_only");
  assert.equal(gazetteData.automatedBulkIngest,false);
  const eurlex=r.body.sources.find(x=>x.id==="eu-eurlex");
  assert.equal(eurlex.reuseStatus,"verified_reuse_allowed");
  assert.equal(eurlex.automatedBulkIngest,true);
});

test("orchestrator API exposes source policy and regional runtime extension",async()=>{
  const r=await call("/api/orchestrator");
  assert.equal(r.status,200);
  assert.equal(r.body.sourcePolicy.version,"1.0.0");
  assert.equal(r.body.sourcePolicy.sourceCount,16);
  assert.ok(r.body.agents.some(x=>x.id==="regional_comparative"));
});

test("regional planning routes Slovenian law to regional comparative specialist",async()=>{
  const r=await call("/api/orchestrator/plan",{method:"POST",body:{q:"Што вели словенечкото право?"}});
  assert.equal(r.status,200);
  assert.equal(r.body.execution,"planning_only");
  assert.ok(r.body.plan.agents.includes("regional_comparative"));
  assert.equal(r.body.plan.mode,"proactive_research");
});
