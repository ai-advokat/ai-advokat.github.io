import test from "node:test";
import assert from "node:assert/strict";
import { bridgeParagrafCaseLaw } from "../scripts/paragraf-case-law-bridge.mjs";
import { applyCaseLawEvidenceGateReview } from "../scripts/apply-case-law-evidence-gate-review.mjs";

const SHA="b".repeat(64);
function bridged(){
  const input=[
    {
      type:"ai_advokat_paragraf_normalized_manifest",
      run_id:"zip-gate-test",
      authorized_export:true,
      production_eligible:false,
      human_gate_required:true,
      source_provider:"Paragraf.mk",
      source_product:"Lex",
      license_or_access_basis:"authorized test export"
    },
    {
      type:"doc",
      corpus_role:"case_law",
      legacy_id:"P1",
      title:"Test case",
      jurisdiction:"MK",
      source_url:"https://paragraf.mk/",
      source_sha256:SHA,
      metadata_json:JSON.stringify({
        case_number:"КВП-1/26",
        court:"Врховен суд",
        domestic_articles:"ЗКП чл. 1"
      })
    }
  ].map(JSON.stringify).join("\n")+"\n";
  return bridgeParagrafCaseLaw(input);
}

test("Paragraf ZIP-derived record enters canonical staging, never authority",()=>{
  const out=bridged();
  assert.equal(out.cases.length,1);
  assert.equal(out.cases[0].migration_state,"STAGED_NEEDS_SOURCE_MATCH");
  assert.equal(out.cases[0].evidence_gate.productionCitable,false);
  assert.equal(out.manifest.discovery_only,true);
});

function officialStage(){
  const rows=[
    {
      type:"case_law_manifest",
      run_id:"official-evidence-test",
      source_class:"official_public",
      discovery_only:true,
      production_eligible:false,
      human_gate_required:true
    },
    {
      type:"case_law_case",
      case_key:"official:1",
      case_title:"Test",
      court:"Врховен суд",
      case_number:"КВП-1/26",
      source_status:"official",
      source_url:"https://www.vrhoven.sud.mk/decision/1",
      source_sha256:"a".repeat(64),
      official_binding_verified:true,
      remote_content_hash_verified:true,
      human_review_status:"reviewed",
      source_binding:{official_binding_verified:true}
    }
  ];
  return rows.map(JSON.stringify).join("\n")+"\n";
}

function review(release=false){
  return {
    gate_type:"case_law_evidence_review",
    decision_state:"approved",
    reviewed_by:"Independent legal reviewer",
    reviewed_at:"2026-11-08T18:00:00+01:00",
    decision_basis:"Full boundary, temporal, legal and authority evidence reviewed.",
    records:[{
      case_key:"official:1",
      boundary:{
        start_page:1,start_y_pt:100,end_page:2,end_y_pt:600,
        reviewer_1_approved:true,reviewer_2_approved:true,
        attribution_verified:true,complete_unit_verified:true,
        warning_flags:[],warning_disposition:"NO_PRIOR_AUTOMATED_WARNING"
      },
      temporal:{
        article_text_verified:true,historical_law_required:false,
        historical_authentic_gazette_verified:false,transitional_rules_verified:false,
        current_applicability_verified:true,contrary_authority_checked:true
      },
      legal_review:{status:"reviewed"},
      authority_review:{status:"reviewed"},
      holding_review:{status:"reviewed"},
      release:{publication_approved:release,human_gate_approved:release},
      reviewer_evidence_reference:"review-pack-001",
      reviewer_notes:"Verified."
    }]
  };
}

test("evidence review without final release creates reviewed authority candidate only",()=>{
  const out=applyCaseLawEvidenceGateReview(officialStage(),review(false));
  const rows=out.ndjson.trim().split("\n").map(JSON.parse);
  assert.equal(rows[1].migration_state,"REVIEWED_AUTHORITY_CANDIDATE");
  assert.equal(rows[1].production_eligible,false);
  assert.equal(rows[1].discovery_only,true);
  assert.equal(out.productionCitable,0);
});

test("final Human Gate can produce production-citable authority only after all gates pass",()=>{
  const out=applyCaseLawEvidenceGateReview(officialStage(),review(true));
  const rows=out.ndjson.trim().split("\n").map(JSON.parse);
  assert.equal(rows[1].migration_state,"PRODUCTION_CITABLE_AUTHORITY");
  assert.equal(rows[1].production_eligible,true);
  assert.equal(rows[1].discovery_only,false);
  assert.equal(out.productionCitable,1);
});

test("premature publication approval fails closed",()=>{
  const r=review(true);
  r.records[0].temporal.current_applicability_verified=false;
  assert.throws(()=>applyCaseLawEvidenceGateReview(officialStage(),r),/before all evidence gates passed/);
});

test("missing second boundary reviewer cannot be released",()=>{
  const r=review(true);
  r.records[0].boundary.reviewer_2_approved=false;
  assert.throws(()=>applyCaseLawEvidenceGateReview(officialStage(),r),/before all evidence gates passed/);
});
