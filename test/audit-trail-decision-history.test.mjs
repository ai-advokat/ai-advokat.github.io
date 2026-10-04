import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateAuditHistory,reconstructSubjectState} from "../scripts/audit-trail-history-validator.mjs";

const h=JSON.parse(fs.readFileSync("data/audit-trail-decision-history.json","utf8"));

describe("Audit Trail & Decision History",()=>{
  test("ATH1 governed subjects have unique history records",()=>{
    assert.equal(h.subjects.length,11);
    assert.equal(new Set(h.subjects.map(x=>x.subject_id)).size,11);
  });

  test("ATH2 registry is structurally valid",()=>{
    const r=validateAuditHistory(h);
    assert.equal(r.valid,true,JSON.stringify(r.errors));
  });

  test("ATH3 inheritance reconstructs to author-approved candidate",()=>{
    const x=h.subjects.find(x=>x.subject_id==="inheritance-estate-guide-2025-r1");
    assert.equal(reconstructSubjectState(x),"author_approved_candidate");
    assert.ok(x.events.some(e=>e.event_type==="corrected_candidate_fingerprinted"));
    assert.ok(x.events.some(e=>e.event_type==="human_gate_decision" && e.gate_type==="author_approval"));
  });

  test("ATH4 nine last-set non-inheritance subjects stop at legal-source review",()=>{
    const rest=h.subjects.filter(x=>x.subject_id.startsWith("last-set-"));
    assert.equal(rest.length,9);
    for(const x of rest){
      assert.equal(reconstructSubjectState(x),"legal_source_review");
      assert.equal(x.events.some(e=>e.event_type==="human_gate_decision"),false);
    }
  });

  test("ATH4B Administrative V2 reconstructs to corrected candidate without Human Gate approval",()=>{
    const x=h.subjects.find(x=>x.subject_id==="guide-administrative-v2");
    assert.ok(x);
    assert.equal(reconstructSubjectState(x),"corrected_candidate");
    assert.ok(x.events.some(e=>e.event_type==="legal_source_review_completed"));
    assert.ok(x.events.some(e=>e.event_type==="corrected_candidate_fingerprinted"));
    assert.equal(x.events.some(e=>e.event_type==="human_gate_decision"),false);
  });

  test("ATH5 there are no invented downstream release events",()=>{
    for(const x of h.subjects){
      assert.equal(x.events.some(e=>["public_release","rag_eligibility_change","production_corpus_write"].includes(e.event_type)),false);
    }
  });

  test("ATH6 candidate fingerprints are exact SHA-256 values",()=>{
    const x=h.subjects.find(x=>x.subject_id==="inheritance-estate-guide-2025-r1");
    const e=x.events.find(e=>e.event_type==="corrected_candidate_fingerprinted");
    assert.match(e.artifact_fingerprint.docx_sha256,/^[0-9a-f]{64}$/);
    assert.match(e.artifact_fingerprint.pdf_sha256,/^[0-9a-f]{64}$/);
  });
});
