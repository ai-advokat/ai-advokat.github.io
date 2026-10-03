import {describe,test} from "node:test";
import assert from "node:assert/strict";
import {validateLegalClaim,authorityLabel} from "../scripts/legal-claim-validator.mjs";

describe("Legal Claim Validator",()=>{
  test("LCV1 accepts a verified primary-law claim",()=>{
    const r=validateLegalClaim({
      claim_type:"current_law",
      risk:"high",
      authority_class:"A1",
      source_identity:"Official Gazette statute",
      version_or_date:"2026-10-03",
      locator:"Article 10",
      verification_state:"verified_current",
      provenance:"official_source_record"
    });
    assert.equal(r.decision,"accept");
    assert.equal(r.current_law_capable,true);
  });

  test("LCV2 rejects AI synthesis as current-law authority",()=>{
    const r=validateLegalClaim({
      claim_type:"current_law",
      risk:"high",
      authority_class:"A6",
      source_identity:"AI generated summary",
      version_or_date:"2026-10-03",
      locator:"n/a",
      verification_state:"verified_current",
      provenance:"ai_output"
    });
    assert.equal(r.decision,"reject");
    assert.equal(r.current_law_capable,false);
    assert.ok(r.reasons.includes("current_law_supported_only_by_ai_synthesis"));
  });

  test("LCV3 downgrades authorial analysis presented as current law",()=>{
    const r=validateLegalClaim({
      claim_type:"current_law",
      risk:"medium",
      authority_class:"A4",
      source_identity:"Author guide",
      version_or_date:"2026-10-03",
      verification_state:"verified_current",
      provenance:"controlled_publication"
    });
    assert.equal(r.decision,"downgrade");
    assert.ok(r.reasons.includes("commentary_cannot_establish_current_law"));
  });

  test("LCV4 rejects missing source identity",()=>{
    const r=validateLegalClaim({
      claim_type:"analysis",
      authority_class:"A5",
      verification_state:"pending_verification",
      provenance:"secondary"
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.reasons.includes("missing_source_identity"));
  });

  test("LCV5 downgrades superseded material used as current law",()=>{
    const r=validateLegalClaim({
      claim_type:"current_law",
      risk:"medium",
      authority_class:"A1",
      source_identity:"Old statute",
      version_or_date:"2005-01-01",
      verification_state:"superseded",
      provenance:"official_archive"
    });
    assert.equal(r.decision,"downgrade");
    assert.ok(r.reasons.includes("superseded_source_presented_as_current"));
  });

  test("LCV6 invented locator is a hard reject",()=>{
    const r=validateLegalClaim({
      claim_type:"analysis",
      authority_class:"A2",
      source_identity:"Court judgment",
      verification_state:"verified_current",
      provenance:"court_database",
      locator_status:"invented"
    });
    assert.equal(r.decision,"reject");
    assert.ok(r.reasons.includes("invented_locator"));
  });

  test("LCV7 ordinary current-law claim without version/date is downgraded",()=>{
    const r=validateLegalClaim({
      claim_type:"current_law",
      risk:"medium",
      authority_class:"A1",
      source_identity:"Official statute",
      verification_state:"verified_current",
      provenance:"official_source_record"
    });
    assert.equal(r.decision,"downgrade");
    assert.equal(r.current_law_capable,false);
    assert.ok(r.reasons.includes("missing_version_or_date_for_current_law"));
  });

  test("LCV8 authority labels are stable",()=>{
    assert.equal(authorityLabel("A1"),"primary_binding_law");
    assert.equal(authorityLabel("A6"),"ai_synthesis");
    assert.equal(authorityLabel("A9"),null);
  });
});
