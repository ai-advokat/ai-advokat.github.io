import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function readNdjson(path){
  return fs.readFileSync(path,"utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

const samples=readNdjson("corpus/mk/case-law/judicial-portal-sample-records-2026-10-11.ndjson");
const context=readNdjson("corpus/mk/case-law/judicial-portal-context-index-2026-10-11.ndjson");
const snapshot=JSON.parse(fs.readFileSync("corpus/mk/case-law/judicial-portal-search-snapshot-2026-10-11.json","utf8"));

test("JP1 search snippets are discovery-only until exact official document binding",()=>{
  assert.equal(samples.length,10);
  for(const row of samples){
    assert.equal(row.search_snippet_only,true,row.chunk_id);
    assert.equal(row.case_law_authority,false,row.chunk_id);
    assert.equal(row.official_binding_verified,false,row.chunk_id);
    assert.equal(row.needs_full_text_fetch,true,row.chunk_id);
    assert.ok(row.source_url,row.chunk_id);
  }
});

test("JP2 hearing minutes cannot be promoted to case-law authority",()=>{
  const minutes=samples.find(x=>x.record_kind==="hearing_minutes");
  assert.ok(minutes);
  assert.equal(minutes.record_can_be_case_law,false);
  assert.equal(minutes.case_law_authority,false);
});

test("JP3 display/internal date conflicts remain explicit",()=>{
  const conflicts=samples.filter(x=>x.date_conflict_status);
  assert.ok(conflicts.length>=2);
  for(const row of conflicts){
    assert.notEqual(row.displayed_decision_date,row.internal_document_date||row.internal_session_date);
  }
});

test("JP4 unresolved context permalinks fail closed instead of fetching the homepage",()=>{
  for(const row of context){
    assert.equal(row.durable_item_url_status,"unresolved",row.chunk_id);
    assert.equal(row.needs_full_text_fetch,false,row.chunk_id);
    assert.equal(row.follow_up_discovery_required,true,row.chunk_id);
  }
});

test("JP5 portal result count is explicitly a UI snapshot, not a judgment-count claim",()=>{
  assert.equal(snapshot.displayed_result_count,899778);
  assert.match(snapshot.result_count_rule,/not a verified count of final judgments/i);
});
