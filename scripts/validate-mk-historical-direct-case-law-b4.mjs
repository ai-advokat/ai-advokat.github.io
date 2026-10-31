#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-historical-direct-case-law-2026-10-31-b4";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const index=read("case-key-index.json");
const multi=read("same-case-multi-headnote-groups.json");
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));
const errors=[]; const ok=(c,m)=>{if(!c) errors.push(m)};

ok(manifest.type==="mk_historical_direct_case_law_batch_manifest","manifest:type");
ok(manifest.schema_version==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_LAW_V1","manifest:schema");
ok(manifest.corpus_id==="mk-historical-direct-case-law-2026-10-31-b4","manifest:corpus");
ok(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(manifest.input_file_count===40,"manifest:inputs");
ok(manifest.canonical_authority_record_count===39,"manifest:canonical");
ok(manifest.same_case_multi_headnote_group_count===1,"manifest:multi");
ok(manifest.supreme_decision_record_count===34,"manifest:supreme");
ok(manifest.commercial_court_record_count===4,"manifest:commercial");
ok(manifest.supreme_principled_opinion_count===1,"manifest:opinion");
ok(manifest.publication_bound_to_collection_v_count===39,"manifest:publication_binding");
ok(manifest.production_eligible===false&&manifest.human_gate_required===true,"manifest:gate");
ok(manifest.publication_source?.pdf_sha256==="89eff6a56a156ad7c722bcee5af6b8748f2100e90158b8a36dff0cb782a24c78","manifest:collection_hash");

ok(qc.fatal_defects?.length===0,"qc:fatal");
ok(qc.canonical_authority_record_count===39,"qc:canonical");
ok(qc.production_eligible===false&&qc.human_gate_required===true,"qc:gate");

ok(index.schema==="AI_ADVOCAT_HISTORICAL_DIRECT_CASE_KEY_INDEX_V1","index:schema");
ok(index.corpus_id===manifest.corpus_id,"index:corpus");
ok(Array.isArray(index.records)&&index.records.length===39,"index:count");
const ids=new Set(); const keys=[];
for(const [i,r] of index.records.entries()){
  const tag=`record[${i}]`;
  ok(typeof r.id==="string"&&!ids.has(r.id),`${tag}:id`); ids.add(r.id);
  ok(Array.isArray(r.f)&&r.f.length>=1,`${tag}:files`);
  ok(Array.isArray(r.k),`${tag}:keys`);
  ok(typeof r.d==="string"&&r.d.length>=8,`${tag}:date`);
  ok(typeof r.c==="string"&&r.c.length>3,`${tag}:court`);
  ok(Number.isInteger(r.p)||Array.isArray(r.p),`${tag}:page`);
  ok(r.production_eligible===false,`${tag}:production`);
  ok(r.human_gate_required===true,`${tag}:human`);
  ok(r.current_law_verification_required===true,`${tag}:current_law`);
  ok(r.original_decision_binding_verified===false,`${tag}:original_binding`);
  for(const k of r.k) keys.push(k);
}
ok(index.records.filter(r=>r.c==="Стопански суд на Македонија").length===4,"index:commercial_count");
ok(index.records.filter(r=>r.kind==="principled_legal_opinion").length===1,"index:opinion_count");
ok(index.records.some(r=>r.id==="B4-GZZ-49-1996"&&r.recovered===true),"index:recovered_278");
ok(index.records.some(r=>r.id==="B4-GZZ-51-1996"&&r.multi===2&&r.f.length===2),"index:multiheadnote");
ok(new Set(keys).size===39,"index:unique_case_keys");

ok(Array.isArray(multi)&&multi.length===1,"multi:count");
ok(multi[0]?.case_number_keys?.[0]==="GZZ-51/1996","multi:key");
ok(multi[0]?.headnote_count===2,"multi:headnotes");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const archive=byId.get("mk-supreme-court-publication-archive");
ok(archive?.additional_corpus_ids?.includes(manifest.corpus_id),"registry:archive_corpus");
const coll=byId.get("mk-supreme-collection-v-1990-1996");
ok(coll?.authority_class==="historical_supreme_court_publication_collection","registry:collection_class");
ok(coll?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:collection_binding");
ok(coll?.historical_current_law_gate===true,"registry:collection_current_law");
const commercial=byId.get("mk-historical-commercial-court-extracts");
ok(commercial?.authority_class==="historical_commercial_court_case_law_extract","registry:commercial_class");
ok(commercial?.current_law_verification_required===true,"registry:commercial_current_law");

if(errors.length){
  console.error("MK_HISTORICAL_DIRECT_CASE_LAW_B4_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,corpusId:manifest.corpus_id,canonicalRecords:39,supremeDecisions:34,commercialCourtDecisions:4,principledOpinions:1,publicationBound:39,productionEligible:false,humanGateRequired:true},null,2));
