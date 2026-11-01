import test from "node:test";
import assert from "node:assert/strict";
import {loadWorker} from "./load-worker.mjs";

const {worker}=await loadWorker();

function envWithStatic(body="CURRENT_R12_ASSET"){
  return {
    ASSETS:{
      async fetch(){
        return new Response(body,{
          status:200,
          headers:{"content-type":"text/html; charset=utf-8"}
        });
      }
    }
  };
}

test("legacy external bot release redirects to core-r12 and clears only cache",async()=>{
  const request=new Request("https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/?release=core-r10");
  const response=await worker.fetch(request,envWithStatic(),{});
  assert.equal(response.status,302);
  const location=response.headers.get("location");
  assert.ok(location);
  const target=new URL(location);
  assert.equal(target.pathname,"/bot/");
  assert.equal(target.searchParams.get("release"),"core-r12");
  assert.equal(response.headers.get("cache-control"),"no-store, max-age=0");
  assert.equal(response.headers.get("clear-site-data"),'"cache"');
  assert.equal(response.headers.get("x-ai-advokat-release"),"core-r12");
  assert.equal(response.headers.get("x-ai-advokat-legacy-release"),"core-r10");
});

test("unversioned external bot URL canonicalizes to core-r12 without site-data clearing",async()=>{
  const response=await worker.fetch(
    new Request("https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/"),
    envWithStatic(),
    {}
  );
  assert.equal(response.status,302);
  const target=new URL(response.headers.get("location"));
  assert.equal(target.searchParams.get("release"),"core-r12");
  assert.equal(response.headers.get("clear-site-data"),null);
});

test("current core-r12 external bot URL reaches the static asset plane",async()=>{
  const response=await worker.fetch(
    new Request("https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/?release=core-r12"),
    envWithStatic("R12_OK"),
    {}
  );
  assert.equal(response.status,200);
  assert.equal(await response.text(),"R12_OK");
});
