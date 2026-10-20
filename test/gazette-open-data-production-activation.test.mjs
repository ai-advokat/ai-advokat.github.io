import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const request=JSON.parse(fs.readFileSync(".github/activation/gazette-open-data-1944-2017-production-request.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/gazette-open-data-1944-2017-production-activation.yml","utf8");

test("GOA1 production activation is exact-scope and Human-Gate bound",()=>{
  assert.equal(request.activation_authorized,true);
  assert.equal(request.decision_id,"AI_ADVOKAT_GAZETTE_OPEN_DATA_1944_2017_METADATA_BACKFILL_2026-10-18");
  assert.deepEqual(request.migrations,[
    "0046_gazette_open_data_1944_2017.sql",
    "0047_gazette_issue_metadata_backfill_1944_2017.sql"
  ]);
  assert.equal(request.human_gate_required,true);
  assert.equal(request.fail_closed,true);
});

test("GOA2 activation authorizes canonical issue metadata only",()=>{
  for(const key of ["production_schema_migration","source_registry_write","rights_overlay_write","canonical_issue_metadata_backfill","bot_issue_metadata_provenance","public_readonly_issue_index"]){
    assert.equal(request.scope[key],true,key);
  }
  for(const key of ["raw_xlsx_backfill","gazette_fulltext_import","legal_corpus_promotion","current_law_promotion","automated_bulk_ingest"]){
    assert.equal(request.scope[key],false,key);
  }
});

test("GOA3 workflow verifies exact snapshot and canonical reconciliation",()=>{
  assert.match(workflow,/4d111eb03ed0b8e877d151e030bf38096831cedc7a26f4a09121d9e6dfac5a18/);
  assert.match(workflow,/source_rows.*8651|source_rows"]==8651/);
  assert.match(workflow,/canonical_unique_rows.*8638|canonical_unique_rows"]==8638/);
  assert.match(workflow,/exact_duplicate_extra_rows.*13|exact_duplicate_extra_rows"]==13/);
  assert.match(workflow,/publication_types.*7|publication_types"]==7/);
  assert.match(workflow,/1944-01-01/);
  assert.match(workflow,/2017-12-29/);
});

test("GOA4 workflow keeps legal authority and current-law authority at zero",()=>{
  assert.match(workflow,/runtime_eligible/);
  assert.match(workflow,/legal_text_authority/);
  assert.match(workflow,/current_law_authority/);
  assert.match(workflow,/"runtime_eligible": 0/);
  assert.match(workflow,/"legal_text_authority": 0/);
  assert.match(workflow,/"current_law_authority": 0/);
  assert.doesNotMatch(workflow,/legal_article_versions\s*\(/i);
  assert.doesNotMatch(workflow,/INSERT\s+INTO\s+gazette_act_articles/i);
});

test("GOA5 workflow promotes through staging and verifies a known official issue",()=>{
  assert.match(workflow,/gazette_issue_metadata_stage/);
  assert.match(workflow,/INSERT INTO gazette_issue_metadata/);
  assert.match(workflow,/duplicate_identity_groups/);
  assert.match(workflow,/issue_number='72' AND year=2016/);
  assert.match(workflow,/2016-04-12/);
});

test("GOA6 live smoke requires 8638 public metadata records and policy remains metadata-only",()=>{
  assert.match(workflow,/\/api\/gazette-issue-index\?q=72%2F2016/);
  assert.match(workflow,/coverage\?\.total!==8638/);
  assert.match(workflow,/officialIssueMetadata!==8638/);
  assert.match(workflow,/ingestStatus!=="metadata_only"/);
  assert.match(workflow,/automatedBulkIngest!==false/);
});


test("GOA7 Gazette activation isolates 0046/0047 and never applies unrelated pending migrations",()=>{
  assert.match(workflow,/\.tmp-gazette-migrations/);
  assert.match(workflow,/migrations_dir="\.tmp-gazette-migrations"|migrations_dir=".tmp-gazette-migrations"|migrations_dir/);
  for(const migration of [
    "0045_case_private_d1_object_store",
    "0048_zkp_commentary_v6_secondary_layer",
    "0049_case_law_binding_extraction_audit"
  ]){
    assert.match(workflow,new RegExp(migration));
  }
  assert.match(workflow,/0045 is pending and explicitly quarantined/);
  assert.match(workflow,/0048 is pending and explicitly quarantined/);
  assert.match(workflow,/0049 is pending and explicitly quarantined/);
  assert.match(workflow,/Apply only Gazette metadata migrations/);
  assert.match(workflow,/SCOPED MIGRATION ISOLATION: PASS/);
  assert.doesNotMatch(workflow,/d1 migrations apply DB --remote --config wrangler\.jsonc \| tee \/tmp\/gazette-open-data-apply\.txt/);
});

test("GOA8 workflow includes both Gazette migration files in path trigger",()=>{
  assert.match(workflow,/migrations\/0046_gazette_open_data_1944_2017\.sql/);
  assert.match(workflow,/migrations\/0047_gazette_issue_metadata_backfill_1944_2017\.sql/);
});
