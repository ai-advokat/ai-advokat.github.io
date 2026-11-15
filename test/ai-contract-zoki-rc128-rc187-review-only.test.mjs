import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest=JSON.parse(fs.readFileSync("data/ai-contract-zoki-rc128-rc187-intake.json","utf8"));
const page=fs.readFileSync("ai-contract-zoki-20261115-review.html","utf8");
const script=fs.readFileSync("assets/ai-contract-zoki-review.mjs","utf8");
const urls=[
  fs.readFileSync("index.html","utf8"),
  fs.readFileSync("bot/index.html","utf8"),
  fs.readFileSync("ai-contract.html","utf8"),
  fs.readFileSync("contract-intelligence.html","utf8")
];
test("review manifest enumerates two exact source archives, without embedded private cases",()=>{
  assert.equal(manifest.schema,"ai-advokat.contract-review.intake.v1");
  assert.equal(manifest.sources.length,2);
  assert.deepEqual(manifest.sources.map(s=>s.id),["RC128","RC187"]);
  assert.deepEqual(manifest.sources.map(s=>s.archive),["RC128_OK.zip","DPRO_RC187_OFFLINE_TECHNICAL_ACCEPTANCE.zip"]);
  for(const s of manifest.sources){
    assert.match(s.archiveSha256,/^[a-f0-9]{64}$/);
    assert.match(s.offlineHtmlSha256,/^[a-f0-9]{64}$/);
    assert.equal(s.status,"HOLD");
  }
});
test("no legal clause may be auto-approved by metadata or display",()=>{
  assert.equal(manifest.releaseState,"REVIEW_ONLY_HOLD");
  assert.equal(manifest.humanGate,"HOLD");
  assert.equal(manifest.production,"NO_GO");
  assert.equal(manifest.legalReview.approved,0);
  assert.equal(manifest.legalReview.critical,8);
  assert.equal(manifest.legalReview.high,20);
  assert.equal(manifest.legalReview.findingCount,28);
  assert.equal(manifest.models.length,6);
  assert.equal(manifest.models.reduce((x,y)=>x+y.findings,0),28);
});
test("source and runtime safety boundaries explicitly hold",()=>{
  assert.equal(manifest.safeguards.rawContractsPublished,false);
  assert.equal(manifest.safeguards.legalClausesPromoted,false);
  assert.equal(manifest.safeguards.liveAIEnabled,false);
  assert.equal(manifest.safeguards.apiCalls,false);
  assert.equal(manifest.safeguards.documentsUploaded,false);
  assert.equal(manifest.safeguards.signingEnabled,false);
  assert.match(page,/LEGAL HOLD/);
  assert.match(page,/PRODUCTION NO-GO/);
  assert.match(page,/noindex,nofollow/);
});
test("owner-side local SHA verification must not transmit zip or raw contract data",()=>{
  assert.match(page,/type="file"/);
  assert.match(script,/crypto\.subtle\.digest\("SHA-256",array\)/);
  assert.match(script,/file\.arrayBuffer\(\)/);
  assert.match(script,/manifest\.sources\.find\(x=>x\.archiveSha256===hash\)/);
  assert.match(script,/file\.size>15\*1024\*1024/);
  assert.doesNotMatch(script,/FormData|XMLHttpRequest|sendBeacon|localStorage|indexedDB|POST|eval\(/);
  assert.equal((script.match(/\bfetch\(/g)||[]).length,1);
  assert.ok(script.includes('fetch("/data/ai-contract-zoki-rc128-rc187-intake.json"'));
});
test("review does not replace the old contract generator or confuse two separate baselines",()=>{
  const canonical=fs.readFileSync("ai-contract.html","utf8");
  assert.match(canonical,/src="\/ai-contract-dpro14r\.html/);
  assert.match(page,/RC128/);
  assert.match(page,/RC187/);
  assert.match(page,/28 правни наоди/);
  assert.match(page,/не е нов продукциски генератор/);
});
test("new review gateway is discoverable in both bots and contract workspace",()=>{
  for(const content of urls){
    assert.match(content,/\/ai-contract-zoki-20261115-review\.html/);
    assert.match(content,/\/ai-contract\.html/);
  }
});
