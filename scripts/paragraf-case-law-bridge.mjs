#!/usr/bin/env node
// Bridge normalized Paragraf/Lex/Nova/LexAI case-law records into the
// governed AI Advokat case-law NDJSON format.
//
// Output remains licensed-secondary discovery material. It is not treated as
// official authority until independently bound to an official source and
// approved through Human Gate.

import fs from "node:fs";

const ALLOWED_EXTERNAL_IDS=new Set([
  "ecli","celex","echr_application_number","hudoc_item_id",
  "domestic_case_number","constitutional_reference","paragraf_legacy_id","other"
]);

function asText(v,max=24000){
  if(v===null||v===undefined||v==="") return null;
  const s=String(v).normalize("NFKC").trim();
  if(s.length>max) return s.slice(0,max);
  return s||null;
}
function parseMetadata(raw){
  if(!raw) return {};
  if(typeof raw==="object") return raw;
  try{
    const x=JSON.parse(String(raw));
    return x&&typeof x==="object"&&!Array.isArray(x)?x:{};
  }catch{
    throw new Error("Invalid metadata_json in normalized case-law record.");
  }
}
function obj(v){return v&&typeof v==="object"&&!Array.isArray(v)?v:{};}
function first(...values){
  for(const v of values){
    if(v!==null&&v!==undefined&&String(v).trim()!=="") return v;
  }
  return null;
}
function cleanExternalIds(value,legacyId,caseNumber){
  const src=obj(value);
  const out={};
  for(const [k,v] of Object.entries(src)){
    if(!ALLOWED_EXTERNAL_IDS.has(k)) continue;
    if(Array.isArray(v)){
      const vals=v.map(x=>asText(x,300)).filter(Boolean);
      if(vals.length) out[k]=vals;
    }else{
      const t=asText(v,300);
      if(t) out[k]=t;
    }
  }
  if(legacyId) out.paragraf_legacy_id=asText(legacyId,300);
  if(caseNumber && !out.domestic_case_number) out.domestic_case_number=asText(caseNumber,300);
  return out;
}
function sourceUrl(value){
  if(!value) return "https://paragraf.mk/";
  let u;
  try{u=new URL(String(value));}catch{return "https://paragraf.mk/";}
  if(u.protocol!=="https:") return "https://paragraf.mk/";
  const h=u.hostname.toLowerCase();
  if(h!=="paragraf.mk"&&!h.endsWith(".paragraf.mk")) return "https://paragraf.mk/";
  return u.href;
}

export function bridgeParagrafCaseLaw(normalizedText){
  const rows=String(normalizedText??"").split(/\r?\n/).filter(Boolean).map((line,i)=>{
    try{return JSON.parse(line);}catch{throw new Error("Invalid JSON at line "+(i+1));}
  });
  const manifest=rows.find(x=>x?.type==="ai_advokat_paragraf_normalized_manifest");
  if(!manifest) throw new Error("Missing normalized Paragraf manifest.");
  if(manifest.authorized_export!==true) throw new Error("Case-law bridge requires authorized_export=true.");
  if(manifest.production_eligible!==false||manifest.human_gate_required!==true){
    throw new Error("Case-law bridge requires fail-closed production/Human Gate manifest state.");
  }

  const docs=rows.filter(x=>x?.type!=="ai_advokat_paragraf_normalized_manifest"&&x?.corpus_role==="case_law");
  if(!docs.length) throw new Error("No case_law records in normalized export.");

  const outManifest={
    type:"case_law_manifest",
    run_id:String(manifest.run_id)+"-case-law",
    source_class:"licensed_secondary_export",
    source_provider:manifest.source_provider??"Paragraf.mk",
    source_product:manifest.source_product??"unknown",
    authorized_export:true,
    license_or_access_basis:manifest.license_or_access_basis,
    discovery_only:true,
    human_gate_required:true
  };

  const cases=docs.map((doc,index)=>{
    const meta=parseMetadata(doc.metadata_json);
    const original=obj(meta.original_metadata);
    const authority=obj(first(meta.authority,original.authority));
    const legacyId=first(doc.legacy_id,doc.source_record_id,meta.source_record_id,original.id);
    const caseNumber=first(meta.case_number,original.case_number,original.case_no,original.number);
    const court=asText(first(meta.court,original.court,original.court_name),"300")||"Непознат суд — pending Human Gate";
    const decisionDate=asText(first(meta.decision_date,original.decision_date,original.date),40);
    const legalArea=asText(first(meta.legal_area,original.legal_area,original.area),300);
    const outcome=asText(first(meta.outcome_summary,original.outcome_summary,original.outcome),10000);
    const reasoning=asText(first(meta.reasoning_summary,original.reasoning_summary,original.summary),24000);
    const holdingsRaw=first(meta.holdings,original.holdings);
    const holdings=Array.isArray(holdingsRaw)?holdingsRaw.map(h=>{
      const x=obj(h);
      const proposition=asText(first(x.proposition,x.holding,x.principle),6000);
      if(!proposition) return null;
      return {
        holding_type:asText(first(x.holding_type,x.type),80)||"holding",
        proposition,
        source_locator:asText(first(x.source_locator,x.locator),300),
        source_quote:asText(first(x.source_quote,x.quote),2000),
        source_language:asText(first(x.source_language,x.language),40)
      };
    }).filter(Boolean):[];

    const externalIds=cleanExternalIds(first(meta.external_ids,original.external_ids),legacyId,caseNumber);
    return {
      type:"case_law_case",
      case_key:"paragraf:"+String(legacyId??doc.source_sha256??index),
      case_title:asText(doc.title,500),
      court,
      case_number:asText(caseNumber,200),
      jurisdiction:asText(doc.jurisdiction,32)||"MK",
      legal_area:legalArea,
      decision_date:decisionDate,
      outcome_summary:outcome,
      reasoning_summary:reasoning,
      source_url:sourceUrl(doc.source_url),
      source_sha256:String(doc.source_sha256??"").toLowerCase(),
      source_product:doc.source_product??manifest.source_product??"unknown",
      source_record_id:asText(first(doc.source_record_id,legacyId),220),
      external_ids:externalIds,
      finality_status:asText(first(meta.finality_status,original.finality_status),80)||"unknown",
      authority:{
        court_level:asText(first(authority.court_level,original.court_level),120)||"other",
        chamber_or_section:asText(first(authority.chamber_or_section,original.chamber_or_section),180),
        decision_type:asText(first(authority.decision_type,original.decision_type),120)||"decision",
        precedential_weight:asText(first(authority.precedential_weight,original.precedential_weight),80)||"unknown",
        outcome_side:asText(first(authority.outcome_side,original.outcome_side),80)||"neutral",
        convention_articles:asText(first(authority.convention_articles,original.convention_articles),500),
        domestic_articles:asText(first(authority.domestic_articles,meta.cited_articles,original.cited_articles),500),
        legal_issue_keys:asText(first(authority.legal_issue_keys,original.legal_issue_keys,legalArea),1500),
        importance_level:asText(first(authority.importance_level,original.importance_level),80)
      },
      holdings
    };
  });

  return {
    manifest:outManifest,
    cases,
    ndjson:[JSON.stringify(outManifest),...cases.map(x=>JSON.stringify(x))].join("\n")+"\n"
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/paragraf-case-law-bridge.mjs <normalized.ndjson> <cases.ndjson>");
    process.exit(2);
  }
  const result=bridgeParagrafCaseLaw(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,result.ndjson,"utf8");
  console.error(JSON.stringify({ok:true,cases:result.cases.length,output:outPath},null,2));
}
