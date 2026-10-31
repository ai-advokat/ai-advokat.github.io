#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b7";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const m=read("manifest.json"), q=read("qc-summary.json"), hashes=read("source-hashes.json"), idx=read("case-key-index.json"), dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const errors=[]; const ok=(c,s)=>{if(!c) errors.push(s)};

ok(m.type==="mk_historical_direct_case_law_batch_manifest","manifest:type");
ok(m.schema_version==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_LAW_V2","manifest:schema");
ok(m.corpus_id==="mk-historical-direct-case-law-2026-10-31-b7","manifest:corpus");
ok(m.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(m.input_file_count===20&&m.canonical_authority_record_count===20,"manifest:counts");
ok(m.supreme_court_record_count===16&&m.commercial_court_record_count===4,"manifest:courts");
ok(m.judgment_record_count===9&&m.order_record_count===11,"manifest:kinds");
ok(m.cross_batch_case_duplicate_count===0&&m.publication_bound_to_collection_v_count===20,"manifest:provenance");
ok(m.source_metadata_anomaly_count===4,"manifest:anomalies");
ok(m.production_eligible===false&&m.human_gate_required===true,"manifest:gates");

ok(q.input_files===20&&q.canonical_records===20,"qc:counts");
ok(q.supreme_court_records===16&&q.commercial_court_records===4,"qc:courts");
ok(q.judgments===9&&q.orders===11,"qc:kinds");
ok(q.collection_v_bound===20&&q.cross_batch_case_duplicates===0,"qc:provenance");
ok(q.source_metadata_anomalies===4&&q.fatal_defects?.length===0,"qc:anomalies");
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
const ids=new Set(), keys=new Set(); let sup=0,com=0,j=0,o=0,an=0;
for(const [i,r] of records.entries()){
 const tag=`record[${i}]`;
 ok(!ids.has(r.record_id),`${tag}:duplicate_id`); ids.add(r.record_id);
 ok(files.has(r.source_file),`${tag}:source`);
 ok(/^[a-f0-9]{64}$/.test(r.source_file_sha256),`${tag}:source_hash`);
 ok(/^[a-f0-9]{64}$/.test(r.normalized_text_sha256),`${tag}:text_hash`);
 ok(typeof r.case_number_key==="string"&&!keys.has(r.case_number_key),`${tag}:case_key`); keys.add(r.case_number_key);
 ok(typeof r.decision_date==="string"&&r.decision_date.length===10,`${tag}:date`);
 ok(typeof r.official_headnote_legacy_transcription==="string"&&r.official_headnote_legacy_transcription.length>40,`${tag}:headnote`);
 ok(Array.isArray(r.topics_mk)&&r.topics_mk.length>=3,`${tag}:topics`);
 ok(r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996"&&r.publication_binding?.verified===true,`${tag}:binding`);
 ok(r.publication_binding?.collection_pdf_sha256==="89eff6a56a156ad7c722bcee5af6b8748f2100e90158b8a36dff0cb782a24c78",`${tag}:collection_hash`);
 ok(r.historical_authority===true&&r.current_law_verification_required===true,`${tag}:historical_gate`);
 ok(r.official_remote_original_binding_verified===false,`${tag}:remote_binding`);
 ok(r.production_eligible===false&&r.human_gate_required===true,`${tag}:gates`);
 ok(r.privacy_minimisation===true,`${tag}:privacy`);
 if(r.court.includes("Стопански")) com++; else if(r.court.includes("Врховен")) sup++; else ok(false,`${tag}:court`);
 if(r.authority_kind==="judgment") j++; else if(r.authority_kind==="order") o++; else ok(false,`${tag}:kind`);
 an+=(r.source_metadata_anomalies||[]).length;
}
ok(sup===16&&com===4,"records:courts");
ok(j===9&&o===11,"records:kinds");
ok(keys.size===20,"records:unique_keys");
ok(an===4,"records:anomaly_count");

ok(idx.schema==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_KEY_INDEX_V2"&&idx.corpus_id===m.corpus_id&&idx.records?.length===20,"index:shape");
ok(idx.records.every(r=>r.production_eligible===false&&r.human_gate_required===true),"index:gates");
ok(dup.cross_batch_case_duplicates?.length===0&&dup.within_batch_duplicates?.length===0,"dup:none");
ok(dup.source_metadata_anomalies?.length===4,"dup:anomalies");
ok(dup.source_metadata_anomalies.some(x=>x.source_file==="70(1).doc"&&x.observed==="64-A"),"dup:70");
ok(dup.source_metadata_anomalies.some(x=>x.source_file==="80(1).doc"&&x.observed==="177"),"dup:80");
ok(dup.source_metadata_anomalies.some(x=>x.source_file==="75(1).doc"&&x.content_identity.includes("75-A")),"dup:75");
ok(dup.source_metadata_anomalies.some(x=>x.source_file==="75a(1).doc"&&x.content_identity.includes("entry 75")),"dup:75a");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const archive=byId.get("mk-supreme-court-publication-archive");
const coll=byId.get("mk-supreme-collection-v-1990-1996");
const commercial=byId.get("mk-historical-commercial-court-extracts");
ok(archive?.additional_corpus_ids?.includes(m.corpus_id),"registry:archive");
ok(coll?.additional_corpus_ids?.includes(m.corpus_id)&&coll?.direct_extract_batch_ids?.includes(m.corpus_id),"registry:collection");
ok(commercial?.additional_corpus_ids?.includes(m.corpus_id),"registry:commercial");
ok(coll?.historical_current_law_gate===true&&coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:gates");

if(errors.length){console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B7_VALIDATION_FAILED\n"+errors.join("\n"));process.exit(1)}
console.log(JSON.stringify({ok:true,corpusId:m.corpus_id,canonicalRecords:20,supremeCourtRecords:16,commercialCourtRecords:4,judgments:9,orders:11,publicationBound:20,sourceMetadataAnomalies:4,crossBatchDuplicates:0,productionEligible:false,humanGateRequired:true},null,2));
