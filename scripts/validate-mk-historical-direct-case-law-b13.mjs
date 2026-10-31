#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b13";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const m=read("manifest.json");
const q=read("qc-summary.json");
const hashes=read("source-hashes.json");
const idx=read("case-key-index.json");
const dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const b5=JSON.parse(fs.readFileSync("data/case-law/mk-historical-direct-case-law-2026-10-31-b5/case-key-index.json","utf8"));
const b10=JSON.parse(fs.readFileSync("data/case-law/mk-historical-direct-case-law-2026-10-31-b10/case-key-index.json","utf8"));

const errors=[];
const ok=(c,s)=>{if(!c) errors.push(s);};

ok(m.corpus_id==="mk-historical-direct-case-law-2026-10-31-b13"&&m.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:identity");
ok(m.input_file_count===20&&m.canonical_authority_record_count===19&&m.supreme_decision_or_headnote_record_count===18&&m.general_session_principled_stance_count===1,"manifest:counts");
ok(m.judgment_record_count===9&&m.order_record_count===8&&m.compound_judgment_headnote_count===1&&m.case_identifier_count===19,"manifest:kinds");
ok(m.cross_batch_authority_duplicate_count===1&&m.cross_batch_case_identifier_conflict_count===1&&m.source_metadata_anomaly_count===2&&m.publication_locator_conflict_count===2&&m.source_text_anomaly_count===1,"manifest:controlled-anomalies");
ok(m.canonical_records_bound_to_collection_v_count===19&&m.input_files_bound_to_collection_v_count===20,"manifest:binding");
ok(m.production_eligible===false&&m.human_gate_required===true,"manifest:gates");

ok(q.fatal_defects?.length===0&&q.canonical_records===19&&q.case_identifiers===19&&q.collection_v_bound_canonical_records===19,"qc:counts");
ok(Array.isArray(hashes)&&hashes.length===20,"hashes:count");
const files=new Set();
for(const [i,h] of hashes.entries()){
  ok(!files.has(h.file),`hash[${i}]:file`);
  files.add(h.file);
  ok(/^[a-f0-9]{64}$/.test(h.sha256)&&/^[a-f0-9]{64}$/.test(h.normalized_text_sha256),`hash[${i}]:sha`);
}

ok(records.length===19,"records:count");
let judgments=0,orders=0,compoundCount=0,stanceCount=0;
const caseIds=[];
for(const [i,r] of records.entries()){
  ok(files.has(r.source_file),`record[${i}]:source`);
  if(r.authority_kind==="judgment") judgments++;
  else if(r.authority_kind==="order") orders++;
  else if(r.authority_kind==="judgment_headnote_multiple_cases") compoundCount++;
  else if(r.authority_kind==="principled_stance") stanceCount++;
  else ok(false,`record[${i}]:kind`);
  for(const k of (r.case_number_keys||[r.case_number_key]).filter(Boolean)) caseIds.push(k);
  ok(r.publication_binding?.verified===true&&r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996",`record[${i}]:binding`);
  ok(r.historical_authority===true&&r.current_law_verification_required===true&&r.official_remote_original_binding_verified===false&&r.production_eligible===false&&r.human_gate_required===true,`record[${i}]:gates`);
}
ok(judgments===9&&orders===8&&compoundCount===1&&stanceCount===1,"records:kinds");
ok(caseIds.length===19&&new Set(caseIds).size===19,"records:case-identifiers");
ok(!caseIds.includes("REV-700/1994"),"duplicate:not-canonicalized");
ok(caseIds.includes("REV-624/1993"),"conflict:case-id-preserved");
ok(idx.records?.length===19,"index:count");

ok(dup.cross_batch_authority_duplicates?.length===1&&dup.cross_batch_authority_duplicates[0].existing_record_id==="B5-REV-700/1994","duplicate:controlled");
ok(dup.cross_batch_case_identifier_conflicts?.length===1&&dup.cross_batch_case_identifier_conflicts[0].existing_record_id==="B10-REV-624/1993","conflict:controlled");
ok(dup.source_metadata_anomalies?.length===2&&dup.publication_locator_conflicts?.length===2&&dup.source_text_anomalies?.length===1,"anomalies:controlled");
ok(b5.records.some(x=>x.case_number_key==="REV-700/1994"&&x.record_id==="B5-REV-700/1994"),"b5:duplicate-origin");
ok(b10.records.some(x=>x.case_number_key==="REV-624/1993"&&x.record_id==="B10-REV-624/1993"),"b10:conflict-origin");

const compound=records.find(x=>x.record_id==="B13-COLLV-156-REV-623-624-1993");
ok(compound?.case_number_keys?.includes("REV-623/1993")&&compound?.case_number_keys?.includes("REV-624/1993"),"compound:ids");
const stance=records.find(x=>x.authority_kind==="principled_stance");
ok(stance?.decision_date==="26.12.1994"&&stance?.publication_binding?.locator?.collection_item_number==="6","stance:binding");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const archive=byId.get("mk-supreme-court-publication-archive");
const coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(archive?.additional_corpus_ids?.includes(m.corpus_id)&&archive?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:archive");
ok(coll?.additional_corpus_ids?.includes(m.corpus_id)&&coll?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:collection");
ok(coll?.historical_current_law_gate===true&&coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:gates");

if(errors.length){
  console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B13_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,canonicalRecords:19,decisionOrHeadnoteRecords:18,principledStances:1,caseIdentifiers:19,judgments:9,orders:8,compoundHeadnotes:1,authorityDuplicates:1,caseIdentifierConflicts:1,sourceMetadataAnomalies:2,publicationLocatorConflicts:2,sourceTextAnomalies:1,productionEligible:false,humanGateRequired:true},null,2));
