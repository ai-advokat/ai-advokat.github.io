#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {htmlToPlainText} from "./collect-and-stage-mk-supreme-decisions.mjs";

export const CONSTITUTIONAL_INTAKE_VERSION="1.0.0";
export const CONSTITUTIONAL_INDEX_URL="https://ustavensud.mk/mk/%D0%BE%D0%B4%D0%BB%D1%83%D0%BA%D0%B8-%D0%B8-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%98%D0%B0/";

function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}
function safeInt(v,d,min,max){const n=Number.parseInt(String(v||""),10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):d;}
function decode(s=""){return String(s).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/&#(\d+);/g,(_m,n)=>String.fromCodePoint(Number(n)));}
function strip(s=""){return decode(String(s).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());}

export function parseArgs(args=[]){
  const out={pages:5,limit:100,execute:false,outDir:"work/mk-constitutional-court"};
  for(let i=0;i<args.length;i++){
    const a=args[i];
    if(a==="--execute") out.execute=true;
    else if(a==="--pages") out.pages=safeInt(args[++i],5,1,50);
    else if(a==="--limit") out.limit=safeInt(args[++i],100,1,500);
    else if(a==="--out") out.outDir=String(args[++i]||out.outDir);
  }
  return out;
}

export function extractDecisionLinks(html="",base=CONSTITUTIONAL_INDEX_URL){
  const found=[];
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu;
  for(const m of String(html).matchAll(re)){
    let href=decode(m[1]);
    const label=strip(m[2]);
    if(!href||!label) continue;
    try{href=new URL(href,base).toString();}catch{continue;}
    if(!href.startsWith("https://ustavensud.mk/")) continue;
    if(!/(?:У|УЗ|БЗСП|И)\.?\s*бр\.?|U\.?\s*no\.?|UZ\.?\s*No\.?|BZSP/iu.test(label)) continue;
    if(/\/mk\/(?:одлуки|решенија|odluki|reshenija)/iu.test(href)) continue;
    found.push({title:label,url:href});
  }
  const seen=new Set();
  return found.filter(x=>!seen.has(x.url)&&(seen.add(x.url),true));
}

export async function discoverConstitutionalDecisions({pages=5,limit=100,fetchImpl=fetch}={}){
  const records=[];
  const seen=new Set();
  for(let page=1;page<=pages && records.length<limit;page++){
    const u=new URL(CONSTITUTIONAL_INDEX_URL);
    if(page>1) u.searchParams.set("query-4-page",String(page));
    const r=await fetchImpl(u,{headers:{"user-agent":"AI-Advokat-Official-Public-Source-Discovery/1.0"}});
    if(!r.ok) throw new Error("constitutional_index_http_"+r.status);
    const html=await r.text();
    for(const item of extractDecisionLinks(html,u)){
      if(seen.has(item.url)) continue;
      seen.add(item.url);
      records.push({...item,indexPage:page});
      if(records.length>=limit) break;
    }
  }
  return records;
}

export async function fetchOfficialDecision(record,{fetchImpl=fetch}={}){
  const r=await fetchImpl(record.url,{headers:{"user-agent":"AI-Advokat-Official-Public-Source-Discovery/1.0"}});
  if(!r.ok) return {...record,status:"fetch_failed",httpStatus:r.status};
  const html=await r.text();
  const text=htmlToPlainText(html);
  if(!text||text.length<100) return {...record,status:"text_too_short"};
  return {
    ...record,
    status:"downloaded_official_html",
    fetchedAt:new Date().toISOString(),
    sourceSha256:sha256(Buffer.from(html,"utf8")),
    textSha256:sha256(Buffer.from(text,"utf8")),
    text
  };
}

export async function run(options=parseArgs(process.argv.slice(2))){
  fs.mkdirSync(options.outDir,{recursive:true});
  const discovered=await discoverConstitutionalDecisions(options);
  fs.writeFileSync(path.join(options.outDir,"discovery.json"),JSON.stringify({
    schema:"ai-advokat.mk-constitutional-court.discovery.v1",
    source:CONSTITUTIONAL_INDEX_URL,
    createdAt:new Date().toISOString(),
    count:discovered.length,
    records:discovered
  },null,2)+"\n");

  if(!options.execute){
    return {ok:true,mode:"discovery",discovered:discovered.length,outDir:options.outDir,productionEligible:false,humanGateRequired:true};
  }

  const out=[];
  for(const rec of discovered){
    const full=await fetchOfficialDecision(rec,options);
    if(full.status!=="downloaded_official_html"){out.push(full);continue;}
    out.push({
      type:"case_law_case",
      schema_version:"1.0",
      jurisdiction:"MK",
      authority_class:"constitutional_review",
      court:"Уставен суд на Република Северна Македонија",
      title:full.title,
      source_url:full.url,
      source_class:"official_public",
      source_sha256:full.sourceSha256,
      extracted_text_sha256:full.textSha256,
      full_text:full.text,
      official_binding_verified:true,
      current_law_applicability_verified:false,
      holding_verified:false,
      production_eligible:false,
      human_gate_required:true,
      review_status:"pending_legal_review"
    });
  }
  const ndjson=out.map(x=>JSON.stringify(x)).join("\n")+"\n";
  fs.writeFileSync(path.join(options.outDir,"constitutional-court-review.ndjson"),ndjson);
  fs.writeFileSync(path.join(options.outDir,"staging-summary.json"),JSON.stringify({
    type:"mk_constitutional_court_official_intake",
    version:CONSTITUTIONAL_INTAKE_VERSION,
    createdAt:new Date().toISOString(),
    discovered:discovered.length,
    fetched:out.filter(x=>x.type==="case_law_case").length,
    failed:out.filter(x=>x.type!=="case_law_case").length,
    productionEligible:false,
    humanGateRequired:true,
    source:CONSTITUTIONAL_INDEX_URL
  },null,2)+"\n");
  return {ok:true,mode:"execute",discovered:discovered.length,fetched:out.filter(x=>x.type==="case_law_case").length,outDir:options.outDir,productionEligible:false,humanGateRequired:true};
}

if(import.meta.url==="file://"+process.argv[1]){
  run().then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(JSON.stringify({ok:false,error:String(e?.message||e)},null,2));process.exit(1);});
}
