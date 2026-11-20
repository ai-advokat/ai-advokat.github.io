// Audit P1 — runtime, publication surface and source-first interface regressions.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadWorker} from "./load-worker.mjs";

const workerSource=readFileSync("src/index.js","utf8");
const html=readFileSync("index.html","utf8");
const chat=readFileSync("assets/ai-advokat-chat.js","utf8");
const academy=readFileSync("academy/index.html","utf8");
const timeline=readFileSync("assets/zpp-timeline.js","utf8");
const ignored=readFileSync(".assetsignore","utf8");
const headers=readFileSync("_headers","utf8");
const readme=readFileSync("README.md","utf8");
const base="https://ai-advokat-github-io.aiadvokat16.workers.dev";

test("P1 same-origin promotion media is allowed by Worker CSP (no third-party media)",async()=>{
  const {worker}=await loadWorker();
  const response=await worker.fetch(new Request(base+"/"),{
    ASSETS:{fetch:async()=>new Response("<html></html>",{headers:{"Content-Type":"text/html"}})}
  },{waitUntil(){}});
  const csp=response.headers.get("Content-Security-Policy")||"";
  assert.match(csp,/media-src 'self'/);
  assert.doesNotMatch(csp,/media-src 'none'/);
  assert.match(csp,/object-src 'none'/);
});

test("P1 localhost CORS is refused in production and allowed on local Wrangler only",async()=>{
  const {worker}=await loadWorker();
  for(const [url,allowed] of [
    [base+"/api/membership/plans",false],
    ["http://localhost:8787/api/membership/plans",true]
  ]){
    const response=await worker.fetch(new Request(url,{headers:{Origin:"http://localhost:8787"}}),{},{});
    assert.equal(response.headers.get("Access-Control-Allow-Origin"),allowed?"http://localhost:8787":null);
  }
  assert.match(workerSource,/isLocalDevRequest/);
});

test("P1 internal staging, UAT and release directories are excluded from Worker static assets",()=>{
  for(const pattern of ["uat/**","staging/**","mvp-v2/**","release/**","data/uat/**"]){
    assert.ok(ignored.split("\n").includes(pattern),"missing .assetsignore "+pattern);
  }
});

test("P1 misleading FREE attachments counter is hidden until professional entitlement",()=>{
  assert.match(chat,/attachmentCount\.hidden=!professional/);
  assert.match(chat,/attachmentCount\.style\.display=professional\?"":"none"/);
  assert.match(chat,/attachmentCount\.textContent=professional\?attachments\.length/);
});

test("P1 fifth example only asks a law with loaded article-level text",()=>{
  assert.match(html,/Проверен член од ЗРО/);
  assert.match(html,/Што уредува член 13 од Законот за работните односи/);
  assert.doesNotMatch(html,/Кој член од ЗПП ја уредува содржината на тужбата/);
});

test("P1 ZPP timeline reports documented human review, not unverified current-law freshness",()=>{
  assert.match(timeline,/lastHumanVerifiedAt: LAST_HUMAN_METADATA_REVIEW\.date/);
  assert.match(html,/const lastReviewed=tl\.lastHumanVerifiedAt\|\|tl\.statusAsOf/);
  assert.match(html,/Не претставува денешна потврда/);
  assert.match(html,/консулт|consult the official source/);
});

test("P1 publication-pending manual no longer links to missing library anchor",()=>{
  assert.doesNotMatch(academy,/\/professional-library\/#echr-north-macedonia-manual-v4-2/);
  assert.match(academy,/Во подготовка · проверка на изданието/);
});

test("P1 cache policy revalidates JS and preserves no-store for critical bot pages",()=>{
  assert.match(headers,/\/assets\/\*\.js\s+Cache-Control: public, max-age=3600, must-revalidate/);
  assert.match(headers,/\/assets\/\*\.mjs\s+Cache-Control: public, max-age=3600, must-revalidate/);
  assert.match(headers,/\/bot\/\*\s+Cache-Control: no-store/);
  assert.doesNotMatch(headers,/immutable/);
});

test("P1 README reflects production Workers AI binding and correct FREE quota",()=>{
  assert.match(readme,/Workers AI has a production `ai` binding/);
  assert.match(readme,/FREE = 10 assistant requests/);
  assert.doesNotMatch(readme,/Workers AI is bound in staging only/);
});
