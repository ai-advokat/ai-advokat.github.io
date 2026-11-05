import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const runner=fs.readFileSync("scripts/zoki-critical-legal-uat.mjs","utf8");

test("ZOKIUAT1 focused suite covers the seven critical legal acceptance dimensions",()=>{
  for(const marker of [
    "ZRO12","GAZETTE_1_2010","AMBIGUOUS_ARTICLE_12","DIVORCE_DRAFT","DEBT_150K","ECHR_WON_CASES","STABILITY_ZRO12_"
  ]) assert.match(runner,new RegExp(marker));
});

test("ZOKIUAT2 both internal and external bot surfaces are exercised",()=>{
  assert.match(runner,/path:"\/api\/chat"/);
  assert.match(runner,/path:"\/api\/bot"/);
  assert.match(runner,/X-Membership-Key/);
});

test("ZOKIUAT3 live suite is bounded and does not enable web research",()=>{
  assert.match(runner,/webSearch:false/);
  assert.match(runner,/AbortSignal\.timeout\(120000\)/);
  assert.match(runner,/AI_ADVOCAT_UAT_PACE_MS/);
  assert.doesNotMatch(runner,/webSearch:true/);
});

test("ZOKIUAT4 source hygiene and anti-hallucination invariants are explicit",()=>{
  assert.match(runner,/exact_article_source_pollution/);
  assert.match(runner,/ambiguous_article_bound_to_specific_law/);
  assert.match(runner,/unverified_numbered_article_in_draft/);
  assert.match(runner,/invented_specific_date/);
  assert.match(runner,/unverified_won_cases_leaked/);
});

test("ZOKIUAT5 runtime exhaustion and timeout errors are release-blocking",()=>{
  assert.match(runner,/workers_ai_daily_capacity_exhausted/);
  assert.match(runner,/openai_timeout_error/);
  assert.match(runner,/lioe_observability_unavailable/);
});

test("ZOKIUAT6 stability requires six clean repeated Article 12 responses",()=>{
  assert.match(runner,/stability\.length===6/);
  assert.match(runner,/stability\.every/);
  assert.match(runner,/hardFailures===0 && stabilityPass/);
});
