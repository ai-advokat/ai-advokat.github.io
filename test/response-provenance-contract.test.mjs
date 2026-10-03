import {describe,test} from "node:test";
import assert from "node:assert/strict";
import {validateResponseProvenance} from "../scripts/response-provenance-validator.mjs";

describe("Response Provenance Contract",()=>{
  test("RPC1 accepts a fully traced and human-approved response",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-1",
      generated_at:"2026-10-03T21:00:00+02:00",
      overall_verification_state:"verified",
      claims:[{
        claim_id:"c1",
        text:"Example current-law proposition",
        claim_type:"current_law",
        risk:"high",
        authority_class:"A1",
        source_identity:"Official statute",
        source_version_or_date:"2026-10-03",
        locator:"Article 10",
        verification_state:"verified_current",
        provenance:"official-source-record",
        response_label:"verified_current_law"
      }],
      human_control:{
        human_review_required:true,
        human_review_state:"approved",
        release_decision:"authorized_for_release"
      }
    });
    assert.equal(r.decision,"accept");
    assert.equal(r.releasable,true);
  });

  test("RPC2 rejects AI synthesis used as current-law authority",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-2",
      generated_at:"2026-10-03",
      overall_verification_state:"verified",
      claims:[{
        claim_id:"c1",text:"x",claim_type:"current_law",authority_class:"A6",
        source_identity:"AI output",source_version_or_date:"2026-10-03",locator:"n/a",
        verification_state:"verified_current",provenance:"ai",response_label:"ai_synthesis"
      }],
      human_control:{human_review_required:true,human_review_state:"approved",release_decision:"authorized_for_release"}
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.errors.some(x=>x.includes("ai_synthesis_cannot_support_current_law")));
  });

  test("RPC3 rejects blanket verified state over mixed claims",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-3",
      generated_at:"2026-10-03",
      overall_verification_state:"verified",
      claims:[{
        claim_id:"c1",text:"analysis",claim_type:"analysis",authority_class:"A4",
        source_identity:"Author paper",source_version_or_date:"2026",locator:"p. 5",
        verification_state:"pending_verification",provenance:"controlled-paper",response_label:"authorial_analysis"
      }],
      human_control:{human_review_required:true,human_review_state:"not_reviewed",release_decision:"not_authorized"}
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.errors.includes("mixed_or_unverified_claims_hidden_by_verified_overall_state"));
  });

  test("RPC4 release requires explicit human approval",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-4",
      generated_at:"2026-10-03",
      overall_verification_state:"verified",
      claims:[{
        claim_id:"c1",text:"x",claim_type:"analysis",authority_class:"A4",
        source_identity:"Author source",source_version_or_date:"2026",locator:"p.1",
        verification_state:"verified_current",provenance:"record",response_label:"authorial_analysis"
      }],
      human_control:{human_review_required:true,human_review_state:"reviewed",release_decision:"authorized_for_release"}
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.errors.includes("release_without_human_approval"));
  });

  test("RPC5 current-law response without source version/date is rejected",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-5",
      generated_at:"2026-10-03",
      overall_verification_state:"verified",
      claims:[{
        claim_id:"c1",text:"x",claim_type:"current_law",risk:"medium",authority_class:"A1",
        source_identity:"Official statute",locator:"Article 1",
        verification_state:"verified_current",provenance:"official",response_label:"verified_current_law"
      }],
      human_control:{human_review_required:true,human_review_state:"approved",release_decision:"authorized_for_release"}
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.errors.some(x=>x.includes("missing_version_or_date")));
  });

  test("RPC6 missing human control blocks response release",()=>{
    const r=validateResponseProvenance({
      response_id:"resp-5",generated_at:"2026-10-03",overall_verification_state:"mixed",claims:[]
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.errors.includes("missing_human_control"));
    assert.equal(r.releasable,false);
  });
});
