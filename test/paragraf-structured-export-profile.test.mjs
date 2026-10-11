import test from "node:test";
import assert from "node:assert/strict";
import { profileStructuredExport } from "../scripts/paragraf-structured-export-profile.mjs";

test("PSEP1 profiles JSON case-law fields without values",()=>{
  const src=JSON.stringify([
    {case_number:"K-1/2025",court:"Court",decision_date:"2025-01-01",full_text:"SECRET"},
    {case_number:"K-2/2025",court:"Court",decision_date:"2025-01-02",full_text:"SECRET2"}
  ]);
  const out=profileStructuredExport("cases.json",src);
  assert.equal(out.format,"json");
  assert.equal(out.record_count,2);
  assert.equal(out.candidate_record_class,"case_law");
  assert.equal(out.record_values_emitted,false);
  assert.ok(!JSON.stringify(out).includes("K-1/2025"));
  assert.ok(!JSON.stringify(out).includes("SECRET"));
});

test("PSEP2 profiles CSV and flags restricted fields",()=>{
  const src="id,email,password_hash,subscription_status\n1,a@example.com,HASH,pro\n";
  const out=profileStructuredExport("users.csv",src);
  assert.equal(out.format,"csv");
  assert.equal(out.record_count,1);
  assert.equal(out.contains_restricted_operational_fields,true);
  assert.equal(out.candidate_record_class,"restricted_operational");
  assert.ok(!JSON.stringify(out).includes("a@example.com"));
  assert.ok(!JSON.stringify(out).includes("HASH"));
});

test("PSEP3 profiles NDJSON legislation fields",()=>{
  const src=[
    JSON.stringify({law_title:"Law A",article_number:"1",body:"X"}),
    JSON.stringify({law_title:"Law B",article_number:"2",body:"Y"})
  ].join("\n")+"\n";
  const out=profileStructuredExport("laws.ndjson",src);
  assert.equal(out.record_count,2);
  assert.equal(out.candidate_record_class,"primary_law");
});

test("PSEP4 profiles XML tag names only",()=>{
  const src="<root><case><case_number>K-1</case_number><court>Test</court></case></root>";
  const out=profileStructuredExport("cases.xml",src);
  assert.equal(out.format,"xml");
  assert.ok(out.fields.includes("case_number"));
  assert.ok(!JSON.stringify(out).includes("K-1"));
});
