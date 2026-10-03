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
      assert.doesNotMatch(x.status,/publication_master|public_release|rag_eligible|rag_ingested/);
      assert.equal(x.public_release,false);
      assert.equal(x.rag_eligible,false);
      assert.equal(x.github_merge_approved,false);
      assert.equal(x.production_corpus_write_approved,false);
    }
  });
  test("PP4 known open PRs remain recorded as review candidates",()=>{
    const prs=g.pipeline.filter(x=>x.pull_request).map(x=>x.pull_request).sort((a,b)=>a-b);
    assert.deepEqual(prs,[68,69,70]);
  });
  test("PP5 inheritance guide author gate advanced while downstream gates remain closed",()=>{
    const x=g.pipeline.find(x=>x.id==="inheritance-estate-guide-2025-r1");
    assert.equal(x.status,"author_approved_candidate");
    assert.equal(x.author_approval,"approved_2026-10-03");
    assert.equal(x.public_release,false);
    assert.equal(x.rag_eligible,false);
    assert.equal(x.github_merge_approved,false);
    assert.equal(x.production_corpus_write_approved,false);
    assert.match(x.candidate_docx_sha256,/^[0-9a-f]{64}$/);
    assert.match(x.candidate_pdf_sha256,/^[0-9a-f]{64}$/);
  });
  test("PP6 new last-set batch is registered as ten Human-Gated guides",()=>{
    assert.equal(g.last_set_2026_10_03.unique_guides,10);
    const lastSet=g.pipeline.filter(x=>x.source_set==="last_set_2026_10_03");
    assert.equal(lastSet.length,10);
    for(const x of lastSet){
      if(x.id==="inheritance-estate-guide-2025-r1") assert.equal(x.author_approval,"approved_2026-10-03");
      else assert.equal(x.author_approval,"pending");
      assert.equal(x.public_release,false);
      assert.equal(x.rag_eligible,false);
      assert.equal(x.github_merge_approved,false);
      assert.equal(x.production_corpus_write_approved,false);
    }
  });
  test("PP7 last-set source pairs carry identifying metadata",()=>{
    const lastSet=g.pipeline.filter(x=>x.source_set==="last_set_2026_10_03");
    for(const x of lastSet){
      assert.ok(x.source_edition);
      assert.equal(x.source_role,"author_delivered_source");
      assert.match(x.source_package.sha256,/^[0-9a-f]{64}$/);
      for(const k of ["docx","pdf"]){
        assert.ok(x.source_files[k].file);
        assert.ok(Number.isInteger(x.source_files[k].size_bytes) && x.source_files[k].size_bytes>0);
        assert.match(x.source_files[k].sha256,/^[0-9a-f]{64}$/);
        assert.equal(x.source_files[k].role,"author_delivered_source");
      }
    }
  });
});
