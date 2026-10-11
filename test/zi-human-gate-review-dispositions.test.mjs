import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const r=JSON.parse(fs.readFileSync("ingest/mk/audits/zi-human-gate-review-dispositions-2026-10-11.json","utf8"));

test("ZIHG1 review accounts for all 28 parser findings",()=>{
  assert.equal(r.summary.findings_total,28);
  assert.equal(r.resolved.length,25);
  assert.equal(r.blockers.length,3);
  assert.equal(r.resolved.length+r.blockers.length,28);
});

test("ZIHG2 all 15 numeric gaps are source-explained",()=>{
  const gaps=r.resolved.filter(x=>x.code==="unexplained_gap");
  assert.equal(gaps.length,15);
  assert.deepEqual(gaps.map(x=>x.article),["95","240","241","242","243","244","247","248","250","252","256","257","258","259","260"]);
  assert.ok(gaps.every(x=>/RESOLVED_EXPLICITLY_/.test(x.disposition)));
});

test("ZIHG3 source-faithful mixed-script tokens are not silently normalized",()=>{
  const mixed=r.resolved.filter(x=>x.code==="mixed_script_token");
  assert.equal(mixed.length,10);
  assert.ok(mixed.every(x=>x.disposition==="RESOLVED_SOURCE_TEXT_LAYER_CONFIRMED"));
  assert.ok(mixed.every(x=>/non-destructive/.test(x.rule)));
});

test("ZIHG4 the only blockers are article-boundary/editorial segmentation",()=>{
  assert.deepEqual(r.blockers.map(x=>x.article),["4","104","269"]);
  assert.ok(r.blockers.every(x=>/SEGMENTATION/.test(x.disposition)));
});

test("ZIHG5 promotion remains blocked and raw corpus mutation is forbidden",()=>{
  assert.equal(r.summary.current_version_verified,false);
  assert.equal(r.summary.human_gate_approved,false);
  assert.equal(r.summary.corpus_mutation,false);
  assert.ok(r.governance.some(x=>/No raw article text is overwritten/.test(x)));
});
