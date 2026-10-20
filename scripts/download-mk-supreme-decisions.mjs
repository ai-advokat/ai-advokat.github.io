#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const SUPREME_DOWNLOADER_VERSION = "1.0.0";
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const DEFAULT_DELAY_MS = 2500;
export const MIN_DELAY_MS = 1500;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const OFFICIAL_HOSTS = new Set(["vrhoven.sud.mk","www.vrhoven.sud.mk"]);

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function sha256(buf){ return crypto.createHash("sha256").update(buf).digest("hex"); }
function safeName(value="decision"){
  return String(value).normalize("NFKC").replace(/[^\p{L}\p{N}._-]+/gu,"_").replace(/^_+|_+$/g,"").slice(0,140)||"decision";
}

export function normalizeOfficialUrl(value){
  let url;
  try { url = new URL(String(value||"")); } catch { throw new TypeError("supreme_url_invalid"); }
  if(url.protocol !== "https:") throw new TypeError("supreme_https_required");
  if(!OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) throw new TypeError("supreme_official_host_required");
  url.hash="";
  return url;
}

export function parseArgs(argv=process.argv.slice(2)){
  const out={
    indexUrls:[], urlFile:null, limit:DEFAULT_LIMIT, delayMs:DEFAULT_DELAY_MS,
    maxPages:8, outDir:null, execute:false, rightsReview:null, dryRun:false
  };
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a==="--index-url") out.indexUrls.push(argv[++i]);
    else if(a==="--url-file") out.urlFile=argv[++i];
    else if(a==="--limit") out.limit=Number(argv[++i]);
    else if(a==="--delay-ms") out.delayMs=Number(argv[++i]);
    else if(a==="--max-pages") out.maxPages=Number(argv[++i]);
    else if(a==="--out") out.outDir=argv[++i];
    else if(a==="--execute") out.execute=true;
    else if(a==="--dry-run") out.dryRun=true;
    else if(a==="--rights-review") out.rightsReview=argv[++i];
    else if(a==="--help" || a==="-h") out.help=true;
    else throw new TypeError(`unknown_argument:${a}`);
  }
  if(!Number.isInteger(out.limit)||out.limit<1||out.limit>MAX_LIMIT) throw new TypeError("supreme_limit_must_be_1_to_100");
  if(!Number.isInteger(out.delayMs)||out.delayMs<MIN_DELAY_MS) throw new TypeError(`supreme_delay_min_${MIN_DELAY_MS}`);
  if(!Number.isInteger(out.maxPages)||out.maxPages<1||out.maxPages>30) throw new TypeError("supreme_max_pages_must_be_1_to_30");
  return out;
}

export function parseRobots(text=""){
  const normalized=String(text).replace(/\\n/g,"\n");
  const lines=normalized.split(/\r?\n/).map(x=>x.replace(/#.*$/,"").trim()).filter(Boolean);
  const groups=[];
  let current=null;
  for(const line of lines){
    const idx=line.indexOf(":");
    if(idx<0) continue;
    const key=line.slice(0,idx).trim().toLowerCase();
    const value=line.slice(idx+1).trim();
    if(key==="user-agent"){
      if(!current || current.rules.length){ current={agents:[],rules:[]}; groups.push(current); }
      current.agents.push(value.toLowerCase());
    }else if(current && (key==="allow"||key==="disallow")){
      current.rules.push({type:key,path:value});
    }
  }
  return groups;
}

export function robotsAllows(groups, pathname, userAgent="AIAdvokatResearchBot"){
  const ua=userAgent.toLowerCase();
  const applicable=groups.filter(g=>g.agents.some(a=>a==="*"||ua.includes(a)));
  let best=null;
  for(const g of applicable){
    for(const rule of g.rules){
      if(!rule.path) continue;
      if(pathname.startsWith(rule.path)){
        if(!best || rule.path.length>best.path.length || (rule.path.length===best.path.length && rule.type==="allow")) best=rule;
      }
    }
  }
  return !best || best.type!=="disallow";
}

function decodeHtml(s=""){
  return String(s)
    .replace(/&amp;/g,"&").replace(/&quot;/g,"\"").replace(/&#39;/g,"'")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">");
}

export function extractLinks(html, baseUrl){
  const base=normalizeOfficialUrl(baseUrl);
  const out=[];
  const seen=new Set();
  const re=/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/giu;
  for(const m of String(html).matchAll(re)){
    const href=decodeHtml(m[1]||m[2]||m[3]||"").trim();
    const label=decodeHtml((m[4]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());
    if(!href || href.startsWith("#") || /^javascript:/i.test(href) || /^mailto:/i.test(href)) continue;
    let url;
    try{ url=new URL(href,base); }catch{ continue; }
    if(url.protocol!=="https:" || !OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) continue;
    url.hash="";
    const key=url.href;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push({url:key,label});
  }
  return out;
}

export function isDecisionCandidate(link){
  const u=String(link?.url||"").toLocaleLowerCase("mk");
  const label=String(link?.label||"").toLocaleLowerCase("mk");
  const hay=`${u} ${label}`;
  if(/\.(?:pdf|docx?|rtf)(?:\?|$)/iu.test(u)) return true;
  return /(пресуд|решени|одлук|рев\.?|квп|кзз|гзз|вкж|предмет|судска[-_\s]*пракса|judg|decision|case)/iu.test(hay);
}

export function isLikelyIndexLink(link){
  const hay=`${link?.url||""} ${link?.label||""}`.toLocaleLowerCase("mk");
  return /(одлук|пресуд|судска[-_\s]*пракса|предмет|search|page=|страна|следн|next|архив)/iu.test(hay);
}

export function loadRightsReview(filePath){
  if(!filePath) return null;
  const obj=JSON.parse(fs.readFileSync(filePath,"utf8"));
  if(obj?.source_id!=="mk-supreme-court") throw new TypeError("rights_review_wrong_source");
  if(obj?.approved_for_bounded_automated_retrieval!==true) throw new TypeError("rights_review_not_approved");
  if(!obj?.reviewed_on || !obj?.reviewed_by || !obj?.basis) throw new TypeError("rights_review_incomplete");
  return obj;
}

async function fetchWithPolicy(url,{userAgent,timeoutMs=30000,maxBytes=MAX_FILE_BYTES}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{
      headers:{
        "user-agent":userAgent,
        "accept":"text/html,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document;q=0.9,*/*;q=0.5"
      },
      redirect:"manual",
      signal:controller.signal
    });
    if([301,302,303,307,308].includes(response.status)){
      const loc=response.headers.get("location");
      if(!loc) throw new Error(`redirect_without_location:${response.status}`);
      const target=normalizeOfficialUrl(new URL(loc,url).href);
      return fetchWithPolicy(target.href,{userAgent,timeoutMs,maxBytes});
    }
    if(response.status===429 || response.status===503){
      const retry=Number(response.headers.get("retry-after"));
      const err=new Error(`retryable_http_${response.status}`);
      err.retryAfter=Number.isFinite(retry)?retry*1000:null;
      throw err;
    }
    if(!response.ok) throw new Error(`http_${response.status}`);
    const declared=Number(response.headers.get("content-length"));
    if(Number.isFinite(declared) && declared>maxBytes) throw new Error("supreme_file_too_large");
    const buf=Buffer.from(await response.arrayBuffer());
    if(buf.length>maxBytes) throw new Error("supreme_file_too_large");
    return {response,buf,url:response.url||url};
  }finally{
    clearTimeout(timer);
  }
}

async function ensureRobots(base,userAgent){
  const robotsUrl=new URL("/robots.txt",base).href;
  try{
    const r=await fetch(robotsUrl,{headers:{"user-agent":userAgent},redirect:"manual"});
    if(r.status===404) return {url:robotsUrl,status:"not_present",groups:[]};
    if(!r.ok) throw new Error(`robots_http_${r.status}`);
    const text=await r.text();
    return {url:robotsUrl,status:"loaded",groups:parseRobots(text),text};
  }catch(error){
    throw new Error(`robots_check_failed:${error?.message||error}`);
  }
}

function extensionFor(contentType,url){
  const lower=String(contentType||"").toLowerCase();
  const ext=path.extname(new URL(url).pathname).toLowerCase();
  if([".pdf",".doc",".docx",".rtf",".html",".htm"].includes(ext)) return ext===".htm"?".html":ext;
  if(lower.includes("pdf")) return ".pdf";
  if(lower.includes("wordprocessingml")) return ".docx";
  if(lower.includes("msword")) return ".doc";
  if(lower.includes("rtf")) return ".rtf";
  return ".html";
}

async function discoverFromIndexes(indexUrls,{limit,maxPages,userAgent,delayMs}){
  const queue=indexUrls.map(x=>normalizeOfficialUrl(x).href);
  const visited=new Set();
  const candidates=[];
  const candidateSeen=new Set();
  let robots=null;
  while(queue.length && visited.size<maxPages && candidates.length<limit*3){
    const url=queue.shift();
    if(visited.has(url)) continue;
    visited.add(url);
    robots ||= await ensureRobots(url,userAgent);
    const u=normalizeOfficialUrl(url);
    if(!robotsAllows(robots.groups,u.pathname,userAgent)) throw new Error(`robots_disallow:${u.pathname}`);
    const {response,buf}=await fetchWithPolicy(url,{userAgent,maxBytes:5*1024*1024});
    const ct=response.headers.get("content-type")||"";
    if(!/html/i.test(ct)) continue;
    const links=extractLinks(buf.toString("utf8"),url);
    for(const link of links){
      if(isDecisionCandidate(link) && !candidateSeen.has(link.url)){
        candidateSeen.add(link.url);
        candidates.push(link);
      }
      if(isLikelyIndexLink(link) && !visited.has(link.url) && queue.length<maxPages*5) queue.push(link.url);
    }
    if(queue.length) await sleep(delayMs);
  }
  return {candidates,visited:[...visited],robots};
}

function loadUrlFile(file){
  if(!file) return [];
  const lines=fs.readFileSync(file,"utf8").split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !x.startsWith("#"));
  return lines.map(url=>({url:normalizeOfficialUrl(url).href,label:""}));
}

export async function run(options){
  const userAgent="AIAdvokatResearchBot/1.0 (+https://ai-advokat.github.io/)";
  const explicit=loadUrlFile(options.urlFile);
  const rawIndexes=options.indexUrls.length ? options.indexUrls : (options.urlFile ? [] : ["https://www.vrhoven.sud.mk/"]);
  const indexes=rawIndexes.map(x=>normalizeOfficialUrl(x).href);
  const rights=loadRightsReview(options.rightsReview);
  if(options.execute && !rights) throw new Error("rights_review_required_for_bounded_automated_retrieval");

  let discovery={candidates:[],visited:[],robots:null};
  if(indexes.length){
    discovery=await discoverFromIndexes(indexes,{
      limit:options.limit,maxPages:options.maxPages,userAgent,delayMs:options.delayMs
    });
  }

  const combined=[];
  const seen=new Set();
  for(const item of [...explicit,...discovery.candidates]){
    const u=normalizeOfficialUrl(item.url).href;
    if(seen.has(u)) continue;
    seen.add(u);
    combined.push({...item,url:u});
    if(combined.length>=options.limit) break;
  }

  const stamp=new Date().toISOString().slice(0,10);
  const outDir=options.outDir||path.join("work","mk-supreme-decisions",stamp);
  fs.mkdirSync(outDir,{recursive:true});
  const queue={
    type:"mk_supreme_public_decision_queue",
    version:SUPREME_DOWNLOADER_VERSION,
    source_id:"mk-supreme-court",
    official_origin:"https://www.vrhoven.sud.mk/",
    created_at:new Date().toISOString(),
    limit:options.limit,
    delay_ms:options.delayMs,
    execute:Boolean(options.execute),
    rights_review:rights?{
      reviewed_on:rights.reviewed_on,
      reviewed_by:rights.reviewed_by,
      basis:rights.basis
    }:null,
    index_pages:discovery.visited,
    candidate_count:combined.length,
    candidates:combined.map(x=>({source_url:x.url,label:x.label||null}))
  };
  fs.writeFileSync(path.join(outDir,"queue.json"),JSON.stringify(queue,null,2)+"\n");

  if(!options.execute || options.dryRun) return {outDir,queue,records:[]};

  const robots=discovery.robots || await ensureRobots(combined[0]?.url||indexes[0],userAgent);
  const records=[];
  const hashSeen=new Map();

  for(let i=0;i<combined.length;i++){
    const item=combined[i];
    const u=normalizeOfficialUrl(item.url);
    if(!robotsAllows(robots.groups,u.pathname,userAgent)){
      records.push({source_url:u.href,status:"skipped_robots_disallow"});
      continue;
    }

    let fetched=null;
    for(let attempt=1;attempt<=3;attempt++){
      try{
        fetched=await fetchWithPolicy(u.href,{userAgent});
        break;
      }catch(error){
        if(!/^retryable_http_/.test(String(error?.message||"")) || attempt===3) throw error;
        await sleep(error.retryAfter||Math.min(30000,options.delayMs*attempt*2));
      }
    }

    const ct=fetched.response.headers.get("content-type")||"";
    const hash=sha256(fetched.buf);
    const duplicateOf=hashSeen.get(hash)||null;
    if(!duplicateOf) hashSeen.set(hash,u.href);

    const ext=extensionFor(ct,u.href);
    const base=safeName(`${String(i+1).padStart(3,"0")}_${item.label||path.basename(u.pathname)||"decision"}`);
    const filename=`${base}${ext}`;
    fs.writeFileSync(path.join(outDir,filename),fetched.buf);

    const rec={
      type:"mk_supreme_public_decision_download",
      source_id:"mk-supreme-court",
      source_url:u.href,
      final_url:fetched.url,
      filename,
      content_type:ct||null,
      bytes:fetched.buf.length,
      sha256:hash,
      retrieved_at:new Date().toISOString(),
      duplicate_of:duplicateOf,
      rights_reviewed:true,
      human_gate_required:true,
      production_eligible:false
    };
    records.push(rec);
    fs.appendFileSync(path.join(outDir,"manifest.ndjson"),JSON.stringify(rec)+"\n");
    if(i<combined.length-1) await sleep(options.delayMs);
  }

  return {outDir,queue,records};
}

function help(){
  return "AI Advokat Supreme Court public-decision collector\n\n"+
    "Discovery only (official Supreme Court homepage is the default entry point):\n  node scripts/download-mk-supreme-decisions.mjs --limit 50 --dry-run\n\n"+
    "Explicit URL queue:\n  node scripts/download-mk-supreme-decisions.mjs --url-file urls.txt --limit 50 --dry-run\n\n"+
    "Bounded download after documented rights review:\n  node scripts/download-mk-supreme-decisions.mjs --url-file urls.txt --limit 50 --execute --rights-review rights-review.json\n\n"+
    "Rules: HTTPS + official Supreme Court host only; max 100; minimum 1500 ms delay; robots respected; no cookies/login; SHA-256 + manifest; Human Gate remains required.";
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const opts=parseArgs();
    if(opts.help){
      console.log(help());
      process.exit(0);
    }
    const result=await run(opts);
    console.log(JSON.stringify({
      ok:true,
      outDir:result.outDir,
      candidates:result.queue.candidate_count,
      downloaded:result.records.length
    },null,2));
  }catch(error){
    console.error(JSON.stringify({ok:false,error:String(error?.message||error)},null,2));
    process.exit(1);
  }
}
