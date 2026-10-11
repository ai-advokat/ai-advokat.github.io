import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const reg=JSON.parse(fs.readFileSync("data/access-to-justice-provider-source-registry-2026.json","utf8"));
const profiles=JSON.parse(fs.readFileSync("benchmark/access-to-justice/public-source-profiles-2026-10-11.json","utf8"));

test("ATJ1 provider and legal-aid sources never become primary legal authority",()=>{
  for(const s of reg.sources) assert.equal(s.legal_answer_eligible,false,s.id);
});

test("ATJ2 contaminated lawyer directory is quarantined and cannot refer",()=>{
  const s=profiles.sources.find(x=>x.id==="najdi-advokat");
  assert.equal(s.content_integrity_state,"quarantined");
  assert.equal(s.referral_eligible,false);
  assert.equal(s.automated_ingest_allowed,false);
  assert.ok(s.quarantine_reasons.some(x=>/casino/i.test(x)));
});

test("ATJ3 MYLA is provider discovery and secondary professional information only",()=>{
  const s=profiles.sources.find(x=>x.id==="myla");
  assert.equal(s.provider_discovery_eligible,true);
  assert.equal(s.legal_answer_eligible,false);
  assert.equal(s.substantive_legal_claims_require_primary_binding,true);
});

test("ATJ4 Library of Congress guide is source discovery, not endorsement",()=>{
  const s=profiles.sources.find(x=>x.id==="loc-guide-law-north-macedonia");
  assert.equal(s.source_class,"official_research_directory");
  assert.equal(s.inclusion_is_endorsement,false);
  assert.equal(s.legal_answer_eligible,false);
});

test("ATJ5 legal-aid portal service categories do not replace current-law verification",()=>{
  const s=profiles.sources.find(x=>x.id==="pravnapomos-mk");
  assert.equal(s.provider_discovery_eligible,true);
  assert.equal(s.eligibility_and_rights_require_primary_law_verification,true);
  assert.equal(s.ownership_verification_required,true);
});

test("ATJ6 provider activation remains Human Gate controlled",()=>{
  assert.ok(reg.doctrine.includes("provider_activation_requires_human_gate"));
  assert.ok(reg.doctrine.includes("personal_data_minimisation"));
});
