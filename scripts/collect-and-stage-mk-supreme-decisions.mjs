#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  parseArgs as parseCollectorArgs,
  run as collectSupremeDecisions
} from "./download-mk-supreme-decisions.mjs";
import {
  buildCaseLawMetadataBatch,
  buildGovernedCaseLawNdjson
} from "../src/case-law-metadata-processor.js";

export const SUPREME_STAGE_VERSION="1.0.0";

function decodeHtmlEntities(value=""){
  return String(value)
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_m,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_m,n)=>String.fromCodePoint(parseInt(n,16)));
}

export function htmlToPlainText(html=""){
  return decodeHtmlEntities(
    String(html)
      .replace(/<script\b[\s\S]*?<\/script>/giu," ")
      .replace(/<style\b[\s\S]*?<\/style>/giu," ")
      .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/giu,"\n")
      .replace(/<[^>]+>/g," ")
  )
    .replace(/[ \t]+\n/g,"\n")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/[ \t]{2,}/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

export function readableTextForDownloadedFile(filePath,contentType=""){
  const ext=path.extname(filePath).toLowerCase();
  const bytes=fs.readFileSync(filePath);
  const type=String(contentType||"").toLowerCase();
  if(ext===".html"||ext===".htm"||type.includes("text/html")){
    return {status:"ready",text:htmlToPlainText(bytes.toString("utf8")),extraction:"html_to_text"};
  }
  if([".txt",".md",".csv",".json"].includes(ext)||type.startsWith("text/")){
    return {status:"ready",text:bytes.toString("utf8").trim(),extraction:"utf8_text"};
  }
  if(ext===".pdf"||type.includes("pdf")){
    return {status:"needs_text_extraction",text:null,extraction:"pdf_binary_not_guessed"};
  }
  if([".doc",".docx",".rtf"].includes(ext)||type.includes("word")||type.includes("rtf")){
    return {status:"needs_text_extraction",text:null,extraction:"office_binary_not_guessed"};
  }
  return {status:"needs_text_extraction",text:null,extraction:"unsupported_binary_not_guessed"};
}

export async function collectAndStageSupremeDecisions(options){
  const collection=await collectSupremeDecisions(options);
  const outDir=collection.outDir;
  const summary={
    type:"mk_supreme_direct_case_law_staging",
    version:SUPREME_STAGE_VERSION,
    created_at:new Date().toISOString(),
    collection_candidates:collection.queue?.candidate_count||0,
    downloaded:collection.records?.length||0,
    metadata_staged:0,
    needs_text_extraction:[],
    human_gate_required:true,
    production_eligible:false
  };

  if(!options.execute||options.dryRun){
    fs.writeFileSync(path.join(outDir,"staging-summary.json"),JSON.stringify(summary,null,2)+"\n");
    return {collection,batch:null,summary};
  }

  const documents=[];
  for(const rec of collection.records||[]){
    if(rec.status && rec.status!=="downloaded") continue;
    if(!rec.filename) continue;
    const filePath=path.join(outDir,rec.filename);
    if(!fs.existsSync(filePath)){
      summary.needs_text_extraction.push({
        filename:rec.filename,
        source_url:rec.final_url||rec.source_url,
        reason:"downloaded_file_missing"
      });
      continue;
    }
    const readable=readableTextForDownloadedFile(filePath,rec.content_type);
    if(readable.status!=="ready"||!readable.text){
      summary.needs_text_extraction.push({
        filename:rec.filename,
        source_url:rec.final_url||rec.source_url,
        content_type:rec.content_type||null,
        reason:readable.extraction
      });
      continue;
    }
    documents.push({
      filename:rec.filename,
      text:readable.text,
      sourceUrl:rec.final_url||rec.source_url,
      sourceClass:"official_public",
      sourceSha256:rec.sha256,
      sourceHashBasis:"downloaded_original_bytes_sha256",
      sourceBindingEvidence:rec.source_binding||null
    });
  }

  const batch=buildCaseLawMetadataBatch(documents);
  summary.metadata_staged=batch.recordCount;
  summary.duplicate_hashes=batch.duplicateHashCount;
  summary.processor_version=batch.processorVersion;

  fs.writeFileSync(path.join(outDir,"case-law-metadata.json"),JSON.stringify(batch,null,2)+"\n");
  fs.writeFileSync(
    path.join(outDir,"case-law-review.ndjson"),
    buildGovernedCaseLawNdjson(batch,{
      runId:"mk-supreme-"+Date.now(),
      sourceProvider:"Врховен суд на Република Северна Македонија",
      sourceClass:"official_public",
      licenseOrAccessBasis:"official_public_bounded_retrieval_pending_human_gate",
      authorizedExport:false
    })
  );
  fs.writeFileSync(path.join(outDir,"staging-summary.json"),JSON.stringify(summary,null,2)+"\n");

  return {collection,batch,summary};
}

function help(){
  return [
    "AI Advokat · direct Supreme Court -> metadata staging",
    "",
    "Discovery only:",
    "  node scripts/collect-and-stage-mk-supreme-decisions.mjs --limit 50 --dry-run",
    "",
    "Bounded direct retrieval + metadata staging after rights review:",
    "  node scripts/collect-and-stage-mk-supreme-decisions.mjs --limit 50 --execute --rights-review mk-supreme-rights-review.json",
    "",
    "Use --limit 100 for the maximum batch.",
    "HTML/text decisions are staged immediately. PDF/DOC/DOCX are downloaded with SHA-256 but remain needs_text_extraction; binary text is never guessed.",
    "All outputs remain production_eligible=false until official-source binding/privacy review/Human Gate are completed."
  ].join("\n");
}

if(import.meta.url==="file://"+process.argv[1]){
  try{
    if(process.argv.includes("--help")||process.argv.includes("-h")){
      console.log(help());
      process.exit(0);
    }
    const options=parseCollectorArgs(process.argv.slice(2));
    const result=await collectAndStageSupremeDecisions(options);
    console.log(JSON.stringify({
      ok:true,
      outDir:result.collection.outDir,
      candidates:result.summary.collection_candidates,
      downloaded:result.summary.downloaded,
      metadataStaged:result.summary.metadata_staged,
      needsTextExtraction:result.summary.needs_text_extraction.length,
      humanGateRequired:true,
      productionEligible:false
    },null,2));
  }catch(error){
    console.error(JSON.stringify({ok:false,error:String(error?.message||error)},null,2));
    process.exit(1);
  }
}
