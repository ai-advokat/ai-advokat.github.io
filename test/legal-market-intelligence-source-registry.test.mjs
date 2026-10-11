import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const reg=JSON.parse(fs.readFileSync("data/legal-market-intelligence-source-registry-2026.json","utf8"));
const profiles=JSON.parse(fs.readFileSync("benchmark/legal-market-intelligence/public-source-profiles-2026-10-11.json","utf8"));

test("LMI1 all legal-market sources are excluded from primary legal authority",()=>{
  for(const s of reg.sources){
    assert.equal(s.legal_answer_eligible,false,s.id);
    assert.equal(s.substantive_legal_claims_require_primary_binding,true,s.id);
  }
});

test("LMI2 rankings and comparative guides remain secondary signals",()=>{
  const ids=new Set(reg.sources.map(x=>x.id));
  for(const id of ["chambers-and-partners","legal-500","iflr","martindale","cee-legal-matters"]) assert.ok(ids.has(id),id);
  assert.ok(reg.doctrine.includes("rankings_are_secondary_signals_not_quality_guarantees"));
  assert.ok(reg.doctrine.includes("comparative_guides_require_primary_law_verification"));
});

test("LMI3 identity-only sources do not gain inferred capabilities",()=>{
  for(const id of ["martindale","cee-legal-matters"]){
    const p=profiles.sources.find(x=>x.id===id);
    assert.equal(p.capabilities_verified,false,id);
    assert.match(p.evidence_scope,/logo supplied only/i,id);
  }
});

test("LMI4 IFLR sponsored content is explicitly separated",()=>{
  const p=profiles.sources.find(x=>x.id==="iflr");
  assert.equal(p.sponsored_content_present,true);
  assert.match(p.sponsored_content_rule,/cannot support independent ranking or legal-authority claims/i);
});

test("LMI5 duplicate Legal 500 capture is retained once",()=>{
  const rows=profiles.sources.filter(x=>x.id==="legal-500");
  assert.equal(rows.length,1);
  assert.match(rows[0].duplicate_capture_note,/supplied twice/i);
});
