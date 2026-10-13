import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("migrations/0041_gazette_article_chunks.sql","utf8");
const contract=JSON.parse(fs.readFileSync("data/gazette-chunking-contract.json","utf8"));
const worker=fs.readFileSync("src/index.js","utf8");
const moduleText=fs.readFileSync("src/gazette-chunks.js","utf8");

test("GCR1 chunks preserve legal locators and source provenance",()=>{
  for(const field of ["article_number","paragraph_number","item_number","source_issue_number","source_issue_date","source_url","text_sha256","canonical_instrument_key"]){
    assert.match(migration,new RegExp(field));
  }
});

test("GCR2 runtime is fail-closed",()=>{
  assert.match(moduleText,/runtime_eligible=1/);
  assert.match(moduleText,/human_review_status IN \('reviewed','approved'\)/);
  assert.match(moduleText,/superseded=0/);
  assert.equal(contract.bot_activation_rule.current_law_claim_requires_current_law_eligible,true);
  assert.equal(contract.bot_activation_rule.fail_closed_on_missing_version,true);
});

test("GCR3 article is the primary chunk boundary",()=>{
  assert.equal(contract.default_strategy.primary_boundary,"article");
  assert.equal(contract.default_strategy.secondary_boundary,"paragraph");
  assert.equal(contract.default_strategy.preserve_article_number,true);
  assert.equal(contract.default_strategy.preserve_issue_provenance,true);
});

test("GCR4 bot corpus context is wired to governed Gazette chunks",()=>{
  assert.match(worker,/governedGazetteChunkContext\(env,q\)/);
  assert.match(worker,/\.\.\.gazetteBundle\.context/);
  assert.match(worker,/gazetteBundle\.context\.length>0/);
});
