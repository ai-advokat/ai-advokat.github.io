import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync("index.html","utf8");
const worker=readFileSync("src/index.js","utf8");
const browserAcceptance=readFileSync("scripts/translator-browser-candidate-regression.mjs","utf8");

test("R20 full-page translator batching remains within the guarded request envelope",()=>{
  const items=Number(page.match(/const UI_TRANSLATION_BATCH_ITEMS=(\d+);/)?.[1]);
  const chars=Number(page.match(/const UI_TRANSLATION_BATCH_CHARS=(\d+);/)?.[1]);
  const hourly=Number(worker.match(/const UI_TRANSLATE_PER_LANGUAGE_HOURLY_LIMIT=(\d+);/)?.[1]);
  assert.equal(hourly,48);
  assert.ok(items>=24 && items<=96,"batch items must be bounded and useful");
  assert.ok(chars>=4800 && chars<=12000,"batch characters must stay within server limit");
  assert.match(browserAcceptance,/plannedBatches>0&&plannedBatches<=48/);
  assert.match(browserAcceptance,/requests<=48/);
});

test("R20 deterministic FREE fallback is not falsely labelled as model-generated or source-backed",()=>{
  const start=worker.indexOf("answer:releasedFallbackText,");
  assert.ok(start>0,"FREE fallback response must exist");
  const output=worker.slice(start,start+1700);
  assert.match(output,/providerRecovery:freeResult\.provider==="deterministic_capacity_fallback"/);
  assert.match(output,/deterministicFallback:true/);
  assert.match(output,/mode:"bounded_formal_draft_no_model"/);
  assert.match(output,/humanReviewRequired:true/);
  assert.match(output,/providerCalls:Number\(freeResult\.providerCalls\|\|0\)/);
  assert.match(output,/model:freeResult\.model,/);
});
