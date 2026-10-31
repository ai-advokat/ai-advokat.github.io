#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b9"; const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const m=read("manifest.json"),q=read("qc-summary.json"),hashes=read("source-hashes.json"),idx=read("case-key-index.json"),dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse); const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const expected=["107","108","109","112","115","116","117","118","119","120","223","224","225","226","227","228","229","230","231","232"];
const errors=[];const ok=(c,s)=>{if(!c)errors.push(s)};
ok(m.type==="mk_historical_direct_case_law_batch_manifest"&&m.schema_version==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_LAW_V2","manifest:schema");
ok(m.corpus_id==="mk-historical-direct-case-law-2026-10-31-b9"&&m.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:identity");
ok(m.input_file_count===20&&m.canonical_authority_record_count===20&&m.supreme_court_record_count===20,"manifest:counts");
ok(m.judgment_record_count===10&&m.order_record_count===10,"manifest:kinds");
ok(m.cross_batch_case_duplicate_count===0&&m.publication_bound_to_collection_v_count===20&&m.source_metadata_anomaly_count===0,"manifest:provenance");
ok(m.non_contiguous_batch===true&&m.unprovided_entries_not_inferred===true&&JSON.stringify(m.supplied_entry_numbers)===JSON.stringify(expected),"manifest:noncontiguous");
ok(m.production_eligible===false&&m.human_gate_required===true,"manifest:gates");
ok(q.fatal_defects?.length===0&&q.collection_v_bound===20&&q.source_metadata_anomalies===0&&q.judgments===10&&q.orders===10,"qc:clean");
ok(Array.isArray(hashes)&&hashes.length===20,"hashes:count"); const files=new Set();
for(const [i,h] of hashes.entries()){ok(!files.has(h.file),`hash[${i}]:file`);files.add(h.file);ok(/^[a-f0-9]{64}$/.test(h.sha256)&&/^[a-f0-9]{64}$/.test(h.normalized_text_sha256),`hash[${i}]:sha`);ok(String(h.ole_title)===h.file.replace(".doc",""),`hash[${i}]:title`);}
ok(records.length===20,"records:count"); const keys=new Set();let j=0,o=0;
for(const [i,r] of records.entries()){ok(files.has(r.source_file),`record[${i}]:source`);ok(!keys.has(r.case_number_key),`record[${i}]:key`);keys.add(r.case_number_key);ok(r.court.includes("Врховен суд"),`record[${i}]:court`);if(r.authority_kind==="judgment")j++;else if(r.authority_kind==="order")o++;else ok(false,`record[${i}]:kind`);ok(r.publication_binding?.verified===true&&r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996",`record[${i}]:binding`);ok(expected.includes(String(r.publication_binding?.locator)),`record[${i}]:locator`);ok(r.historical_authority===true&&r.current_law_verification_required===true&&r.official_remote_original_binding_verified===false&&r.production_eligible===false&&r.human_gate_required===true,`record[${i}]:gates`);}
ok(j===10&&o===10&&keys.size===20,"records:kinds");ok(idx.records?.length===20,"index:count");ok(dup.cross_batch_case_duplicates?.length===0&&dup.source_metadata_anomalies?.length===0&&dup.unprovided_entries_not_inferred===true,"dup:clean");
const byId=new Map(registry.sources.map(x=>[x.id,x])),archive=byId.get("mk-supreme-court-publication-archive"),coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(archive?.additional_corpus_ids?.includes(m.corpus_id)&&archive?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:archive");
ok(coll?.additional_corpus_ids?.includes(m.corpus_id)&&coll?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:collection");
ok(coll?.historical_current_law_gate===true&&coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:gates");
if(errors.length){console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B9_VALIDATION_FAILED\n"+errors.join("\n"));process.exit(1)}
console.log(JSON.stringify({ok:true,corpusId:m.corpus_id,canonicalRecords:20,judgments:10,orders:10,publicationBound:20,sourceMetadataAnomalies:0,crossBatchDuplicates:0,nonContiguousBatch:true,productionEligible:false,humanGateRequired:true},null,2));
