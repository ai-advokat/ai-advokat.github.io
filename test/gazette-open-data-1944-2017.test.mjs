import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const manifest=JSON.parse(fs.readFileSync("data/gazette-open-data-issues-1944-2017.json","utf8"));
const coverage=JSON.parse(fs.readFileSync("data/gazette-coverage-manifest.json","utf8"));
const registry=JSON.parse(fs.readFileSync("data/open-legal-sources-registry-2026.json","utf8"));
const migration=fs.readFileSync("migrations/0046_gazette_open_data_1944_2017.sql","utf8");

test("GOD1 official data.gov.mk Gazette dataset is registered with exact identity",()=>{
  assert.equal(manifest.dataset.dataset_id,"05342c32-f4a6-49c3-b8fa-5a555a6df6ff");
  assert.equal(manifest.resource.resource_id,"9a039791-1abb-411f-bc04-bf136776a83a");
  assert.equal(manifest.dataset.publisher,"ЈП Службен весник на РСМ");
  assert.equal(manifest.resource.format,"XLSX");
  assert.equal(manifest.resource.validation_status,"success");
});

test("GOD2 observed spreadsheet coverage is explicit and auditable",()=>{
  assert.equal(manifest.coverage.years_from,1944);
  assert.equal(manifest.coverage.years_through,2017);
  assert.equal(manifest.coverage.years_count,74);
  assert.equal(manifest.coverage.source_rows,8651);
  assert.equal(manifest.coverage.exact_duplicate_groups,13);
  assert.equal(manifest.coverage.exact_duplicate_extra_rows,13);
  assert.equal(manifest.coverage.canonical_unique_rows_after_exact_dedupe,8638);
  assert.equal(Object.keys(manifest.publication_types).length,7);
  assert.equal(Object.keys(manifest.year_counts).length,74);
  assert.equal(manifest.year_counts["1944"],1);
  assert.equal(manifest.year_counts["2017"],198);
});

test("GOD3 canonical deduplication is deterministic and does not silently erase source counts",()=>{
  assert.deepEqual(manifest.canonical_deduplication.key,["publication_type","issue_number","issue_date"]);
  assert.equal(manifest.canonical_deduplication.raw_row_count_preserved_for_reconciliation,true);
  assert.equal(manifest.duplicate_examples.length,13);
});

test("GOD4 issue metadata never becomes legal text or current-law authority",()=>{
  assert.equal(manifest.legal_text_authority,false);
  assert.equal(manifest.current_law_authority,false);
  assert.equal(manifest.rights_and_release.ingest_status,"metadata_only");
  assert.equal(manifest.rights_and_release.automated_bulk_ingest,false);
  assert.ok(manifest.rights_and_release.forbidden.includes("treating_issue_metadata_as_legal_text"));
  assert.ok(manifest.rights_and_release.forbidden.includes("treating_issue_metadata_as_current_law"));
  assert.match(manifest.canonical_rule,/require separate official source binding and Human Gate/i);
});

test("GOD5 Gazette coverage uses data.gov.mk as 1944-2017 issue backbone but still requires act reconciliation",()=>{
  const source=coverage.official_sources.find(x=>x.kind==="data_gov_official_issue_metadata");
  assert.ok(source);
  assert.equal(source.verified_range,"1944-2017");
  assert.equal(source.source_rows,8651);
  assert.equal(source.legal_text_authority,false);
  assert.ok(coverage.eras.some(x=>x.from===1944 && /data_gov/.test(x.method)));
  assert.ok(coverage.eras.some(x=>x.from===2003 && x.to===2017 && /act_reconciliation/.test(x.status)));
  assert.equal(coverage.publication_policy.official_issue_metadata_is_not_legal_text,true);
});

test("GOD6 Open Legal Sources registry keeps licensing contradiction fail-closed",()=>{
  const source=registry.sources.find(x=>x.id==="mk-official-gazette-data-gov-2017");
  assert.ok(source);
  assert.equal(source.authority_status,"primary_official");
  assert.equal(source.ingest_status,"metadata_only");
  assert.equal(source.reuse_status,"terms_review_required");
  assert.equal(source.automated_bulk_ingest,false);
  assert.match(source.rights_evidence_note,/isopen=true/);
  assert.match(source.rights_evidence_note,/License not open/);
});

test("GOD7 D1 migration registers source and rights overlay without importing full text",()=>{
  assert.match(migration,/official_gazette_issue_metadata/);
  assert.match(migration,/mk-official-gazette-data-gov-2017/);
  assert.match(migration,/metadata_only/);
  assert.match(migration,/does NOT import Gazette full text/i);
  assert.match(migration,/VALUES \('46'/);
});
