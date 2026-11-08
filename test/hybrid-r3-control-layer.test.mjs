import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const hybrid=fs.readFileSync("hybrid-legal-intelligence.html","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");
const externalHtml=fs.readFileSync("bot/index.html","utf8");

test("Hybrid Control R3 is an orchestration layer over the existing ten legal modules",()=>{
  assert.match(hybrid,/AI_ADVOCAT_HYBRID_CONTROL_R3/);
  assert.match(hybrid,/Control Layer R3 · над Hybrid 10/);
  for(const mode of ['value="manual"','value="hybrid"','value="auto"']) assert.ok(hybrid.includes(mode));
  assert.match(hybrid,/id="pinCurrent"/);
  assert.match(hybrid,/id="executionTrace"/);
  assert.match(hybrid,/Pin ≠ authority/);
  assert.equal((hybrid.match(/class="module-tab/g)||[]).length,10);
});

test("Hybrid R3 pins are bounded and preserve authority/Human Gate boundary in handoff",()=>{
  assert.match(hybrid,/state\.pins=state\.pins\.slice\(-8\)/);
  assert.match(hybrid,/pinning does NOT promote authority status/);
  assert.match(hybrid,/Discovery, ECHR HOLD, working diff and open-data signals must not be promoted/);
  assert.match(hybrid,/aiAdvokatHybridControlR3Handoff/);
  assert.match(internal,/consumeHybridControlR3Handoff/);
  assert.match(external,/consumeHybridControlR3Handoff/);
  assert.match(internal,/Date\.now\(\)-createdAt>15\*60\*1000/);
  assert.match(external,/Date\.now\(\)-createdAt>15\*60\*1000/);
});

test("Hybrid R3 visible trace records real API status without changing the API contract",()=>{
  assert.match(hybrid,/function traceApi\(/);
  assert.match(hybrid,/durationMs/);
  assert.match(hybrid,/state\.trace=state\.trace\.slice\(-30\)/);
  assert.match(hybrid,/async function api\(path\)/);
});

test("official web source focus is enforced through Responses web_search domain filters",()=>{
  assert.match(worker,/mk_official:Object\.freeze/);
  assert.match(worker,/eu_echr_official:Object\.freeze/);
  for(const domain of ["ldbis.pravda.gov.mk","sobranie.mk","ustavensud.mk","eur-lex.europa.eu","hudoc.echr.coe.int","curia.europa.eu"]){
    assert.ok(worker.includes(domain),"missing official domain "+domain);
  }
  assert.match(orchestrator,/filters:\{allowed_domains:\[\.\.\.domains\]\}/);
  assert.match(orchestrator,/webAllowedDomains/);
  assert.match(internal,/webDomainPreset/);
  assert.match(external,/webDomainPreset/);
  assert.match(externalHtml,/id="webDomainPreset"/);
});

test("Hybrid R3 inline JavaScript remains syntactically valid",()=>{
  const match=hybrid.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.doesNotThrow(()=>new Function(match[1]));
});

test("R16.1 release manifest ships Hybrid Control R3 and Batch Review to Pages",()=>{
  const pagesSync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
  const rootSmoke=fs.readFileSync(".github/workflows/root-reliability-live-smoke.yml","utf8");
  assert.match(pagesSync,/professional-tools\.html/);
  assert.match(pagesSync,/assets\/professional-tools\.js/);
  assert.match(pagesSync,/AI_ADVOCAT_HYBRID_CONTROL_R3/);
  assert.match(pagesSync,/Batch Review · до 100 документи/);
  assert.match(rootSmoke,/pages-professional-tools\.html/);
  assert.match(rootSmoke,/pages-professional-tools\.js/);
  assert.match(rootSmoke,/AI_ADVOCAT_HYBRID_CONTROL_R3/);
  assert.match(rootSmoke,/Batch Review · до 100 документи/);
});
