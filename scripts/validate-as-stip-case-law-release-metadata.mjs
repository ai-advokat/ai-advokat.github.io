#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function readNdjson(p){return fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);}
function fail(msg){throw new Error(msg);}
export function validateReleaseMetadata(dir){
  const manifest=readJson(path.join(dir,'manifest.json'));
  const qc=readJson(path.join(dir,'qc-summary.json'));
  const priority=readJson(path.join(dir,'priority-human-gate.json'));
  const supreme=readNdjson(path.join(dir,'supreme-binding-queue.ndjson'));
  const duplicates=readJson(path.join(dir,'duplicates.json'));
  const errors=[]; const ok=(c,m)=>{if(!c)errors.push(m)};
  ok(manifest.corpus_id==='as-stip-bulletins-v2','corpus_id');
  ok(manifest.status==='RELEASE_CANDIDATE_HUMAN_GATE','status');
  ok(manifest.production_eligible===false,'manifest_production');
  ok(manifest.source_stats?.length===6,'source_count');
  ok(qc.record_count===388&&qc.expected_total===388,'record_count');
  ok(qc.official_lookup_queue_count===388,'lookup_count');
  ok(qc.supreme_reference_count===34,'supreme_reference_count');
  ok(qc.production_eligible===false&&qc.human_gate_required===true,'qc_gate');
  ok(priority.record_count===31&&priority.records?.length===31,'priority_gate_count');
  for(const r of priority.records||[]){ok(r.production_eligible===false&&r.official_binding_verified===false&&r.human_gate_required===true,`priority:${r.record_id}:gate`);}
  ok(supreme.length===34,'supreme_queue_count');
  for(const r of supreme){ok(r.official_binding_verified===false&&r.human_gate_required===true&&r.status==='pending_official_lookup',`supreme:${r.from_record_id}:gate`);}
  ok(duplicates && typeof duplicates==='object' && !Array.isArray(duplicates),'duplicates_shape');
  ok(Object.keys(duplicates||{}).length===qc.duplicate_groups,'duplicates_count');
  if(errors.length)fail('AS_ST_RELEASE_METADATA_FAILED\n'+errors.join('\n'));
  return {ok:true,recordCount:388,priorityHumanGate:31,supremeBindingCandidates:34,duplicateGroups:qc.duplicate_groups,productionEligible:false,humanGateRequired:true};
}
if(import.meta.url===`file://${process.argv[1]}`){try{console.log(JSON.stringify(validateReleaseMetadata(process.argv[2]||'.'),null,2))}catch(e){console.error(e.stack||e);process.exit(1)}}
