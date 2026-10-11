import test from "node:test";
import assert from "node:assert/strict";
import { prepareEnerConsolidatedMetadata } from "../scripts/ener-consolidated-meta.mjs";

function sample(overrides={}){
  return {
    source_system:"ENER",
    lane:"consolidated_text_snapshot",
    instrument_key:"mk:test-law",
    instrument_title:"Закон за тест",
    ener_listing_date:"2016-11-03",
    ener_label:"консолидиран текст",
    ener_officialness:"government_hosted_reference",
    source_url:"https://ener.gov.mk/files/test.pdf",
    source_sha256:"a".repeat(64),
    source_issue_number:null,
    source_issue_date:null,
    ...overrides
  };
}

test("ENER1 prepares fail-closed parser metadata",()=>{
  const out=prepareEnerConsolidatedMetadata(sample());
  assert.equal(out.status,"needs_version_review");
  assert.equal(out.human_review_status,"pending");
  assert.equal(out.current_law_authority,false);
  assert.equal(out.official_gazette_binding_required,true);
  assert.match(out.version_id,/^ener-2016-11-03-[a-f0-9]{12}$/);
});

test("ENER2 preserves explicit unofficial label",()=>{
  const out=prepareEnerConsolidatedMetadata(sample({
    ener_label:"консолидиран текст - неофицијална верзија",
    ener_officialness:"explicit_unofficial_version"
  }));
  assert.equal(out.ener_officialness,"explicit_unofficial_version");
  assert.match(out.ener_label,/неофицијална/);
});

test("ENER3 rejects non-ENER or insecure URLs",()=>{
  assert.throws(()=>prepareEnerConsolidatedMetadata(sample({source_url:"https://example.com/x.pdf"})),/ener.gov.mk/);
  assert.throws(()=>prepareEnerConsolidatedMetadata(sample({source_url:"http://ener.gov.mk/x.pdf"})),/HTTPS/);
});

test("ENER4 rejects invalid hashes and dates",()=>{
  assert.throws(()=>prepareEnerConsolidatedMetadata(sample({source_sha256:"abc"})),/64 hex/);
  assert.throws(()=>prepareEnerConsolidatedMetadata(sample({ener_listing_date:"03.11.2016"})),/YYYY-MM-DD/);
});
