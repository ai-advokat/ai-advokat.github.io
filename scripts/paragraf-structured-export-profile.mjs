#!/usr/bin/env node
// Read-only structured-export profiler for recovered Paragraf/Lex/Nova/LexAI data.
// Emits field/tag metadata and candidate mapping hints, never record values.

import fs from "node:fs";
import path from "node:path";

const FIELD_HINTS={
  case_law:/(case|court|judg|decision|presud|odluka|case_number|broj_predmet|sudska)/i,
  primary_law:/(law|zakon|statute|regulation|propis|article|clan|legislation)/i,
  document:/(document|file|upload|attachment|template|obrazec|podnesok|path|filename)/i,
  commentary:/(comment|analysis|annotation|mislenje|stav|summary|reasoning)/i,
  restricted_operational:/(user|account|auth|login|password|credential|token|session|billing|payment|invoice|subscription|card|email|phone)/i
};

function classifyField(name){
  for(const [k,re] of Object.entries(FIELD_HINTS)) if(re.test(name)) return k;
  return "other";
}
function safeSampleKeys(records){
  const set=new Set();
  for(const r of records.slice(0,100)){
    if(r&&typeof r==="object"&&!Array.isArray(r)){
      for(const k of Object.keys(r)) set.add(k);
    }
  }
  return [...set].sort();
}
function csvHeader(line){
  const out=[];
  let cur="",q=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){
      if(q&&line[i+1]==='"'){cur+='"';i++;} else q=!q;
    }else if(ch===","&&!q){out.push(cur.trim());cur="";}
    else cur+=ch;
  }
  out.push(cur.trim());
  return out.map(x=>x.replace(/^"|"$/g,"").trim()).filter(Boolean);
}
function summarizeFields(fields){
  const classifications={};
  for(const f of fields){
    const c=classifyField(f);
    classifications[c]=(classifications[c]??0)+1;
  }
  return {
    fields,
    field_count:fields.length,
    classification_counts:classifications,
    contains_restricted_operational_fields:(classifications.restricted_operational??0)>0,
    candidate_record_class:deriveCandidate(classifications)
  };
}
function deriveCandidate(counts){
  const legal=["case_law","primary_law","document","commentary"];
  const legalTotal=legal.reduce((sum,k)=>sum+(counts[k]??0),0);
  if((counts.restricted_operational??0)>0 && legalTotal===0) return "restricted_operational";
  let best="other",score=0;
  for(const k of legal){
    if((counts[k]??0)>score){best=k;score=counts[k];}
  }
  return score?best:"other";
}

export function profileStructuredExport(filename,text){
  const ext=path.extname(filename).toLowerCase();
  const raw=String(text??"");
  if(!raw.trim()) throw new Error("Empty structured export.");

  if(ext===".json"){
    const parsed=JSON.parse(raw);
    const records=Array.isArray(parsed)?parsed:(Array.isArray(parsed.records)?parsed.records:[parsed]);
    const fields=safeSampleKeys(records);
    return {
      type:"paragraf_structured_export_profile",
      format:"json",
      record_count:Array.isArray(parsed)?parsed.length:(Array.isArray(parsed.records)?parsed.records.length:1),
      ...summarizeFields(fields),
      record_values_emitted:false
    };
  }

  if(ext===".jsonl"||ext===".ndjson"){
    const rows=raw.split(/\r?\n/).filter(Boolean).map((line,i)=>{
      try{return JSON.parse(line);}catch{throw new Error("Invalid JSON at line "+(i+1));}
    });
    return {
      type:"paragraf_structured_export_profile",
      format:ext.slice(1),
      record_count:rows.length,
      ...summarizeFields(safeSampleKeys(rows)),
      record_values_emitted:false
    };
  }

  if(ext===".csv"){
    const lines=raw.split(/\r?\n/).filter(Boolean);
    if(!lines.length) throw new Error("Empty CSV.");
    const fields=csvHeader(lines[0]);
    return {
      type:"paragraf_structured_export_profile",
      format:"csv",
      record_count:Math.max(0,lines.length-1),
      ...summarizeFields(fields),
      record_values_emitted:false,
      note:"CSV record count is line-based; multiline quoted fields require a dedicated parser during extraction."
    };
  }

  if(ext===".xml"){
    const tags=[...raw.matchAll(/<([A-Za-z_][A-Za-z0-9_.:-]*)(?:\s|>|\/)/g)].map(m=>m[1].replace(/^.*:/,""));
    const fields=[...new Set(tags)].sort();
    return {
      type:"paragraf_structured_export_profile",
      format:"xml",
      record_count:null,
      ...summarizeFields(fields),
      record_values_emitted:false,
      note:"XML profile reports unique tag names only; record boundaries require schema-specific extraction."
    };
  }

  throw new Error("Supported formats: .json, .jsonl, .ndjson, .csv, .xml");
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath){
    console.error("Usage: node scripts/paragraf-structured-export-profile.mjs <export.json|jsonl|ndjson|csv|xml> [profile.json]");
    process.exit(2);
  }
  const result=profileStructuredExport(inputPath,fs.readFileSync(inputPath,"utf8"));
  const json=JSON.stringify(result,null,2)+"\n";
  if(outPath) fs.writeFileSync(outPath,json,"utf8"); else process.stdout.write(json);
}
