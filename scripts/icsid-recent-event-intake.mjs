#!/usr/bin/env node
// Governed ICSID recent-event discovery.
// Reads only official public recent-case pages and emits metadata events.
// It does not fetch confidential materials and does not infer merits or legal effect
// from a case lifecycle label.

import fs from "node:fs";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {
  classifyIcsidCaseNumber,
  classifyIcsidPublishedDocument,
  icsidLegalEffect,
  containsNorthMacedoniaAlias
} from "../src/international-legal-classifier.js";

export const ICSID_RECENT_INTAKE_VERSION="1.0.0";
const HOST="icsid.worldbank.org";
const MAX_HTML_BYTES=5_000_000;
const SOURCES=Object.freeze([
  {eventType:"registered",url:"https://icsid.worldbank.org/cases/recent"},
  {eventType:"tribunal_constituted",url:"https://icsid.worldbank.org/cases/recent?type=constituted"},
  {eventType:"document_published",url:"https://icsid.worldbank.org/cases/recent?type=published"},
  {eventType:"concluded",url:"https://icsid.worldbank.org/cases/recent?type=concluded"}
]);

function htmlText(value=""){
  return String(value||"")
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/p>|<\/div>|<\/h[1-6]>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;|&#34;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/\s+/g," ")
    .trim();
}
function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}
function parseDate(value){
  const m=String(value||"").match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/i);
  if(!m) return null;
  const months={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
  return `${m[3]}-${String(months[m[1].toLowerCase()]).padStart(2,"0")}-${String(Number(m[2])).padStart(2,"0")}`;
}
function caseYearFromNumber(caseNo){
  const m=String(caseNo||"").match(/\/(\d{2,4})\/(?:\d+)$/);
  if(!m) return null;
  const n=Number(m[1]);
  return m[1].length===2 ? (n>=70?1900+n:2000+n) : n;
}
function caseNoFromHref(href,title){
  try{
    const url=new URL(String(href).replace(/&amp;/g,"&"),"https://icsid.worldbank.org/");
    const q=url.searchParams.get("CaseNo");
    if(q) return decodeURIComponent(q).trim();
  }catch{}
  const m=String(title||"").match(/ICSID\s+Case\s+No\.\s*([^\)]+)/i);
  return m?m[1].trim():null;
}

export function parseIcsidRecentHtml(html,{eventType,sourceUrl}){
  if(!["registered","tribunal_constituted","document_published","concluded"].includes(eventType)){
    throw new TypeError("icsid_event_type_invalid");
  }
  const out=[];
  const anchorRe=/<a\b[^>]*href=["']([^"']*case-detail\?[^"']*CaseNo=[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of String(html||"").matchAll(anchorRe)){
    const title=htmlText(m[2]);
    if(!title) continue;
    const caseNo=caseNoFromHref(m[1],title);
    if(!caseNo) continue;
    const before=htmlText(String(html).slice(Math.max(0,m.index-1200),m.index));
    const dates=[...before.matchAll(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}\b/gi)];
    const eventDate=parseDate(dates.at(-1)?.[0]||"");
    const canonicalUrl=new URL(String(m[1]).replace(/&amp;/g,"&"),sourceUrl).href;
    const caseClass=classifyIcsidCaseNumber(caseNo);
    const published=eventType==="document_published"
      ? classifyIcsidPublishedDocument(title)
      : {documentTypes:[],primaryDocumentType:null,compoundDocument:false,requiresDocumentSplit:false,humanReviewRequired:false};
    const effect=published.primaryDocumentType
      ? icsidLegalEffect({regime:caseClass.regime,documentType:published.primaryDocumentType})
      : null;
    const caseYear=caseYearFromNumber(caseClass.normalized);
    const eventYear=eventDate?Number(eventDate.slice(0,4)):null;
    const chronologyFlag=caseYear && eventYear && caseYear!==eventYear
      ? "case_number_year_differs_from_event_year_review"
      : null;
    const stableSeed=[eventType,caseClass.normalized,eventDate||"",title,canonicalUrl].join("|");
    out.push({
      event_id:"ICSID:"+sha256(stableSeed).slice(0,24),
      source_id:"icsid-cases",
      event_type:eventType,
      source_event_date:eventDate,
      case_number:caseNo,
      case_number_normalized:caseClass.normalized,
      case_regime:caseClass.regime,
      proceeding_type:caseClass.proceedingType,
      case_title_or_publication_title:title,
      source_url:canonicalUrl,
      north_macedonia_relevance:containsNorthMacedoniaAlias(title),
      published_document_types:published.documentTypes,
      published_document_primary_type:published.primaryDocumentType,
      compound_document:Boolean(published.compoundDocument),
      legal_effect:effect?.effect||null,
      article_54_convention_enforcement:Boolean(effect?.article54ConventionEnforcement),
      chronology_flag:chronologyFlag,
      human_review_required:true,
      production_eligible:false
    });
  }
  return [...new Map(out.map(x=>[x.event_id,x])).values()];
}

async function boundedFetch(url){
  const parsed=new URL(url);
  if(parsed.protocol!=="https:" || parsed.hostname!==HOST) throw new Error("icsid_source_not_allowed");
  const response=await fetch(url,{headers:{"user-agent":"AI-Advokat/1.0 governed-ICSID-event-discovery"}});
  if(!response.ok) throw new Error("icsid_fetch_"+response.status);
  const text=await response.text();
  if(Buffer.byteLength(text,"utf8")>MAX_HTML_BYTES) throw new Error("icsid_html_too_large");
  return text;
}

export async function collectIcsidRecentEvents(){
  const events=[];
  const coverage=[];
  for(const source of SOURCES){
    const html=await boundedFetch(source.url);
    const parsed=parseIcsidRecentHtml(html,{eventType:source.eventType,sourceUrl:source.url});
    if(parsed.length===0) throw new Error("icsid_zero_events_"+source.eventType);
    events.push(...parsed);
    coverage.push({event_type:source.eventType,source_url:source.url,count:parsed.length});
  }
  return {
    events:[...new Map(events.map(x=>[x.event_id,x])).values()],
    coverage
  };
}

async function main(){
  const outPath=process.argv[2]||"/tmp/icsid-recent-events.ndjson";
  const {events,coverage}=await collectIcsidRecentEvents();
  fs.writeFileSync(outPath,events.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
  const manifest={
    schema_version:"1.0",
    intake_version:ICSID_RECENT_INTAKE_VERSION,
    generated_at:new Date().toISOString(),
    event_count:events.length,
    coverage,
    governance:{
      discovery_only:true,
      document_downloaded:false,
      confidential_surface_accessed:false,
      human_gate_required:true,
      production_eligible:false
    }
  };
  fs.writeFileSync(outPath.replace(/\.ndjson$/i,"")+".manifest.json",JSON.stringify(manifest,null,2)+"\n","utf8");
}

if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  main().catch(error=>{console.error(error);process.exit(1);});
}
