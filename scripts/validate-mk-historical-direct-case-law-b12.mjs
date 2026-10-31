#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b12";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const m=read("manifest.json"),q=read("qc-summary.json"),hashes=read("source-hashes.json"),idx=read("case-key-index.json"),dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const errors=[]; const ok=(c,s)=>{if(!c)errors.push(s)};
ok(m.corpus_id==="mk-historical-direct-case-law-2026-10-31-b12"&&m.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:identity");
ok(m.input_file_count===20&&m.canonical_authority_record_count===20&&m.case_identifier_count===20,"manifest:counts");
ok(m.supreme_court_record_count===20&&m.commercial_court_record_count===0&&m.judgment_record_count===14&&m.order_record_count===6,"manifest:kinds");
ok(m.cross_batch_case_duplicate_count===0&&m.publication_bound_to_collection_v_count===20&&m.source_metadata_anomaly_count===0&&m.source_text_anomaly_count===0,"manifest:provenance");
ok(m.production_eligible===false&&m.human_gate_required===true,"manifest:gates");
ok(q.fatal_defects?.length===0&&q.canonical_records===20&&q.collection_v_bound===20&&q.source_metadata_anomalies===0&&q.source_text_anomalies===0,"qc:clean");
ok(Array.isArray(hashes)&&hashes.length===20,"hashes:count");
const files=new Set(); for(const [i,h] of hashes.entries()){ok(!files.has(h.file),`hash[${i}]:file`);files.add(h.file);ok(/^[a-f0-9]{64}$/.test(h.sha256)&&/^[a-f0-9]{64}$/.test(h.normalized_text_sha256),`hash[${i}]:sha`);}
ok(records.length===20,"records:count"); let s=0,j=0,o=0; const keys=new Set();
for(const [i,r] of records.entries()){ok(files.has(r.source_file),`record[${i}]:source`);ok(!keys.has(r.case_number_key),`record[${i}]:key`);keys.add(r.case_number_key);if(r.court.includes("Врховен"))s++;else ok(false,`record[${i}]:court`);if(r.authority_kind==="judgment")j++;else if(r.authority_kind==="order")o++;else ok(false,`record[${i}]:kind`);ok(r.publication_binding?.verified===true&&r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996",`record[${i}]:binding`);ok(r.historical_authority===true&&r.current_law_verification_required===true&&r.official_remote_original_binding_verified===false&&r.production_eligible===false&&r.human_gate_required===true,`record[${i}]:gates`);}
ok(s===20&&j===14&&o===6&&keys.size===20,"records:counts");
ok(idx.records?.length===20&&dup.cross_batch_case_duplicates?.length===0&&dup.source_metadata_anomalies?.length===0&&dup.source_text_anomalies?.length===0,"indexes:clean");
ok(m.supplied_entry_numbers.includes("133-A")&&m.supplied_entry_numbers.includes("142-A")&&m.supplied_entry_numbers.includes("142-B")&&!m.supplied_entry_numbers.includes("137")&&!m.supplied_entry_numbers.includes("138"),"manifest:noncontiguous");
const byId=new Map(registry.sources.map(x=>[x.id,x])),archive=byId.get("mk-supreme-court-publication-archive"),coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(archive?.additional_corpus_ids?.includes(m.corpus_id)&&archive?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:archive");
ok(coll?.additional_corpus_ids?.includes(m.corpus_id)&&coll?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:collection");
ok(coll?.historical_current_law_gate===true&&coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:gates");
if(errors.length){console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B12_VALIDATION_FAILED\n"+errors.join("\n"));process.exit(1)}
console.log(JSON.stringify({ok:true,canonicalRecords:20,caseIdentifiers:20,supreme:20,judgments:14,orders:6,publicationBound:20,crossBatchDuplicates:0,productionEligible:false,humanGateRequired:true},null,2));
