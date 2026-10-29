import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const wf=fs.readFileSync(".github/workflows/zkp-metadata-correction-staging.yml","utf8");
const sql=fs.readFileSync("migrations/0036_zkp_entry_application_metadata_correction.sql","utf8");
const req=JSON.parse(fs.readFileSync(".github/activation/zkp-metadata-correction-staging-2026-10-12.json","utf8"));

test("ZKPMC1 activation is staging-only and forbids promotion/text mutation",()=>{
  assert.equal(req.environment,"staging");
  assert.equal(req.production_write_authorized,false);
  assert.equal(req.article_text_mutation_authorized,false);
  assert.equal(req.current_law_promotion_authorized,false);
  assert.equal(req.human_gate_mutation_authorized,false);
});

test("ZKPMC2 legacy staging migration workflow is HG2-C locked",()=>{
  assert.match(wf,/\[HG2-C LOCKED\]/);
  assert.match(wf,/workflow_dispatch:/);
  assert.match(wf,/exit 2/);
  assert.doesNotMatch(wf,/--file\s+migrations\/0036_/);
  assert.doesNotMatch(wf,/d1 execute/);
  assert.doesNotMatch(wf,/--remote/);
  assert.doesNotMatch(wf,/CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|secrets\./);
});

test("ZKPMC3 migration changes metadata only and preserves current/Human Gate",()=>{
  assert.match(sql,/effective_date='2010-11-26'/);
  assert.match(sql,/valid_from='2018-10-31'/);
  assert.doesNotMatch(sql,/UPDATE\s+legal_article_versions/i);
  assert.doesNotMatch(sql,/SET\s+is_current\s*=\s*1/i);
  assert.doesNotMatch(sql,/human_review_status\s*=\s*'approved'/i);
  assert.doesNotMatch(sql,/current_status\s*=\s*'active'/i);
});

test("ZKPMC4 locked workflow cannot touch production or staging data before HG2-C",()=>{
  assert.doesNotMatch(wf,/ai-advokat-db/);
  assert.doesNotMatch(wf,/PREVIEW_DB/);
  assert.doesNotMatch(wf,/wrangler deploy/);
  assert.doesNotMatch(wf,/migrations\s+apply/);
  assert.doesNotMatch(wf,/\b(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i);
});
