#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {parseAmendmentText} from "./parse-mk-amendment-text.mjs";

export const CURRENT_LAW_STAGE_VERSION="AI_ADVOCAT_CURRENT_LAW_STAGE_R2";
const ALLOWED_HOSTS=new Set([
  "sobranie.mk","www.sobranie.mk",
  "slvesnik.com.mk","www.slvesnik.com.mk",
  "ldbis.pravda.gov.mk"
]);
const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
const safeName=s=>String(s||"candidate").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,90);
const compact=s=>String(s||"").normalize("NFKC").replace(/\r\n?/g,"\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();

function hostAllowed(url){
  try{return ALLOWED_HOSTS.has(new URL(url).hostname.toLowerCase());}
  catch{return false;}
}
function htmlToText(html){
  return compact(String(html||"")
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<!--([\s\S]*?)-->/g," ")
    .replace(/<br\s*\/?>/gi,"\n")
    .replace(/<\/p>/gi,"\n")
    .replace(/<\/div>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/g,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">"));
}
function looksLikeAmendingAct(label,text){
  const s=(String(label||"")+"\n"+String(text||"")).toLocaleLowerCase("mk");
  return /закон(?:от)?\s+за\s+изменување|изменување\s+и\s+дополнување|се\s+менува|се\s+додава|се\s+брише/u.test(s);
}

async function fetchBytes(url){
  if(!hostAllowed(url)) throw new Error("source_host_not_allowed");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const r=await fetch(url,{
      redirect:"follow",signal:controller.signal,
      headers:{"user-agent":"AI-Advokat-Current-Law-Stage/1.0","accept":"text/html,application/pdf,text/plain,*/*;q=0.2"}
    });
    const bytes=Buffer.from(await r.arrayBuffer());
    return {ok:r.ok,status:r.status,final_url:r.url||url,content_type:r.headers.get("content-type")||"",bytes};
  }finally{clearTimeout(timer);}
}

function issueNumberFromText(value){
  const m=String(value||"").match(/(?:бр\.?|број)\s*([0-9]+(?:\/[0-9]{4})?)/iu);
  return m?m[1]:null;
}
function dateFromText(value){
  const iso=String(value||"").match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if(iso)return iso[1];
  const d=String(value||"").match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/);
  if(!d)return null;
  return d[3]+"-"+String(d[2]).padStart(2,"0")+"-"+String(d[1]).padStart(2,"0");
}

export async function stageCandidates(snapshot,outDir){
  fs.mkdirSync(outDir,{recursive:true});
  const incoming=snapshot?.diff?.new_candidates||[];
  const staged=[];
  for(let i=0;i<incoming.length;i++){
    const c=incoming[i];
    const record={
      index:i,
      source_id:c.source_id,
      canonical_key:c.canonical_key||null,
      instrument_title:c.instrument_title||null,
      label:c.label||"",
      url:c.url,
      legal_stage:c.legal_stage,
      status:"PENDING_RETRIEVAL",
      automatic_current_law_promotion:false,
      human_gate_required:true
    };
    if(c.legal_stage==="SECONDARY_CHANGE_SIGNAL" || c.source_role==="secondary_corroboration_signal"){
      record.status="SECONDARY_SIGNAL_ONLY_OFFICIAL_BINDING_REQUIRED";
      record.retrieval_attempted=false;
      record.official_binding_required=true;
      record.allowed_official_binding_sources=["mk-sobranie","mk-official-gazette","mk-ldbis"];
      staged.push(record);
      continue;
    }
    if(!hostAllowed(c.url)){
      record.status="BLOCKED_UNREGISTERED_HOST";
      staged.push(record);
      continue;
    }
    let f;
    try{f=await fetchBytes(c.url);}
    catch(error){
      record.status="RETRIEVAL_FAILED";
      record.error=String(error?.message||error);
      staged.push(record);
      continue;
    }
    record.http_status=f.status;
    record.final_url=f.final_url;
    record.content_type=f.content_type;
    record.source_sha256=sha256(f.bytes);
    record.bytes=f.bytes.length;
    if(!f.ok){
      record.status="RETRIEVAL_HTTP_ERROR";
      staged.push(record);
      continue;
    }

    const stem=String(i+1).padStart(3,"0")+"-"+safeName(c.canonical_key||c.source_id);
    if(/application\/pdf/i.test(f.content_type) || /\.pdf(?:$|\?)/i.test(f.final_url)){
      const p=path.join(outDir,stem+".pdf");
      fs.writeFileSync(p,f.bytes);
      record.status="PDF_CAPTURED_TEXT_EXTRACTION_REQUIRED";
      record.local_file=path.basename(p);
      staged.push(record);
      continue;
    }

    const decoded=f.bytes.toString("utf8");
    const text=/html/i.test(f.content_type)?htmlToText(decoded):compact(decoded);
    const txtPath=path.join(outDir,stem+".txt");
    fs.writeFileSync(txtPath,text+"\n","utf8");
    record.local_file=path.basename(txtPath);
    record.text_sha256=sha256(Buffer.from(text));
    record.text_chars=text.length;

    if(!c.canonical_key){
      record.status="TEXT_CAPTURED_INSTRUMENT_BINDING_REQUIRED";
      staged.push(record);
      continue;
    }
    if(!looksLikeAmendingAct(c.label,text)){
      record.status="TEXT_CAPTURED_NOT_CLASSIFIED_AS_AMENDING_ACT";
      staged.push(record);
      continue;
    }
    try{
      const parsed=parseAmendmentText(text,{
        instrument_key:c.canonical_key,
        instrument_title:c.instrument_title||c.canonical_key,
        amendment_title:c.label||"Official amendment candidate",
        source_url:f.final_url,
        source_sha256:record.source_sha256,
        source_issue_number:issueNumberFromText(c.label+"\n"+text),
        source_issue_date:dateFromText(c.label+"\n"+text)
      });
      const ndjson=[
        JSON.stringify({type:"amendment_manifest",...parsed,events:undefined}),
        ...parsed.events.map(e=>JSON.stringify({type:"amendment_event",...e}))
      ].join("\n")+"\n";
      const out=path.join(outDir,stem+".amendments.ndjson");
      fs.writeFileSync(out,ndjson,"utf8");
      record.status=parsed.warning_count?"AMENDMENT_EVENTS_STAGED_WITH_WARNINGS":"AMENDMENT_EVENTS_STAGED";
      record.amendment_event_count=parsed.event_count;
      record.warning_count=parsed.warning_count;
      record.events_file=path.basename(out);
    }catch(error){
      record.status="TEXT_CAPTURED_AMENDMENT_PARSE_REVIEW_REQUIRED";
      record.parse_error=String(error?.message||error);
    }
    staged.push(record);
  }

  const manifest={
    version:CURRENT_LAW_STAGE_VERSION,
    created_at:new Date().toISOString(),
    source_watch_version:snapshot?.version||null,
    automatic_database_write:false,
    automatic_current_law_promotion:false,
    human_gate_required:true,
    counts:{
      incoming:incoming.length,
      staged:staged.length,
      amendment_events_ready:staged.filter(x=>/^AMENDMENT_EVENTS_STAGED/.test(x.status)).length,
      pdf_text_extraction_required:staged.filter(x=>x.status==="PDF_CAPTURED_TEXT_EXTRACTION_REQUIRED").length,
      review_required:staged.filter(x=>/REQUIRED|FAILED|ERROR|BLOCKED/.test(x.status)).length,
      secondary_signals:staged.filter(x=>x.status==="SECONDARY_SIGNAL_ONLY_OFFICIAL_BINDING_REQUIRED").length
    },
    records:staged
  };
  fs.writeFileSync(path.join(outDir,"stage-manifest.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
  return manifest;
}

async function main(){
  const [,,snapshotPath,outDir]=process.argv;
  if(!snapshotPath||!outDir){
    console.error("Usage: node scripts/mk-current-law-stage-candidates.mjs <watch-snapshot.json> <out-dir>");
    process.exit(2);
  }
  const snapshot=JSON.parse(fs.readFileSync(snapshotPath,"utf8"));
  const manifest=await stageCandidates(snapshot,outDir);
  console.log(JSON.stringify({version:manifest.version,counts:manifest.counts}));
}
if(import.meta.url===`file://${process.argv[1]}`){
  main().catch(error=>{console.error(error);process.exit(1);});
}
