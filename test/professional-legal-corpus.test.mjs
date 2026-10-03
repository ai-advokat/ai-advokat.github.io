import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const c=JSON.parse(fs.readFileSync("data/professional-legal-corpus-2026.json","utf8"));
const g=JSON.parse(fs.readFileSync("data/publication-governance.json","utf8"));
const s=fs.readFileSync("docs/standards/AI_ADVOKAT_PROFESSIONAL_LEGAL_CORPUS_2026.md","utf8");

describe("AI Advokat Professional Legal Corpus 2026",()=>{
  test("PLC1 doctrine is source-first, version-aware and Human-Gated",()=>{
    for(const x of ["source_first","version_aware","human_gate","fail_closed"]) assert.ok(c.doctrine.includes(x));
    assert.match(s,/Source hierarchy/i);
    assert.match(s,/Human Gate matrix/i);
    assert.match(s,/AI retrieval contract/i);
  });

  test("PLC2 lifecycle lanes are explicit and non-collapsing",()=>{
    assert.deepEqual(c.allowed_lanes,["source","legal_source_review","corrected_candidate","author_approved_candidate","publication_master"]);
    assert.match(s,/No lane implies the next lane/i);
  });

  test("PLC3 ten-guide cohort cross-links to publication governance",()=>{
    const cohort=c.cohorts.find(x=>x.id==="last_set_2026_10_03");
    assert.equal(cohort.count,10);
    assert.equal(cohort.items.length,10);
    const governed=new Map(g.pipeline.map(x=>[x.id,x]));
    for(const item of cohort.items) assert.ok(governed.has(item.id),`Missing governance item ${item.id}`);
  });

  test("PLC4 inheritance is the only author-approved item in the cohort",()=>{
    const cohort=c.cohorts.find(x=>x.id==="last_set_2026_10_03");
    const approved=cohort.items.filter(x=>x.lane==="author_approved_candidate");
    assert.deepEqual(approved.map(x=>x.id),["inheritance-estate-guide-2025-r1"]);
    assert.equal(approved[0].epistemic_status,"verified_current");
    assert.equal(approved[0].verification_date,"2026-10-03");
  });

  test("PLC5 remaining nine stay pending verification",()=>{
    const cohort=c.cohorts.find(x=>x.id==="last_set_2026_10_03");
    const rest=cohort.items.filter(x=>x.id!=="inheritance-estate-guide-2025-r1");
    assert.equal(rest.length,9);
    for(const x of rest){
      assert.equal(x.lane,"legal_source_review");
      assert.equal(x.epistemic_status,"pending_verification");
    }
  });

  test("PLC6 corpus defaults remain fail-closed",()=>{
    assert.equal(c.release_policy.public_release,false);
    assert.equal(c.release_policy.rag_eligibility,false);
    assert.equal(c.release_policy.github_merge,false);
    assert.equal(c.release_policy.production_corpus_write,false);
    for(const x of g.pipeline.filter(x=>x.source_set==="last_set_2026_10_03")){
      assert.equal(x.public_release,false);
      assert.equal(x.rag_eligible,false);
      assert.equal(x.github_merge_approved,false);
      assert.equal(x.production_corpus_write_approved,false);
    }
  });

  test("PLC7 verification states are separate from content roles",()=>{
    for(const x of ["verified_current","verified_historical","pending_verification","conflicted","superseded"]) assert.ok(c.verification_states.includes(x));
    for(const x of ["authorial_analysis","secondary_reference","ai_synthesis"]) assert.ok(c.content_roles.includes(x));
    assert.equal(c.verification_states.includes("authorial_analysis"),false);
    assert.match(s,/what the source says/i);
    assert.match(s,/what the author analyses or concludes/i);
    assert.match(s,/what AI generated or organised/i);
  });
});
