#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const schema=JSON.parse(fs.readFileSync(path.join(root,"data/legal-runs/legal-run-record.schema.json"),"utf8"));
const index=JSON.parse(fs.readFileSync(path.join(root,"data/legal-runs/index.json"),"utf8"));
const baseline=JSON.parse(fs.readFileSync(path.join(root,"data/legal-intelligence-metrics-baseline.json"),"utf8"));
const store=path.join(root,"data/legal-runs/records");
const errors=[];

function walk(dir){
  if(!fs.existsSync(dir))return[];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const p=path.join(dir,entry.name);
    return entry.isDirectory()?walk(p):[p];
  });
}
function fail(file,msg){errors.push(`${path.relative(root,file)}: ${msg}`);}
function isIso(v){return typeof v==="string"&&!Number.isNaN(Date.parse(v));}
function typeOk(v,type){
  if(type==="null")return v===null;
  if(type==="array")return Array.isArray(v);
  if(type==="integer")return Number.isInteger(v);
  if(type==="number")return typeof v==="number"&&Number.isFinite(v);
  if(type==="object")return v!==null&&typeof v==="object"&&!Array.isArray(v);
  return typeof v===type;
}
function validateBasic(file,key,value,rule){
  if(rule.enum&&!rule.enum.includes(value))fail(file,`${key}: invalid enum value ${value}`);
  if(rule.type){
    const types=Array.isArray(rule.type)?rule.type:[rule.type];
    if(!types.some(t=>typeOk(value,t)))fail(file,`${key}: invalid type`);
  }
  if(typeof value==="string"&&rule.minLength&&value.length<rule.minLength)fail(file,`${key}: too short`);
  if(typeof value==="number"&&rule.minimum!==undefined&&value<rule.minimum)fail(file,`${key}: below minimum`);
  if(Array.isArray(value)&&rule.items?.type){
    value.forEach((item,i)=>{if(!typeOk(item,rule.items.type))fail(file,`${key}[${i}]: invalid type`);});
  }
}

const files=walk(store).filter(p=>/LIOE-\d{4}-\d{4}\.json$/.test(path.basename(p))).sort();
const records=[];
for(const file of files){
  let r;
  try{r=JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){fail(file,`invalid JSON: ${e.message}`);continue;}
  records.push({file,record:r});
  for(const req of schema.required||[])if(!(req in r))fail(file,`missing required field ${req}`);
  for(const key of Object.keys(r))if(!schema.properties[key])fail(file,`unknown field ${key}`);
  for(const [key,value] of Object.entries(r))if(schema.properties[key])validateBasic(file,key,value,schema.properties[key]);

  if(!isIso(r.started_at))fail(file,"started_at must be ISO date/time");
  if(r.finished_at!==null&&r.finished_at!==undefined&&!isIso(r.finished_at))fail(file,"finished_at must be ISO date/time or null");
  if(isIso(r.started_at)&&isIso(r.finished_at)&&Date.parse(r.finished_at)<Date.parse(r.started_at))fail(file,"finished_at precedes started_at");

  if(r.data_classification==="SENSITIVE_AUTHORISED")fail(file,"sensitive raw legal-matter records are forbidden in the public canonical store");
  if(r.record_origin==="TEST")fail(file,"TEST records are forbidden in the real-run store");

  if(["CLOSED","CLOSED_WITH_FINDINGS"].includes(r.release_status)&&!r.finished_at)fail(file,"closed record requires finished_at");
  if(r.release_status==="CLOSED"&&r.verification_state!=="PASSED")fail(file,"CLOSED requires PASSED verification");
  if(r.outcome_state==="SUCCESS"&&r.verification_state!=="PASSED")fail(file,"SUCCESS requires PASSED verification");

  if(r.current_law_claim_material===true&&r.temporal_verification_state!=="VERIFIED")fail(file,"material current-law claim requires VERIFIED temporal state");
  if(r.current_law_claim_material===true&&r.source_verification_state!=="VERIFIED")fail(file,"material current-law claim requires VERIFIED sources");

  if(["L2_STRATEGY_PROCEDURE","L3_CONSEQUENTIAL","L4_LEGAL_TRUTH_GOVERNANCE"].includes(r.mission_profile)){
    if(r.legal_stress_test_state==="NOT_REQUIRED")fail(file,"L2-L4 mission may not skip legal stress test");
    if(r.adversarial_review_state==="NOT_REQUIRED")fail(file,"L2-L4 mission may not skip adversarial review");
  }

  if(r.implementation_state==="IMPLEMENTED"){
    for(const gate of r.required_gate_types||[]){
      if(r.gate_decisions?.[gate]!=="approved")fail(file,`IMPLEMENTED mission requires approved gate ${gate}`);
    }
  }

  if(r.correction_required===true&&(!Array.isArray(r.learning_candidates)||r.learning_candidates.length===0))fail(file,"correction_required=true requires learning_candidates");

  if(r.metric_eligibility){
    const keys=["effectiveness","time","activation","tooling","cost"];
    for(const k of keys)if(typeof r.metric_eligibility[k]!=="boolean")fail(file,`metric_eligibility.${k} must be boolean`);
    for(const k of Object.keys(r.metric_eligibility))if(!keys.includes(k))fail(file,`unknown metric_eligibility field ${k}`);
    if(r.metric_eligibility.effectiveness===true&&!(r.verification_state==="PASSED"&&["SUCCESS","PARTIAL_SUCCESS","NO_CHANGE"].includes(r.outcome_state)))fail(file,"effectiveness-eligible record requires passed verification and known non-failure outcome");
    if(r.metric_eligibility.time===true&&r.elapsed_ms===null)fail(file,"time-eligible record requires elapsed_ms");
    if(r.metric_eligibility.tooling===true&&r.tool_calls===null)fail(file,"tooling-eligible record requires tool_calls");
    if(r.metric_eligibility.cost===true&&r.measured_cost===null)fail(file,"cost-eligible record requires measured_cost");
  }
}

const listed=new Map((index.records||[]).map(x=>[x.run_id,x]));
const seen=new Set();
for(const {file,record:r} of records){
  if(seen.has(r.run_id))fail(file,`duplicate run_id ${r.run_id}`);
  seen.add(r.run_id);
  const item=listed.get(r.run_id);
  if(!item)fail(file,"missing from index");
  else {
    const expected="/"+path.relative(root,file).replaceAll(path.sep,"/");
    if(item.path!==expected)fail(file,`index path mismatch ${item.path} != ${expected}`);
    for(const key of ["mission_profile","outcome_state","verification_state","release_status"])if(item[key]!==r[key])fail(file,`index field ${key} does not match record`);
    if(Boolean(item.metric_effectiveness_eligible)!==Boolean(r.metric_eligibility?.effectiveness))fail(file,"index effectiveness eligibility mismatch");
  }
}
for(const item of index.records||[])if(!seen.has(item.run_id))errors.push(`data/legal-runs/index.json: indexed run ${item.run_id} has no file`);
if(index.record_count!==records.length)errors.push(`data/legal-runs/index.json: record_count ${index.record_count} != ${records.length}`);
if(records.length&&index.latest_run_id!==records.map(x=>x.record.run_id).sort().at(-1))errors.push("data/legal-runs/index.json: latest_run_id mismatch");

const counts={
  effectiveness:records.filter(x=>x.record.metric_eligibility?.effectiveness===true).length,
  time_to_verified_result:records.filter(x=>x.record.metric_eligibility?.time===true).length,
  activation:records.filter(x=>x.record.metric_eligibility?.activation===true).length,
  tooling:records.filter(x=>x.record.metric_eligibility?.tooling===true).length,
  cost:records.filter(x=>x.record.metric_eligibility?.cost===true).length
};
if(baseline.record_count!==records.length)errors.push("data/legal-intelligence-metrics-baseline.json: record_count mismatch");
if(baseline.verified_effectiveness_sample_size!==counts.effectiveness)errors.push("data/legal-intelligence-metrics-baseline.json: verified_effectiveness_sample_size mismatch");
for(const [k,v] of Object.entries(counts))if(baseline.metric_sample_sizes?.[k]!==v)errors.push(`data/legal-intelligence-metrics-baseline.json: metric_sample_sizes.${k} mismatch`);

if(errors.length){
  console.error("AI Advokat Legal Run Record validation: FAIL");
  errors.forEach((e,i)=>console.error(`${i+1}. ${e}`));
  process.exit(1);
}
console.log(`AI Advokat Legal Run Record validation: PASS (${records.length} real records)`);
console.log(`Baseline eligibility: effectiveness=${counts.effectiveness}, time=${counts.time_to_verified_result}, activation=${counts.activation}, tooling=${counts.tooling}, cost=${counts.cost}`);
