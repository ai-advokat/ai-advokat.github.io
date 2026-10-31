import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-judicial-publications-batch-2026-10-31";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const dup=read("duplicates.json");
const ocr=read("ocr-human-gate-queue.json");
const errors=[];
const add=(ok,msg)=>{if(!ok) errors.push(msg)};

add(manifest.type==="mk_judicial_publication_batch_manifest","manifest:type");
add(manifest.schema_version==="AI_ADVOCAT_JUDICIAL_PUBLICATION_BATCH_V1","manifest:schema");
add(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
add(manifest.production_eligible===false,"manifest:production_must_be_false");
add(manifest.input_pdf_count===20,"manifest:input_count");
add(manifest.canonical_source_count===17,"manifest:canonical_count");
add(manifest.duplicate_copy_count===3,"manifest:duplicate_count");
add(manifest.ocr_queue_count===4,"manifest:ocr_count");
add(Array.isArray(manifest.sources)&&manifest.sources.length===17,"manifest:sources");

const ids=new Set();
for(const [i,s] of manifest.sources.entries()){
  const tag=`source[${i}]`;
  add(Boolean(s.source_id),`${tag}:id`);
  if(s.source_id){add(!ids.has(s.source_id),`${tag}:duplicate_id:${s.source_id}`);ids.add(s.source_id)}
  add(/^[a-f0-9]{64}$/.test(String(s.pdf_sha256||"")),`${tag}:sha256`);
  add(Number.isInteger(s.page_count)&&s.page_count>0,`${tag}:pages`);
  add(["machine_readable","ocr_required"].includes(s.text_quality),`${tag}:text_quality`);
  add(s.official_remote_binding_verified===false,`${tag}:official_binding_must_be_false`);
  add(s.production_eligible===false,`${tag}:production_must_be_false`);
  add(s.human_gate_required===true,`${tag}:human_gate`);
  if(s.jurisdiction==="MK-HIST"||String(s.authority_class).includes("historical")){
    add(s.current_law_verification_required===true,`${tag}:historical_current_law_gate`);
  }
  if(s.source_id==="mk-court-rules-training-questions"){
    add(s.authority_class==="procedural_training_reference",`${tag}:training_class`);
  }
  if(s.source_id==="echr-macedonia-aire-2015"){
    add(s.authority_class==="secondary_echr_reference",`${tag}:echr_secondary_class`);
  }
}
add(dup.length===3,"duplicates:count");
for(const [i,d] of dup.entries()){
  add(d.duplicate_kind==="normalized_text_exact",`duplicate[${i}]:kind`);
  add(/^[a-f0-9]{64}$/.test(String(d.duplicate_pdf_sha256||"")),`duplicate[${i}]:sha`);
}
add(ocr.length===4,"ocr:count");
for(const [i,q] of ocr.entries()){
  add(q.production_eligible===false,`ocr[${i}]:production`);
  add(q.human_gate_required===true,`ocr[${i}]:human_gate`);
  add(ids.has(q.source_id),`ocr[${i}]:source_id`);
}
add(qc.production_eligible===false,"qc:production");
add(qc.human_gate_required===true,"qc:human_gate");
add(qc.canonical_source_count===manifest.canonical_source_count,"qc:canonical_match");
if(errors.length){
  console.error("MK_JUDICIAL_PUBLICATION_BATCH_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,corpusId:manifest.corpus_id,sources:manifest.sources.length,duplicates:dup.length,ocrQueue:ocr.length,citationCandidates:manifest.citation_candidate_count,interpretiveAuthorityCandidates:manifest.interpretive_authority_candidate_count,productionEligible:false,humanGateRequired:true},null,2));
