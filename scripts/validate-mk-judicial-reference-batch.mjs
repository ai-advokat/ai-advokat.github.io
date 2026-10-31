#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-judicial-reference-batch-2026-10-31-b3";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const readNdjson=n=>fs.readFileSync(path.join(root,n),"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const aliases=read("duplicates-and-aliases.json");
const routing=read("routing-policy.json");
const release=read("release-pack.json");
const direct=readNdjson("direct-authority-records.ndjson");
const registry=JSON.parse(fs.readFileSync("data/case-law-source-registry-2026.json","utf8"));

const errors=[]; const ok=(c,m)=>{if(!c) errors.push(m)};
ok(manifest.type==="mk_judicial_reference_batch_manifest","manifest:type");
ok(manifest.schema_version==="AI_ADVOCAT_JUDICIAL_REFERENCE_BATCH_V1","manifest:schema");
ok(manifest.corpus_id==="mk-judicial-reference-batch-2026-10-31-b3","manifest:corpus");
ok(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(manifest.production_eligible===false&&manifest.human_gate_required===true,"manifest:gate");
ok(manifest.input_file_count===20,"manifest:inputs");
ok(manifest.new_canonical_source_count===10,"manifest:canonical");
ok(manifest.duplicate_or_alias_file_count===10,"manifest:aliases");
ok(manifest.direct_supreme_authority_record_count===3,"manifest:direct");
ok(manifest.case_number_discovery_candidate_count===1828,"manifest:case_candidates");
ok(Array.isArray(manifest.sources)&&manifest.sources.length===10,"manifest:sources");

const ids=new Set();
for(const [i,s] of manifest.sources.entries()){
  const tag=`source[${i}]`;
  ok(Boolean(s.source_id),`${tag}:id`);
  if(s.source_id){ok(!ids.has(s.source_id),`${tag}:duplicate_id:${s.source_id}`);ids.add(s.source_id)}
  ok(/^[a-f0-9]{64}$/.test(String(s.source_sha256||"")),`${tag}:sha`);
  ok(s.official_remote_binding_verified===false,`${tag}:binding`);
  ok(s.production_eligible===false,`${tag}:production`);
  ok(s.human_gate_required===true,`${tag}:human_gate`);
  ok(s.current_law_verification_required===true,`${tag}:current_law`);
}
ok(qc.input_file_count===20&&qc.new_canonical_source_count===10&&qc.duplicate_or_alias_file_count===10,"qc:counts");
ok(qc.case_number_discovery_candidate_count===1828,"qc:case_candidates");
ok(qc.direct_supreme_authority_record_count===3,"qc:direct");
ok(qc.production_eligible===false&&qc.human_gate_required===true,"qc:gate");
ok(qc.fatal_defects===0,"qc:fatal");
ok(Array.isArray(aliases)&&aliases.length===10,"aliases:count");
ok(aliases.some(x=>x.filename==="BILTEN-2017-USRM_1..pdf"&&x.duplicate_kind==="internal_binary_exact"),"aliases:constitutional_duplicate");
ok(aliases.some(x=>x.filename==="sudska praksa-MK..docx"&&x.duplicate_kind==="derived_extract_of_existing_bulletin_record"),"aliases:derived_stip");
ok(direct.length===3,"direct:count");
for(const [i,r] of direct.entries()){
  ok(r.production_eligible===false&&r.human_gate_required===true,`direct[${i}]:gate`);
  ok(r.official_binding_verified===false,`direct[${i}]:binding`);
  ok(r.historical_current_law_gate===true,`direct[${i}]:historical_gate`);
}
ok(direct.some(x=>x.normalized_case_number==="РЕВ29/1993"),"direct:rev29");
ok(direct.some(x=>x.normalized_case_number==="РЕВ1144/1993"),"direct:rev1144");
ok(direct.some(x=>x.record_kind==="supreme_department_legal_opinion"),"direct:opinion");
ok(routing.production_eligible===false&&routing.human_gate_required===true,"routing:gate");
ok(release.release_pack_name==="MK_JUDICIAL_REFERENCE_BATCH_B3_RC1.zip","release:name");
ok(/^[a-f0-9]{64}$/.test(release.sha256),"release:sha");
ok(release.production_eligible===false,"release:production");

const byId=new Map(registry.sources.map(x=>[x.id,x]));
const constitutional=byId.get("mk-constitutional-court");
ok(constitutional?.additional_corpus_ids?.includes(manifest.corpus_id),"registry:constitutional_corpus");
ok(constitutional?.original_decision_binding_required_before_gpt_case_law_context===true,"registry:constitutional_binding");
ok(constitutional?.historical_current_law_gate===true,"registry:constitutional_current_law");
const skopje=byId.get("mk-appellate-skopje-bulletins");
ok(skopje?.additional_corpus_ids?.includes(manifest.corpus_id),"registry:skopje_corpus");
ok(skopje?.covered_bulletins?.includes("12"),"registry:skopje_b12");
ok(skopje?.current_law_verification_required===true,"registry:skopje_current_law");
const notary=byId.get("mk-notary-chamber-publications");
ok(notary?.authority_class==="professional_institutional_notarial_reference","registry:notary_class");
ok(notary?.current_law_verification_required===true,"registry:notary_current_law");
const reg=byId.get("mk-civil-commercial-case-register-2018-2019");
ok(reg?.ingest==="case_number_and_topic_discovery_only","registry:case_register_discovery");
ok(reg?.forbidden_authority_use?.includes("not_a_holding_source"),"registry:case_register_no_holding");
const rs=byId.get("rs-inheritance-secondary-extract");
ok(rs?.jurisdiction==="RS","registry:rs_jurisdiction");
ok(rs?.forbidden_authority_use?.includes("not_north_macedonian_authority"),"registry:rs_not_mk");

if(errors.length){
  console.error("MK_JUDICIAL_REFERENCE_BATCH_B3_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({
  ok:true,corpusId:manifest.corpus_id,sources:manifest.sources.length,
  duplicatesAliases:aliases.length,caseCandidates:manifest.case_number_discovery_candidate_count,
  directSupremeRecords:direct.length,productionEligible:false,humanGateRequired:true
},null,2));
