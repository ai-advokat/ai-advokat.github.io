import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const g=JSON.parse(fs.readFileSync("data/publication-governance.json","utf8"));
const s=fs.readFileSync("docs/standards/AI_ADVOKAT_PROFESSIONAL_PUBLICATION_STANDARD.md","utf8");

describe("professional publication governance",()=>{
  test("PP1 all critical gates are explicit and separate",()=>{
    for(const k of ["author_approval","public_release","rag_ingest","production_corpus_write","github_merge"]) assert.match(g.gates[k],/explicit/);
  });
  test("PP2 publication standard is source-first and Human-Gated",()=>{
    assert.match(s,/Source hierarchy/i);
    assert.match(s,/Human Gates/i);
    assert.match(s,/RATIO protocol/i);
    assert.match(s,/AI\/RAG eligibility/i);
  });
  test("PP3 open publication-review items are not silently promoted",()=>{
    for(const x of g.pipeline){
      assert.doesNotMatch(x.status,/publication_master|public_release|rag_ingested/);
    }
  });
  test("PP4 known open PRs remain recorded as review candidates",()=>{
    const prs=g.pipeline.filter(x=>x.pull_request).map(x=>x.pull_request).sort((a,b)=>a-b);
    assert.deepEqual(prs,[68,69,70]);
  });
});
