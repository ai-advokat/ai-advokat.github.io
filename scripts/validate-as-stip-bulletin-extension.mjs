#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/as-stip-bulletins-extension-2026-10-31-b4-b9-b10-b11";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const provenance=read("source-provenance.json");
const echr=read("echr-hudoc-binding-queue.min.json");
const multi=read("same-case-multi-headnote-groups.json");
const composite=JSON.parse(fs.readFileSync("data/case-law/as-stip-bulletins-v3/manifest.json","utf8"));
const errors=[]; const ok=(c,m)=>{if(!c)errors.push(m)};

ok(manifest.type==="as_stip_bulletin_extension_manifest","manifest:type");
ok(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
ok(manifest.production_eligible===false&&manifest.human_gate_required===true,"manifest:gate");
ok(manifest.input_pdf_count===20,"manifest:input");
ok(manifest.unique_document_count===11,"manifest:unique_docs");
ok(manifest.internal_exact_duplicate_copy_count===9,"manifest:internal_dup");
ok(manifest.cross_batch_existing_unique_document_count===7,"manifest:cross_batch");
ok(manifest.new_canonical_bulletin_count===4,"manifest:new_sources");
ok(JSON.stringify(manifest.new_bulletins)===JSON.stringify(["4","9","10","11"]),"manifest:new_bulletins");
ok(manifest.new_publication_item_count===197,"manifest:items");
ok(manifest.new_domestic_appellate_record_count===191,"manifest:domestic");
ok(manifest.new_echr_secondary_reference_count===6,"manifest:echr");
ok(manifest.domestic_records_with_case_number===189,"manifest:cases");
ok(manifest.domestic_records_missing_case_number===2,"manifest:missing_cases");
ok(manifest.unique_domestic_case_number_count===186,"manifest:unique_cases");
ok(manifest.supreme_reference_occurrence_count===93,"manifest:supreme");
ok(manifest.source_stats?.length===4,"manifest:source_stats");
ok(manifest.source_stats?.find(x=>x.source_id==="AS-ST-B10")?.internal_label_conflict===true,"manifest:b10_conflict");
ok(qc.production_eligible===false&&qc.human_gate_required===true,"qc:gate");
ok(provenance.internal_exact_duplicate_pairs?.length===9,"provenance:dup");
ok(provenance.cross_batch_existing_unique_documents?.length===7,"provenance:cross");
ok(provenance.new_canonical_documents?.length===4,"provenance:new");
ok(echr.length===6&&echr.every(x=>x.hudoc_binding_verified===false&&x.human_gate_required===true),"echr:gate");
ok(Object.keys(multi).length===2,"multiheadnote:groups");
ok(composite.corpus_id==="as-stip-bulletins-v3","composite:id");
ok(composite.source_count===10,"composite:sources");
ok(composite.domestic_publication_record_count===579,"composite:records");
ok(composite.echr_secondary_reference_count===6,"composite:echr");
ok(composite.production_eligible===false&&composite.human_gate_required===true,"composite:gate");

if(errors.length){
  console.error("AS_ST_STIP_EXTENSION_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,newCanonicalBulletins:4,domesticRecords:191,echrSecondary:6,compositeDomesticRecords:579,productionEligible:false,humanGateRequired:true},null,2));
