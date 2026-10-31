#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b6";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const m=read("manifest.json");
const q=read("qc-summary.json");
const hashes=read("source-hashes.json");
const index=read("case-key-index.json");
const dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const errors=[]; const ok=(c,s)=>{if(!c) errors.push(s)};

ok(m.type==="mk_historical_direct_case_law_batch_manifest","manifest:type");
ok(m.schema_version==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_LAW_V2","manifest:schema");
ok(m.corpus_id==="mk-historical-direct-case-law-2026-10-31-b6","manifest:corpus");
ok(m.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(m.input_file_count===20&&m.canonical_authority_record_count===20,"manifest:counts");
ok(m.supreme_judgment_record_count===14&&m.supreme_order_record_count===6,"manifest:types");
ok(m.cross_batch_case_duplicate_count===0,"manifest:duplicates");
ok(m.publication_bound_to_collection_v_count===20,"manifest:binding");
ok(m.source_metadata_anomaly_count===1,"manifest:anomaly");
ok(m.production_eligible===false&&m.human_gate_required===true,"manifest:gates");

ok(q.input_files===20&&q.canonical_records===20,"qc:counts");
ok(q.judgments===14&&q.orders===6,"qc:types");
ok(q.collection_v_bound===20&&q.cross_batch_case_duplicates===0,"qc:provenance");
ok(q.source_metadata_anomalies===1,"qc:anomaly");
ok(q.fatal_defects?.length===0,"qc:fatal");
ok(q.production_eligible===false&&q.human_gate_required===true,"qc:gates");

ok(Array.isArray(hashes)&&hashes.length===20,"hashes:count");
const files=new Set();
for(const [i,h] of hashes.entries()){
  ok(typeof h.file==="string"&&!files.has(h.file),`hash[${i}]:file`); files.add(h.file);
  ok(/^[a-f0-9]{64}$/.test(h.sha256),`hash[${i}]:source`);
  ok(/^[a-f0-9]{64}$/.test(h.normalized_text_sha256),`hash[${i}]:text`);
  ok(Number.isInteger(h.size_bytes)&&h.size_bytes>0,`hash[${i}]:size`);
}

ok(records.length===20,"records:count");
const ids=new Set(), keys=new Set(); let judgments=0,orders=0,anomalies=0;
for(const [i,r] of records.entries()){
  const tag=`record[${i}]`;
  ok(!ids.has(r.record_id),`${tag}:duplicate_id`); ids.add(r.record_id);
  ok(files.has(r.source_file),`${tag}:source_file`);
  ok(/^[a-f0-9]{64}$/.test(r.source_file_sha256),`${tag}:source_hash`);
  ok(/^[a-f0-9]{64}$/.test(r.normalized_text_sha256),`${tag}:text_hash`);
  ok(typeof r.case_number_key==="string"&&!keys.has(r.case_number_key),`${tag}:case_key`); keys.add(r.case_number_key);
  ok(typeof r.decision_date==="string"&&r.decision_date.length===10,`${tag}:date`);
  ok(Array.isArray(r.topics_mk)&&r.topics_mk.length>=3,`${tag}:topics`);
  ok(r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996",`${tag}:collection`);
  ok(r.publication_binding?.verified===true,`${tag}:publication_verified`);
  ok(r.publication_binding?.collection_pdf_sha256==="89eff6a56a156ad7c722bcee5af6b8748f2100e90158b8a36dff0cb782a24c78",`${tag}:collection_hash`);
  ok(r.historical_authority===true&&r.current_law_verification_required===true,`${tag}:historical_gate`);
  ok(r.official_remote_original_binding_verified===false,`${tag}:remote_binding`);
  ok(r.production_eligible===false&&r.human_gate_required===true,`${tag}:gates`);
  ok(r.privacy_minimisation===true,`${tag}:privacy`);
  if(r.authority_kind==="judgment") judgments++; else if(r.authority_kind==="order") orders++; else ok(false,`${tag}:kind`);
  if(r.source_metadata_anomaly) anomalies++;
}
ok(judgments===14&&orders===6,"records:type_counts");
ok(keys.size===20,"records:unique_keys");
ok(anomalies===1,"records:anomaly_count");
const r63=records.find(r=>r.source_file==="63.doc");
ok(r63?.case_number_key==="REV-1334/1994","records:63_identity");
ok(r63?.source_metadata_anomaly?.observed==="64-A","records:63_metadata_conflict");

ok(index.schema==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_KEY_INDEX_V2","index:schema");
ok(index.corpus_id===m.corpus_id&&index.records?.length===20,"index:count");
ok(index.records.every(r=>r.production_eligible===false&&r.human_gate_required===true),"index:gates");

ok(dup.cross_batch_case_duplicates?.length===0,"duplicates:cross");
ok(dup.within_batch_duplicates?.length===0,"duplicates:within");
ok(dup.source_metadata_anomalies?.length===1,"duplicates:anomaly");
ok(dup.source_metadata_anomalies?.[0]?.source_file==="63.doc","duplicates:63");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const archive=byId.get("mk-supreme-court-publication-archive");
const coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(archive?.additional_corpus_ids?.includes(m.corpus_id),"registry:archive");
ok(coll?.additional_corpus_ids?.includes(m.corpus_id),"registry:collection");
ok(coll?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:batch");
ok(coll?.historical_current_law_gate===true,"registry:current_law");
ok(coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:original_gate");

if(errors.length){
 console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B6_VALIDATION_FAILED\n"+errors.join("\n"));
 process.exit(1);
}
console.log(JSON.stringify({ok:true,corpusId:m.corpus_id,canonicalRecords:20,judgments:14,orders:6,publicationBound:20,sourceMetadataAnomalies:1,crossBatchDuplicates:0,productionEligible:false,humanGateRequired:true},null,2));
