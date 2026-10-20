import test from "node:test";
import assert from "node:assert/strict";
import {applyCaseLawSourceBindingReview} from "../scripts/apply-case-law-source-binding-review.mjs";

function staged(){
  const sha="a".repeat(64);
  return [
    {
      type:"case_law_manifest",
      run_id:"binding-test",
      source_class:"official_public",
      source_provider:"Врховен суд на Република Северна Македонија",
      discovery_only:true,
      binding_required:true,
      human_gate_required:true,
      production_eligible:false
    },
    {
      type:"case_law_case",
      case_key:"sha256:"+sha,
      case_title:"Врховен суд · Рев.бр. 1/2026",
      court:"Врховен суд",
      jurisdiction:"MK",
      source_url:"https://www.vrhoven.sud.mk/decision?id=1",
      source_sha256:sha,
      source_binding:{
        verification_method:"direct_https_retrieval_sha256",
        source_url:"https://www.vrhoven.sud.mk/decision?id=1",
        source_sha256:sha,
        remote_content_hash_verified:true,
        retrieved_at:"2026-10-20T08:00:00Z",
        human_gate_status:"pending",
        official_binding_verified:false
      },
      discovery_only:true,
      official_binding_verified:false,
      human_gate_required:true,
      production_eligible:false
    }
  ].map(x=>JSON.stringify(x)).join("\n")+"\n";
}

function approval(overrides={}){
  return {
    gate_type:"case_law_source_binding",
    decision_state:"approved",
    reviewed_by:"Human Gate reviewer",
    reviewed_at:"2026-10-20T09:30:00+02:00",
    decision_basis:"Exact official URL and downloaded SHA-256 were reviewed.",
    records:[{
      source_url:"https://www.vrhoven.sud.mk/decision?id=1",
      source_sha256:"a".repeat(64)
    }],
    ...overrides
  };
}

test("source binding review promotes only exact URL and SHA pair",()=>{
  const out=applyCaseLawSourceBindingReview(staged(),approval());
  assert.equal(out.approvedCount,1);
  assert.equal(out.allCasesApproved,true);
  const rows=out.ndjson.trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].discovery_only,false);
  assert.equal(rows[0].binding_required,false);
  assert.equal(rows[1].official_binding_verified,true);
  assert.equal(rows[1].discovery_only,false);
  assert.equal(rows[1].source_binding.human_gate_status,"approved");
  assert.equal(rows[1].source_binding.reviewed_by,"Human Gate reviewer");
  assert.equal(rows[1].production_eligible,false);
});

test("source binding review fails closed on wrong gate or non-approved decision",()=>{
  assert.throws(()=>applyCaseLawSourceBindingReview(staged(),approval({gate_type:"corpus_promotion"})),/gate_type/);
  assert.throws(()=>applyCaseLawSourceBindingReview(staged(),approval({decision_state:"pending"})),/not approved/);
});

test("source binding review rejects approval fingerprint mismatch",()=>{
  const bad=approval();
  bad.records[0].source_sha256="b".repeat(64);
  assert.throws(()=>applyCaseLawSourceBindingReview(staged(),bad),/not present/);
});

test("source binding review never approves records lacking direct retrieval evidence",()=>{
  const rows=staged().trim().split("\n").map(JSON.parse);
  delete rows[1].source_binding;
  const text=rows.map(JSON.stringify).join("\n")+"\n";
  assert.throws(()=>applyCaseLawSourceBindingReview(text,approval()),/lacks direct source_binding evidence/);
});
