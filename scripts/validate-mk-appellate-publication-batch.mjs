import fs from "node:fs";
import path from "node:path";

const root=process.argv[2]||"data/case-law/mk-appellate-publications-batch-2026-10-31-b2";
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),"utf8"));
const manifest=read("manifest.json");
const qc=read("qc-summary.json");
const dup=read("duplicates.json");
const manual=read("visual-manual-index-queue.json");
const index=read("case-number-discovery-index.min.json");
const errors=[];
const add=(ok,msg)=>{if(!ok) errors.push(msg)};

add(manifest.type==="mk_appellate_publication_batch_manifest","manifest:type");
add(manifest.schema_version==="AI_ADVOCAT_APPELLATE_PUBLICATION_BATCH_V1","manifest:schema");
add(manifest.status==="RELEASE_CANDIDATE_HUMAN_GATE","manifest:status");
add(manifest.production_eligible===false,"manifest:production_must_be_false");
add(manifest.input_pdf_count===20,"manifest:input_count");
add(manifest.new_canonical_source_count===16,"manifest:canonical_count");
add(manifest.internal_duplicate_copy_count===2,"manifest:internal_duplicates");
add(manifest.cross_batch_duplicate_copy_count===2,"manifest:cross_batch_duplicates");
add(manifest.machine_readable_new_source_count===15,"manifest:machine_readable");
add(manifest.visual_manual_index_source_count===1,"manifest:visual_manual");
add(manifest.global_unique_case_number_candidate_count===453,"manifest:global_case_count");
add(manifest.source_case_number_candidate_count_sum===457,"manifest:source_case_sum");
add(manifest.authority_page_marker_count===177,"manifest:authority_pages");
add(Array.isArray(manifest.sources)&&manifest.sources.length===16,"manifest:sources");

const ids=new Set();
for(const [i,s] of manifest.sources.entries()){
  const tag=`source[${i}]`;
  add(Boolean(s.source_id),`${tag}:id`);
  if(s.source_id){add(!ids.has(s.source_id),`${tag}:duplicate_id:${s.source_id}`);ids.add(s.source_id)}
  add(/^[a-f0-9]{64}$/.test(String(s.pdf_sha256||"")),`${tag}:pdf_sha`);
  if(s.text_quality==="machine_readable") add(/^[a-f0-9]{64}$/.test(String(s.normalized_text_sha256||"")),`${tag}:text_sha`);
  if(s.text_quality==="visual_manual_index_required") add(s.normalized_text_sha256===null,`${tag}:manual_no_text_hash`);
  add(Number.isInteger(s.page_count)&&s.page_count>0,`${tag}:pages`);
  add(s.official_remote_binding_verified===false,`${tag}:binding_false`);
  add(s.production_eligible===false,`${tag}:production_false`);
  add(s.human_gate_required===true,`${tag}:human_gate`);
  add(s.current_law_verification_required===true,`${tag}:current_law_gate`);
}

add(dup.length===4,"duplicates:count");
add(dup.filter(x=>x.duplicate_kind==="normalized_text_exact").length===2,"duplicates:internal_exact");
add(dup.filter(x=>x.duplicate_kind==="same_publication_as_prior_batch").length===2,"duplicates:cross_batch");
add(manual.length===1,"manual:count");
add(manual[0]?.source_id==="mk-joint-appellate-civil-meeting-2018-04","manual:source");
add(manual[0]?.production_eligible===false,"manual:production");
add(manual[0]?.human_gate_required===true,"manual:human_gate");

add(index.schema_version==="AI_ADVOCAT_CASE_NUMBER_DISCOVERY_INDEX_V1","index:schema");
add(index.corpus_id===manifest.corpus_id,"index:corpus");
add(index.production_eligible===false,"index:production");
const indexIds=new Set(index.sources.map(x=>x.source_id));
for(const x of index.sources) add(ids.has(x.source_id),`index:unknown_source:${x.source_id}`);
let caseSum=0; const globalCases=new Set();
for(const x of index.sources){
  for(const c of x.cases||[]){
    add(typeof c.n==="string"&&c.n.length>2,`index:case_number:${x.source_id}`);
    add(Number.isInteger(c.p)&&c.p>0,`index:page:${x.source_id}`);
    caseSum++; globalCases.add(c.n);
  }
}
add(caseSum===457,`index:case_sum:${caseSum}`);
add(globalCases.size===453,`index:global_unique:${globalCases.size}`);
add(qc.production_eligible===false,"qc:production");
add(qc.human_gate_required===true,"qc:human_gate");
if(errors.length){
  console.error("MK_APPELLATE_PUBLICATION_BATCH_VALIDATION_FAILED\n"+errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,corpusId:manifest.corpus_id,newCanonicalSources:manifest.new_canonical_source_count,internalDuplicates:manifest.internal_duplicate_copy_count,crossBatchDuplicates:manifest.cross_batch_duplicate_copy_count,globalCaseCandidates:globalCases.size,authorityPageMarkers:manifest.authority_page_marker_count,productionEligible:false,humanGateRequired:true},null,2));
