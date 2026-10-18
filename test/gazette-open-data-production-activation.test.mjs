import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const request=JSON.parse(fs.readFileSync(".github/activation/gazette-open-data-1944-2017-production-request.json","utf8"));
const workflow=fs.readFileSync(".github/workflows/gazette-open-data-1944-2017-production-activation.yml","utf8");

test("GOA1 production activation is exact-scope and Human-Gate bound",()=>{
  assert.equal(request.activation_authorized,true);
  assert.equal(request.decision_id,"AI_ADVOKAT_GAZETTE_OPEN_DATA_1944_2017_PRODUCTION_ACTIVATION_2026-10-18");
  assert.deepEqual(request.migrations,["0046_gazette_open_data_1944_2017.sql"]);
  assert.equal(request.human_gate_required,true);
  assert.equal(request.fail_closed,true);
});

test("GOA2 activation authorizes metadata provenance only, never raw/fulltext/current-law promotion",()=>{
  assert.equal(request.scope.production_schema_migration,true);
  assert.equal(request.scope.source_registry_write,true);
  assert.equal(request.scope.rights_overlay_write,true);
  for(const key of ["raw_xlsx_backfill","gazette_fulltext_import","legal_corpus_promotion","current_law_promotion","automated_bulk_ingest"]){
    assert.equal(request.scope[key],false,key);
  }
});

test("GOA3 workflow targets exact production D1 and applies only migration 0046",()=>{
  assert.match(workflow,/environment: production/);
  assert.match(workflow,/12ece285-74bb-4f27-a025-2dbd1be6c59a/);
  assert.match(workflow,/0046_gazette_open_data_1944_2017\.sql/);
  assert.match(workflow,/Unexpected pending migrations/);
  assert.match(workflow,/d1 migrations apply DB --remote/);
});

test("GOA4 workflow verifies metadata-only rights state and live runtime policy",()=>{
  assert.match(workflow,/official_gazette_issue_metadata/);
  assert.match(workflow,/mk-official-gazette-data-gov-2017/);
  assert.match(workflow,/ingest_status/);
  assert.match(workflow,/metadata_only/);
  assert.match(workflow,/automated_bulk_ingest/);
  assert.match(workflow,/sourceCount!==16/);
});

test("GOA5 workflow never imports the uploaded XLSX or promotes legal content",()=>{
  assert.doesNotMatch(workflow,/izdanija-sluzben-vesnik-do-2017\.xlsx[^\n]*--file/);
  assert.doesNotMatch(workflow,/INSERT INTO gazette_issues/i);
  assert.doesNotMatch(workflow,/legal_article_versions/i);
  assert.doesNotMatch(workflow,/gazette_act_articles/i);
});
