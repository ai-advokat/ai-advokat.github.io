import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const e=JSON.parse(fs.readFileSync("data/citation-authority-engine.json","utf8"));
const p=fs.readFileSync("docs/standards/AI_ADVOKAT_CITATION_AUTHORITY_ENGINE_v1.md","utf8");

describe("Citation & Authority Engine",()=>{
  test("CAE1 authority taxonomy is complete and unique",()=>{
    const labels=e.authority_classes.map(x=>x.label);
    assert.deepEqual(labels,[
      "primary_binding_law",
      "judicial_authority",
      "official_guidance",
      "authorial_analysis",
      "secondary_reference",
      "ai_synthesis"
    ]);
    assert.equal(new Set(e.authority_classes.map(x=>x.code)).size,6);
  });

  test("CAE2 AI synthesis is never authority for current law",()=>{
    const ai=e.authority_classes.find(x=>x.label==="ai_synthesis");
    assert.equal(ai.binding_role,"none");
    assert.equal(ai.may_support_current_law,false);
    assert.match(p,/AI synthesis is never a legal authority/i);
  });

  test("CAE3 commentary classes cannot independently claim current law",()=>{
    for(const label of ["authorial_analysis","secondary_reference"]){
      const x=e.authority_classes.find(y=>y.label===label);
      assert.equal(x.may_support_current_law,false);
    }
  });

  test("CAE4 high-risk current-law claims require verification and provenance",()=>{
    for(const k of ["authority_class","source_identity","version_or_date","verification_state","provenance"]){
      assert.ok(e.claim_contract.high_risk_current_law_requires.includes(k));
    }
  });

  test("CAE5 fail-closed downgrade rules cover core misclassification risks",()=>{
    for(const k of [
      "missing_authority_class",
      "missing_source_identity",
      "current_law_supported_only_by_ai_synthesis",
      "commentary_mislabelled_as_binding_law",
      "superseded_source_presented_as_current",
      "invented_locator",
      "missing_verification_state_for_high_risk_claim"
    ]) assert.ok(e.downgrade_rules.includes(k));
  });

  test("CAE6 human gates remain outside citation classification",()=>{
    assert.deepEqual(e.separate_human_gates,[
      "author_approval","public_release","rag_eligibility","github_merge","production_corpus_write"
    ]);
    assert.match(p,/Those remain separate Human Gates/i);
  });
});
