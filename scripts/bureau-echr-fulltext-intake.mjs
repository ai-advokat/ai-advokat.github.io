#!/usr/bin/env node
// Official ECHR/MK Bureau PDF full-text intake.
// Fetches only the public Ministry of Justice / Bureau index and public PDF links.
// Produces chunked NDJSON with provenance. It does NOT mark legal holdings as reviewed.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {spawnSync} from "node:child_process";

const INDEX_URL="https://biroescp.gov.mk/пресуди-и-одлуки-на-рм/";
const INDEX_FILES=[
  "corpus/echr/north-macedonia-bureau-index-2026-2018.ndjson",
  "corpus/echr/north-macedonia-bureau-index-2017-2010.ndjson",
  "corpus/echr/north-macedonia-bureau-index-2009-2001.ndjson"
];
const MAX_PDF_BYTES=30_000_000;
const CHUNK_CHARS=12000;

function cleanHtmlText(value){
  return String(value||"")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&#8211;|&#8212;/g,"-")
    .replace(/\s+/g," ")
    .trim();
}
function norm(value){
  return String(value||"").normalize("NFKC").toLocaleLowerCase("mk")
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
}
function titleTokens(value){
  return norm(value).split(" ").filter(x=>x.length>=4 && !["против","северна","македонија","република","presuda","одлука"].includes(x));
}
function similarity(a,b){
  const A=titleTokens(a), B=new Set(titleTokens(b));
  if(!A.length) return 0;
  return A.filter(x=>B.has(x)).length/A.length;
}
function loadIndex(){
  return INDEX_FILES.flatMap(file=>fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse));
}
function pdfLinks(html){
  const out=[];
  const re=/<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of html.matchAll(re)){
    const href=new URL(m[1],INDEX_URL).href;
    if(new URL(href).hostname!=="biroescp.gov.mk") continue;
    out.push({url:href,anchorText:cleanHtmlText(m[2]),filename:decodeURIComponent(new URL(href).pathname.split("/").pop()||"")});
  }
  return [...new Map(out.map(x=>[x.url,x])).values()];
}
function listingYear(value){
  const m=String(value||"").match(/\b(20\d{2}|19\d{2})\b/);
  return m?m[1]:null;
}
function titleContainedInTextScore(text,title){
  const tokens=titleTokens(title);
  if(!tokens.length) return 0;
  const hay=norm(text);
  let found=0;
  for(const token of tokens){
    if(hay.includes(token)) found++;
  }
  return found/tokens.length;
}
function candidateScore(linkSeed,pdfText,record){
  // Keep link/filename similarity and PDF-content similarity as independent signals.
  // Concatenating a long PDF body into the seed dilutes the title score and caused
  // the #263 regression (1/301 matched).
  const linkScore=similarity(linkSeed,record.title);
  const contentScore=titleContainedInTextScore(String(pdfText||"").slice(0,8000),record.title);
  const seedYear=listingYear(linkSeed);
  const recordYear=listingYear(record.listing_period);
  const yearBonus=seedYear&&recordYear&&seedYear===recordYear ? 0.08 : 0;
  const combined=Math.max(
    linkScore,
    contentScore>=0.80 ? contentScore : 0,
    (linkScore>=0.45 && contentScore>=0.50) ? (0.58*linkScore+0.42*contentScore) : 0
  );
  return Math.min(1.08,combined+yearBonus);
}
function bestIndexRecord(link,records,usedIds=new Set(),pdfText=""){
  const linkSeed=[link.anchorText,decodeURIComponent(link.filename||"").replace(/\.pdf$/i,"")].filter(Boolean).join(" ");
  // Rank against ALL records. Never remove an already-used true candidate, because
  // doing so can make an unrelated unused record appear to be the best match.
  const ranked=records
    .map(record=>({record,score:candidateScore(linkSeed,pdfText,record)}))
    .sort((a,b)=>b.score-a.score);
  const first=ranked[0]||null;
  const second=ranked[1]||null;
  if(!first) return null;
  const margin=first.score-(second?.score||0);
  // Fail closed: require both a meaningful score and separation from the runner-up.
  if(first.score<0.55 || margin<0.05) return null;
  return {
    record:first.record,
    score:first.score,
    margin,
    duplicateArtifact:Boolean(first.record?.chunk_id && usedIds.has(first.record.chunk_id))
  };
}
function chunks(text){
  const clean=String(text||"").replace(/\r/g,"").replace(/[ \t]+\n/g,"\n").replace(/\n{4,}/g,"\n\n\n").trim();
  const out=[];
  for(let i=0;i<clean.length;i+=CHUNK_CHARS) out.push(clean.slice(i,i+CHUNK_CHARS));
  return out;
}
function extractApplicationNumbers(text){
  const sample=String(text||"").slice(0,12000);
  const values=[];
  for(const match of sample.matchAll(/\b(\d{1,6})\s*\/\s*(\d{2,4})\b/g)){
    const raw=match[1]+"/"+match[2];
    if(!values.includes(raw)) values.push(raw);
    if(values.length>=12) break;
  }
  return values;
}
async function main(){
  const outPath=process.argv[2]||"corpus/echr/bureau-mk-fulltext.generated.ndjson";
  const htmlRes=await fetch(INDEX_URL,{headers:{"user-agent":"AI-Advokat/1.0 official-public-corpus-intake"}});
  if(!htmlRes.ok) throw new Error("Bureau index fetch failed: "+htmlRes.status);
  const html=await htmlRes.text();
  const links=pdfLinks(html);
  if(links.length<200) throw new Error("Unexpectedly low PDF count: "+links.length);
  const records=loadIndex();
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ai-advokat-echr-"));
  const out=[];
  const matchedIndexIds=new Set();
  const processedPdfHashes=new Set();
  const duplicateArtifacts=[];
  const matchDiagnostics=[];
  const failures=[];
  let processed=0,failed=0;
  for(const [i,link] of links.entries()){
    try{
      const res=await fetch(link.url,{headers:{"user-agent":"AI-Advokat/1.0 official-public-corpus-intake"}});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const bytes=Buffer.from(await res.arrayBuffer());
      if(!bytes.length||bytes.length>MAX_PDF_BYTES) throw new Error("invalid PDF size");
      const sha=crypto.createHash("sha256").update(bytes).digest("hex");
      const pdf=path.join(tmp,"case-"+i+".pdf");
      const txt=path.join(tmp,"case-"+i+".txt");
      fs.writeFileSync(pdf,bytes);
      const pdftotext=spawnSync("pdftotext",["-layout","-enc","UTF-8",pdf,txt],{encoding:"utf8"});
      if(pdftotext.status!==0) throw new Error("pdftotext failed");
      const text=fs.readFileSync(txt,"utf8").trim();
      if(text.length<100) throw new Error("extracted text too short");
      const applicationNumbers=extractApplicationNumbers(text);
      const match=bestIndexRecord(link,records,matchedIndexIds,text);
      const matched=match?.record||null;
      if(matched?.chunk_id){
        matchDiagnostics.push({
          source_url:link.url,
          chunk_id:matched.chunk_id,
          title:matched.title,
          score:Math.round(match.score*10000)/10000,
          margin:Math.round(match.margin*10000)/10000,
          duplicate_artifact:match.duplicateArtifact,
          method:"independent_link_filename_and_pdf_title_containment",
          application_numbers:applicationNumbers
        });
        if(match.duplicateArtifact){
          duplicateArtifacts.push({
            chunk_id:matched.chunk_id,
            title:matched.title,
            source_url:link.url,
            score:Math.round(match.score*10000)/10000,
            margin:Math.round(match.margin*10000)/10000
          });
        }else{
          matchedIndexIds.add(matched.chunk_id);
        }
      }
      processedPdfHashes.add(sha);
      const title=matched?.title || link.anchorText || link.filename.replace(/\.pdf$/i,"");
      const pieces=chunks(text);
      pieces.forEach((piece,chunkIndex)=>out.push(JSON.stringify({
        chunk_id:"ECHR:MK-BUREAU:FULLTEXT:"+sha.slice(0,16)+":"+String(chunkIndex+1).padStart(4,"0"),
        chunk_type:"official_domestic_echr_translation_fulltext",
        jurisdiction:"ECHR",
        domestic_jurisdiction:"MK",
        source_id:"mk-echr-representation-bureau",
        source_name:"Биро за застапување на Република Северна Македонија пред Европскиот суд за човекови права",
        authority_class:"official_domestic_echr_reference",
        title,
        listing_period:matched?.listing_period||null,
        source_url:link.url,
        source_sha256:sha,
        application_numbers:applicationNumbers,
        source_language:"mk",
        translation_status:"official_domestic_reference_not_echr_authoritative_language",
        hudoc_binding_required:true,
        full_case_text_ingested:true,
        chunk_index:chunkIndex+1,
        chunk_count:pieces.length,
        text:piece,
        human_review_status:"pending"
      })));
      processed++;
    }catch(error){
      failed++;
      const reason=String(error?.message||error);
      failures.push({url:link.url,anchorText:link.anchorText||null,filename:link.filename||null,reason});
      console.error("FAIL",link.url,reason);
    }
  }
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,out.join("\n")+"\n","utf8");

  const unmatchedIndexRecords=records
    .filter(record=>record?.chunk_id && !matchedIndexIds.has(record.chunk_id))
    .map(record=>({
      chunk_id:record.chunk_id,
      title:record.title,
      listing_period:record.listing_period,
      source_url:record.source_url
    }));

  const manifest={
    generated_at:new Date().toISOString(),
    source_index_url:INDEX_URL,
    index_records:records.length,
    pdf_links:links.length,
    processed_pdf_links:processed,
    unique_processed_pdf_hashes:processedPdfHashes.size,
    failed_pdf_links:failed,
    fulltext_chunks:out.length,
    matched_index_records:matchedIndexIds.size,
    unmatched_index_records:unmatchedIndexRecords,
    match_diagnostics:matchDiagnostics,
    duplicate_artifacts:duplicateArtifacts,
    failures,
    governance:{
      human_review_status:"pending",
      hudoc_binding_required:true,
      professional_reliance_without_human_gate:false
    }
  };
  const manifestPath=outPath.replace(/\.ndjson$/i,"")+".manifest.json";
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+"\n","utf8");
  console.error(JSON.stringify({
    pdfLinks:links.length,
    processed,
    failed,
    chunks:out.length,
    indexRecords:records.length,
    matchedIndexRecords:matchedIndexIds.size,
    unmatchedIndexRecords:unmatchedIndexRecords.length,
    duplicateArtifacts:duplicateArtifacts.length,
    manifestPath,
    outPath
  }));
  if(processed<200) throw new Error("Too few PDFs processed safely: "+processed);
  if(records.length!==301) throw new Error("Unexpected Bureau index record count: "+records.length);
}
main().catch(error=>{console.error(error);process.exit(1);});
