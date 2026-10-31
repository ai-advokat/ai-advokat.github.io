#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b5";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const hashes=read("source-hashes.json");
const index=read("case-key-index.json");
const dup=read("duplicates-and-aliases.json");
const records=fs.readFileSync(path.join(root,"authority-records.ndjson"),"utf8").trim().split("\n").filter(Boolean).map(x=>JSON.parse(x));
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const errors=[]; const ok=(c,m)=>{if(!c) errors.push(m)};

ok(manifest.type==="mk_historical_direct_case_law_batch_manifest","manifest:type");
ok(manifest.schema_version==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_LAW_V2","manifest:schema");
ok(manifest.corpus_id==="mk-historical-direct-case-law-2026-10-31-b5","manifest:corpus");
ok(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(manifest.input_file_count===18,"manifest:inputs");
ok(manifest.canonical_authority_record_count===18,"manifest:canonical");
ok(manifest.supreme_decision_record_count===15,"manifest:decisions");
ok(manifest.general_session_principled_stance_count===2,"manifest:principled");
ok(manifest.civil_division_legal_opinion_count===1,"manifest:legal_opinion");
ok(manifest.cross_batch_case_duplicate_count===0,"manifest:duplicates");
ok(manifest.publication_bound_to_collection_v_count===18,"manifest:publication_bound");
ok(manifest.production_eligible===false&&manifest.human_gate_required===true,"manifest:gates");

ok(qc.input_files===18&&qc.canonical_records===18,"qc:counts");
ok(qc.decision_records===15&&qc.interpretive_authorities===3,"qc:authority_counts");
ok(qc.collection_v_bound===18,"qc:binding");
ok(Array.isArray(qc.fatal_defects)&&qc.fatal_defects.length===0,"qc:fatal");
ok(qc.production_eligible===false&&qc.human_gate_required===true,"qc:gates");

ok(Array.isArray(hashes)&&hashes.length===18,"hashes:count");
const fileNames=new Set();
for(const [i,h] of hashes.entries()){
  const tag=`hash[${i}]`;
  ok(typeof h.file==="string"&&!fileNames.has(h.file),`${tag}:file`); fileNames.add(h.file);
  ok(/^[a-f0-9]{64}$/.test(h.sha256),`${tag}:source_sha`);
  ok(/^[a-f0-9]{64}$/.test(h.normalized_text_sha256),`${tag}:text_sha`);
  ok(Number.isInteger(h.size_bytes)&&h.size_bytes>0,`${tag}:size`);
}

ok(Array.isArray(records)&&records.length===18,"records:count");
const ids=new Set(); const caseKeys=[];
let decisions=0, principled=0, opinions=0, publicationBound=0;
for(const [i,r] of records.entries()){
  const tag=`record[${i}]`;
  ok(typeof r.record_id==="string"&&!ids.has(r.record_id),`${tag}:id`); ids.add(r.record_id);
  ok(fileNames.has(r.source_file),`${tag}:source_file`);
  ok(/^[a-f0-9]{64}$/.test(r.source_file_sha256),`${tag}:source_sha`);
  ok(/^[a-f0-9]{64}$/.test(r.normalized_text_sha256),`${tag}:text_sha`);
  ok(typeof r.official_headnote_legacy_transcription==="string"&&r.official_headnote_legacy_transcription.length>40,`${tag}:headnote`);
  ok(Array.isArray(r.topics_mk)&&r.topics_mk.length>=3,`${tag}:topics`);
  ok(r.jurisdiction==="MK-HIST",`${tag}:jurisdiction`);
  ok(r.historical_authority===true,`${tag}:historical`);
  ok(r.current_law_verification_required===true,`${tag}:current_law`);
  ok(r.official_remote_original_binding_verified===false,`${tag}:remote_binding`);
  ok(r.production_eligible===false&&r.human_gate_required===true,`${tag}:gates`);
  ok(r.privacy_minimisation===true,`${tag}:privacy`);
  ok(r.publication_binding?.source_id==="mk-supreme-collection-v-1990-1996",`${tag}:publication_source`);
  ok(r.publication_binding?.collection_pdf_sha256==="89eff6a56a156ad7c722bcee5af6b8748f2100e90158b8a36dff0cb782a24c78",`${tag}:collection_hash`);
  ok(r.publication_binding?.verified===true,`${tag}:publication_verified`);
  publicationBound++;
  if(r.authority_kind==="judgment"||r.authority_kind==="order"){
    decisions++; ok(typeof r.case_number_key==="string"&&r.case_number_key.length>5,`${tag}:case_key`); caseKeys.push(r.case_number_key);
  } else if(r.authority_kind==="principled_stance"){ principled++; ok(r.case_number_key===null,`${tag}:principled_no_case`); }
  else if(r.authority_kind==="department_legal_opinion"){ opinions++; ok(r.case_number_key===null,`${tag}:opinion_no_case`); }
  else ok(false,`${tag}:authority_kind`);
}
ok(decisions===15,"records:decision_count");
ok(principled===2,"records:principled_count");
ok(opinions===1,"records:opinion_count");
ok(publicationBound===18,"records:publication_count");
ok(new Set(caseKeys).size===15,"records:unique_case_keys");

ok(index.schema==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_KEY_INDEX_V2","index:schema");
ok(index.corpus_id===manifest.corpus_id,"index:corpus");
ok(Array.isArray(index.records)&&index.records.length===18,"index:count");
ok(index.records.filter(r=>r.case_number_key).length===15,"index:case_count");
ok(index.records.filter(r=>r.authority_kind==="principled_stance").length===2,"index:principled_count");
ok(index.records.filter(r=>r.authority_kind==="department_legal_opinion").length===1,"index:opinion_count");
for(const r of index.records){ ok(r.production_eligible===false&&r.human_gate_required===true,`index:gates:${r.record_id}`); }

ok(Array.isArray(dup.cross_batch_case_duplicates)&&dup.cross_batch_case_duplicates.length===0,"dup:cross_batch");
ok(Array.isArray(dup.within_batch_duplicates)&&dup.within_batch_duplicates.length===0,"dup:within_batch");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const archive=byId.get("mk-supreme-court-publication-archive");
ok(archive?.additional_corpus_ids?.includes(manifest.corpus_id),"registry:archive_corpus");
const coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(coll?.additional_corpus_ids?.includes(manifest.corpus_id),"registry:collection_corpus");
ok(coll?.historical_current_law_gate===true,"registry:current_law");
ok(coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:original_binding");

if(errors.length){
  console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B5_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,corpusId:manifest.corpus_id,canonicalRecords:18,decisionRecords:15,principledStances:2,divisionLegalOpinions:1,publicationBound:18,crossBatchDuplicates:0,productionEligible:false,humanGateRequired:true},null,2));
