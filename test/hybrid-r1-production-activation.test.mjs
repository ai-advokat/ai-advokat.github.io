import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Hybrid R1 production activation is bounded to migration 0052 and exact production target",()=>{
  const y=fs.readFileSync(".github/workflows/hybrid-r1-production-activation.yml","utf8");
  assert.match(y,/0052_hybrid_legal_intelligence_r1\.sql/);
  assert.match(y,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(y,/migration_count!==52/);
  assert.match(y,/npx wrangler d1 migrations apply DB --remote --config wrangler\.jsonc/);
  assert.match(y,/Unexpected pending migration set/);
  assert.match(y,/0045_case_private_d1_object_store\.sql/);
  assert.match(y,/0048_zkp_commentary_v6_secondary_layer\.sql/);
  assert.match(y,/0049_case_law_binding_extraction_audit\.sql/);
  assert.match(y,/UNRELATED PENDING MIGRATIONS PRESERVED/);
  assert.match(y,/api\/hybrid\/capabilities/);
  assert.match(y,/autonomousCurrentLawPromotion!==false/);
  assert.match(y,/CURRENT-LAW AUTHORITY PROMOTION: HUMAN GATE REQUIRED/);
});

test("Hybrid R1 production activation remains idempotent, isolated and evidence-producing",()=>{
  const y=fs.readFileSync(".github/workflows/hybrid-r1-production-activation.yml","utf8");
  assert.match(y,/0052 already applied; idempotent activation continues/);
  assert.match(y,/hybrid-held-migrations/);
  assert.match(y,/test "\$isolated" = "0052_hybrid_legal_intelligence_r1\.sql"/);
  assert.match(y,/hybrid-r1-production-activation/);
  assert.match(y,/retention-days: 30/);
  assert.doesNotMatch(y,/DELETE\s+FROM|DROP\s+TABLE|TRUNCATE\s+/i);
});
