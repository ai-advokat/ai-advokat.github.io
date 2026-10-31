#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED={records:388,sources:6,lookup:388,supremeRefs:34,supremeIndex:50};
function fail(msg){ throw new Error(msg); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function readNdjson(p){ return fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map((line,i)=>{try{return JSON.parse(line)}catch(e){fail(`${p}:${i+1}:invalid_json`)}}); }
function validSha(v){return /^[a-f0-9]{64}$/i.test(String(v||''));}
function validIsoDate(v){if(!v)return false; const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m)return false; const y=+m[1],mo=+m[2],d=+m[3]; const dt=new Date(Date.UTC(y,mo-1,d)); return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d;}

export function validateCorpus(root,{strictCounts=true}={}){
  const corpus=path.join(root,'corpus');
  const sup=path.join(root,'supreme_collection');
  const manifest=readJson(path.join(corpus,'manifest.json'));
  const qc=readJson(path.join(corpus,'qc-summary.json'));
  const records=readNdjson(path.join(corpus,'as-stip-bulletins-v2.canonical.ndjson'));
  const lookup=readNdjson(path.join(corpus,'official-lookup-queue.ndjson'));
  const supremeQueue=readNdjson(path.join(corpus,'supreme-binding-queue.ndjson'));
  const supremeIndex=readNdjson(path.join(sup,'supreme-collection-2000-book-ix.ndjson'));
  const errors=[];
  const warn=[];
  const add=(cond,msg)=>{if(!cond)errors.push(msg)};

  add(manifest.corpus_id==='as-stip-bulletins-v2','manifest_corpus_id');
  add(manifest.production_eligible===false,'manifest_must_not_be_production_eligible');
  add(manifest.status==='RELEASE_CANDIDATE_HUMAN_GATE','manifest_status');
  add(qc.production_eligible===false,'qc_must_not_be_production_eligible');
  add(qc.human_gate_required===true,'qc_human_gate_required');
  if(strictCounts){
    add(records.length===EXPECTED.records,`record_count:${records.length}`);
    add(manifest.source_stats?.length===EXPECTED.sources,`source_count:${manifest.source_stats?.length}`);
    add(lookup.length===EXPECTED.lookup,`lookup_count:${lookup.length}`);
    add(supremeQueue.length===EXPECTED.supremeRefs,`supreme_binding_count:${supremeQueue.length}`);
    add(supremeIndex.length===EXPECTED.supremeIndex,`supreme_index_count:${supremeIndex.length}`);
  }

  const ids=new Set();
  let withDates=0,withArticles=0,withLaws=0,flagged=0;
  for(const [i,r] of records.entries()){
    const tag=`record[${i}]`;
    add(r.type==='case_law_case',`${tag}:type`);
    add(r.schema_version==='AS_ST_CASE_LAW_CITATION_V2.1',`${tag}:schema`);
    add(Boolean(r.record_id),`${tag}:record_id`);
    if(r.record_id){add(!ids.has(r.record_id),`${tag}:duplicate_record_id:${r.record_id}`);ids.add(r.record_id)}
    add(r.court==='Апелационен суд Штип',`${tag}:court`);
    add(r.court_level==='appellate',`${tag}:court_level`);
    add(r.jurisdiction==='MK',`${tag}:jurisdiction`);
    add(Boolean(r.case_number),`${tag}:case_number`);
    add(Boolean(String(r.holding||'').trim()),`${tag}:holding`);
    add(r.holding_source==='official_court_bulletin_headnote',`${tag}:holding_source`);
    add(validSha(r.source?.pdf_sha256),`${tag}:pdf_sha256`);
    add(validSha(r.chunk_sha256),`${tag}:chunk_sha256`);
    add(Number.isInteger(r.source?.page_start)&&r.source.page_start>0,`${tag}:page_start`);
    add(Number.isInteger(r.source?.page_end)&&r.source.page_end>=r.source.page_start,`${tag}:page_end`);
    add(r.source?.official_binding_verified===false,`${tag}:official_binding_must_be_false`);
    add(r.verification?.bulletin_source_verified===true,`${tag}:bulletin_verified`);
    add(r.verification?.official_original_decision_bound===false,`${tag}:original_decision_must_be_unbound`);
    add(r.verification?.human_gate_required===true,`${tag}:human_gate`);
    add(r.verification?.production_eligible===false,`${tag}:production_eligible_must_be_false`);
    add(Array.isArray(r.retrieval_aliases)&&r.retrieval_aliases.length>0,`${tag}:retrieval_aliases`);
    add(Boolean(String(r.citation_text||'').trim()),`${tag}:citation_text`);
    if(r.decision_date){ if(validIsoDate(r.decision_date)) withDates++; else errors.push(`${tag}:invalid_iso_date:${r.decision_date}`); }
    if(Array.isArray(r.articles)&&r.articles.length) withArticles++;
    if(Array.isArray(r.laws)&&r.laws.length) withLaws++;
    if(Array.isArray(r.verification?.qc_flags)&&r.verification.qc_flags.length) flagged++;
  }

  for(const [i,row] of lookup.entries()){
    add(row.type==='official_case_lookup_candidate',`lookup[${i}]:type`);
    add(row.status==='pending_official_lookup',`lookup[${i}]:status`);
    add(row.do_not_invent_url===true,`lookup[${i}]:do_not_invent_url`);
    add(row.human_gate_required===true,`lookup[${i}]:human_gate`);
  }
  for(const [i,row] of supremeQueue.entries()){
    add(row.type==='supreme_case_binding_candidate',`supreme[${i}]:type`);
    add(row.status==='pending_official_lookup',`supreme[${i}]:status`);
    add(row.official_binding_verified===false,`supreme[${i}]:official_binding`);
    add(row.human_gate_required===true,`supreme[${i}]:human_gate`);
  }
  for(const [i,row] of supremeIndex.entries()){
    add(row.verification?.production_eligible===false,`supreme_index[${i}]:production_eligible`);
    add(row.verification?.human_gate_required===true,`supreme_index[${i}]:human_gate`);
    add(row.source?.official_binding_verified===false,`supreme_index[${i}]:official_binding_must_be_false`);
  }

  if(qc.records_with_decision_date!==withDates) errors.push(`qc_date_mismatch:${qc.records_with_decision_date}:${withDates}`);
  if(qc.records_with_articles!==withArticles) errors.push(`qc_articles_mismatch:${qc.records_with_articles}:${withArticles}`);
  if(qc.records_with_laws!==withLaws) errors.push(`qc_laws_mismatch:${qc.records_with_laws}:${withLaws}`);
  if((qc.qc_flag_counts?.['missing_or_invalid_decision_date:impossible']||0)!==1) errors.push('qc_impossible_date_expected_1');
  if(flagged===0) warn.push('no_flagged_records_unexpected');
  if(errors.length) fail(`AS_ST_CORPUS_VALIDATION_FAILED\n${errors.slice(0,80).join('\n')}`);
  return {ok:true,recordCount:records.length,sourceCount:manifest.source_stats.length,lookupCount:lookup.length,supremeBindingCount:supremeQueue.length,supremeIndexCount:supremeIndex.length,withDates,withArticles,withLaws,flagged,warnings:warn,productionEligible:false,humanGateRequired:true};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const root=process.argv[2]||'.';
  try{console.log(JSON.stringify(validateCorpus(root),null,2));}
  catch(e){console.error(String(e?.stack||e));process.exit(1)}
}
