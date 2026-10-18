import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const m=JSON.parse(fs.readFileSync("data/zkp-commentary-v6-manifest.json","utf8"));
describe("ZKP Commentary v6 manifest",()=>{
  test("ZC1 preserves secondary-authority boundary",()=>{
    assert.equal(m.record_count,570);
    assert.equal(m.authority_role,"authorial_analysis");
    assert.equal(m.primary_law_dependency,"mk:zkp");
    assert.equal(m.production_corpus_write,false);
    assert.ok(m.retrieval_contract.includes("official_statutory_text_first"));
    assert.ok(m.retrieval_contract.includes("authorial_commentary_second"));
  });
  test("ZC2 canonical brand has no generation suffix",()=>{
    assert.equal(m.brand,"AI Advokat");
    assert.doesNotMatch(JSON.stringify(m),/AI Advokat 4|АИ АДВОКАТ 4/);
  });
});
