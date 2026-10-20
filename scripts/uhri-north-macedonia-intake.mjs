#!/usr/bin/env node
// Governed OHCHR Universal Human Rights Index intake for North Macedonia.
// Uses the official public full JSON export and stages matching source records.
// It never converts recommendations/observations into judgments or domestic law.

import fs from "node:fs";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {classifyOhchrMechanism,containsNorthMacedoniaAlias} from "../src/international-legal-classifier.js";

export const UHRI_MK_INTAKE_VERSION="1.0.0";
export const UHRI_JSON_URL="https://uhri.ohchr.org/api/uhri/export-results/export-full-en.json";
const MAX_BYTES=250_000_000;

function stable(value){
  if(Array.isArray(value)) return "["+value.map(stable).join(",")+"]";
  if(value && typeof value==="object"){
    return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+stable(value[k])).join(",")+"}";
  }
  return JSON.stringify(value);
}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function recordText(value){
  try{return JSON.stringify(value);}catch{return "";}
}
function looksLikeRecord(obj){
  if(!obj || typeof obj!=="object" || Array.isArray(obj)) return false;
  const keys=Object.keys(obj).map(x=>x.toLowerCase());
  return keys.some(k=>/recommend|observation|document|mechanism|paragraph|country|text|symbol/.test(k));
}

export function extractNorthMacedoniaUhriRecords(root){
  const found=new Map();
  const visit=(value,depth=0)=>{
    if(depth>12 || value===null || value===undefined) return;
    if(Array.isArray(value)){
      for(const item of value) visit(item,depth+1);
      return;
    }
    if(typeof value!=="object") return;
    const text=recordText(value);
    if(looksLikeRecord(value) && containsNorthMacedoniaAlias(text)){
      const canonical=stable(value);
      const id=sha256(canonical);
      found.set(id,{
        source_id:"ohchr-uhri",
        source_record_sha256:id,
        state_id:"MK",
        source_country_label:(text.match(/North Macedonia|former Yugoslav Republic of Macedonia|Republic of Macedonia/i)||[])[0]||"North Macedonia",
        mechanism:classifyOhchrMechanism(value),
        authority_class:"un_human_rights_mechanism_output",
        legal_effect:"recommendation_or_observation_not_domestic_judgment",
        source_record:value,
        human_review_required:true,
        production_eligible:false
      });
    }
    for(const child of Object.values(value)){
      if(child && typeof child==="object") visit(child,depth+1);
    }
  };
  visit(root,0);
  return [...found.values()];
}

async function fetchDataset(){
  const url=new URL(UHRI_JSON_URL);
  if(url.protocol!=="https:" || url.hostname!=="uhri.ohchr.org") throw new Error("uhri_source_not_allowed");
  const response=await fetch(url,{headers:{"user-agent":"AI-Advokat/1.0 governed-UHRI-intake"}});
  if(!response.ok) throw new Error("uhri_fetch_"+response.status);
  const length=Number(response.headers.get("content-length")||0);
  if(length>MAX_BYTES) throw new Error("uhri_dataset_too_large");
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length===0 || bytes.length>MAX_BYTES) throw new Error("uhri_dataset_size_invalid");
  return {json:JSON.parse(bytes.toString("utf8")),sha256:sha256(bytes),bytes:bytes.length};
}

export async function collectNorthMacedoniaUhri(){
  const dataset=await fetchDataset();
  const records=extractNorthMacedoniaUhriRecords(dataset.json);
  if(records.length===0) throw new Error("uhri_no_north_macedonia_records");
  return {records,datasetSha256:dataset.sha256,datasetBytes:dataset.bytes};
}

async function main(){
  const outPath=process.argv[2]||"/tmp/uhri-north-macedonia.ndjson";
  const result=await collectNorthMacedoniaUhri();
  fs.writeFileSync(outPath,result.records.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
  const manifest={
    schema_version:"1.0",
    intake_version:UHRI_MK_INTAKE_VERSION,
    generated_at:new Date().toISOString(),
    source_url:UHRI_JSON_URL,
    source_dataset_sha256:result.datasetSha256,
    source_dataset_bytes:result.datasetBytes,
    north_macedonia_records:result.records.length,
    governance:{
      official_dataset:true,
      recommendation_is_not_judgment:true,
      human_gate_required:true,
      production_eligible:false
    }
  };
  fs.writeFileSync(outPath.replace(/\.ndjson$/i,"")+".manifest.json",JSON.stringify(manifest,null,2)+"\n","utf8");
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  main().catch(error=>{console.error(error);process.exit(1);});
}
