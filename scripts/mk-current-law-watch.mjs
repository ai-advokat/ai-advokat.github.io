#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

export const CURRENT_LAW_WATCH_VERSION="AI_ADVOCAT_MK_CURRENT_LAW_WATCH_R1";

const sha256=value=>crypto.createHash("sha256").update(value).digest("hex");
const compact=value=>String(value||"")
  .normalize("NFKC")
  .replace(/\r\n?/g,"\n")
  .replace(/[ \t]+/g," ")
  .replace(/\n{3,}/g,"\n\n")
  .trim();

function stripTags(html){
  return compact(String(html||"")
    .replace(/<script\b[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[\s\S]*?<\/style>/gi," ")
    .replace(/<!--([\s\S]*?)-->/g," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/g,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">"));
}

function absoluteUrl(base,href){
  try{return new URL(href,base).href;}catch{return null;}
}

export function extractAnchors(html,baseUrl){
  const out=[];
  const seen=new Set();
  const re=/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of String(html||"").matchAll(re)){
    const url=absoluteUrl(baseUrl,m[1]);
    const label=stripTags(m[2]);
    if(!url || !/^https?:\/\//i.test(url)) continue;
    const key=url+"\n"+label;
    if(seen.has(key)) continue;
    seen.add(key);
    out.push({url,label});
    if(out.length>=500) break;
  }
  return out;
}

export function normalizePage(html){
  const text=stripTags(html).toLocaleLowerCase("mk");
  return text.replace(/\s+/g," ").trim();
}

function relevantLabel(label,keywords){
  const s=String(label||"").toLocaleLowerCase("mk");
  return keywords.some(k=>s.includes(String(k).toLocaleLowerCase("mk")));
}

function legalAliasVariants(value){
  const alias=String(value||"").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
  if(!alias)return [];
  const variants=new Set([alias]);
  if(alias.startsWith("закон за ")) variants.add("законот за "+alias.slice("закон за ".length));
  if(alias==="кривичен законик") variants.add("кривичниот законик");
  return [...variants];
}

function matchInstrument(text,instruments){
  const s=String(text||"").toLocaleLowerCase("mk").replace(/\s+/g," ").trim();
  let best=null;
  for(const item of instruments){
    const aliases=[item.title,...(item.aliases||[])].flatMap(legalAliasVariants);
    for(const alias of aliases){
      if(alias && s.includes(alias) && (!best || alias.length>best.alias.length)){
        best={canonical_key:item.canonical_key,title:item.title,alias};
      }
    }
  }
  return best;
}

export function classifyCandidate({source,anchor,instruments,keywords}){
  const label=String(anchor?.label||"").trim();
  const instrument=matchInstrument(label,instruments);
  const legal=relevantLabel(label,keywords) || Boolean(instrument);
  if(!legal) return null;
  const sourceRole=String(source.role||"");
  return {
    source_id:source.id,
    source_role:sourceRole,
    canonical_key:instrument?.canonical_key||null,
    instrument_title:instrument?.title||null,
    label,
    url:anchor.url,
    legal_stage:sourceRole==="prepublication_early_warning" ? "LEGISLATIVE_EARLY_WARNING" :
      sourceRole==="publication_provenance_primary" ? "PUBLISHED_SOURCE_CANDIDATE" :
      "OFFICIAL_VERSION_STATUS_SIGNAL",
    current_law_authority:source.authority_for_current_law===true,
    automatic_promotion_allowed:false,
    human_gate_required:true
  };
}

async function fetchText(url){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const r=await fetch(url,{
      redirect:"follow",
      signal:controller.signal,
      headers:{
        "user-agent":"AI-Advokat-Current-Law-Watch/1.0 (+source-first; Human-Gate)",
        "accept":"text/html,application/xhtml+xml,application/json,text/plain;q=0.8,*/*;q=0.2"
      }
    });
    const text=await r.text();
    return {ok:r.ok,status:r.status,final_url:r.url||url,text,content_type:r.headers.get("content-type")||""};
  }finally{clearTimeout(timer);}
}

export async function collectSnapshot(config){
  const captured_at=new Date().toISOString();
  const pages=[];
  const candidates=[];
  for(const source of config.sources||[]){
    for(const endpoint of source.endpoints||[]){
      let fetched;
      try{fetched=await fetchText(endpoint.url);}
      catch(error){
        pages.push({
          source_id:source.id,role:source.role,url:endpoint.url,kind:endpoint.kind,
          instrument_key:endpoint.instrument_key||null,ok:false,status:null,error:String(error?.message||error)
        });
        continue;
      }
      const normalized=normalizePage(fetched.text);
      const anchors=extractAnchors(fetched.text,fetched.final_url);
      const page={
        source_id:source.id,
        role:source.role,
        url:endpoint.url,
        final_url:fetched.final_url,
        kind:endpoint.kind,
        instrument_key:endpoint.instrument_key||null,
        ok:fetched.ok,
        status:fetched.status,
        content_type:fetched.content_type,
        page_sha256:sha256(fetched.text),
        normalized_sha256:sha256(normalized),
        anchor_count:anchors.length
      };
      pages.push(page);

      if(endpoint.kind==="tracked_instrument_page"){
        const item=(config.tracked_instruments||[]).find(x=>x.canonical_key===endpoint.instrument_key);
        if(item){
          candidates.push({
            source_id:source.id,
            source_role:source.role,
            canonical_key:item.canonical_key,
            instrument_title:item.title,
            label:item.title+" · official tracked page fingerprint",
            url:fetched.final_url,
            legal_stage:"OFFICIAL_VERSION_STATUS_SIGNAL",
            current_law_authority:source.authority_for_current_law===true,
            automatic_promotion_allowed:false,
            human_gate_required:true,
            page_sha256:page.page_sha256,
            normalized_sha256:page.normalized_sha256
          });
        }
      }else{
        for(const anchor of anchors){
          const c=classifyCandidate({
            source,anchor,
            instruments:config.tracked_instruments||[],
            keywords:config.legal_title_keywords||[]
          });
          if(c)candidates.push(c);
        }
      }
    }
  }
  const dedup=[];
  const seen=new Set();
  for(const c of candidates){
    const key=[c.source_id,c.url,c.canonical_key||"",c.label].join("|");
    if(seen.has(key))continue;
    seen.add(key);
    dedup.push(c);
  }
  dedup.sort((a,b)=>String(a.source_id).localeCompare(String(b.source_id))||String(a.url).localeCompare(String(b.url)));
  return {
    version:CURRENT_LAW_WATCH_VERSION,
    captured_at,
    poll_interval_minutes:config.poll_interval_minutes,
    governance:config.governance,
    pages,
    candidates:dedup,
    counts:{
      sources:(config.sources||[]).length,
      pages:pages.length,
      pages_ok:pages.filter(x=>x.ok).length,
      candidates:dedup.length,
      early_warning:dedup.filter(x=>x.legal_stage==="LEGISLATIVE_EARLY_WARNING").length,
      published_candidates:dedup.filter(x=>x.legal_stage==="PUBLISHED_SOURCE_CANDIDATE").length,
      version_signals:dedup.filter(x=>x.legal_stage==="OFFICIAL_VERSION_STATUS_SIGNAL").length
    }
  };
}

function byPage(snapshot){
  return new Map((snapshot?.pages||[]).map(x=>[[x.source_id,x.url,x.instrument_key||""].join("|"),x]));
}

function candidateKey(c){
  return [c.source_id,c.url,c.canonical_key||"",c.label].join("|");
}

export function diffSnapshots(previous,current){
  if(!previous){
    return {
      state:"BASELINE_CREATED",
      changed_pages:[],
      new_candidates:[],
      removed_candidates:[],
      requires_human_review:false
    };
  }
  const beforePages=byPage(previous);
  const changed_pages=[];
  for(const page of current.pages||[]){
    const key=[page.source_id,page.url,page.instrument_key||""].join("|");
    const old=beforePages.get(key);
    if(!old) changed_pages.push({...page,change:"NEW_WATCH_PAGE"});
    else if(old.normalized_sha256!==page.normalized_sha256){
      changed_pages.push({
        source_id:page.source_id,url:page.url,instrument_key:page.instrument_key||null,
        change:"CONTENT_FINGERPRINT_CHANGED",
        previous_normalized_sha256:old.normalized_sha256||null,
        current_normalized_sha256:page.normalized_sha256||null
      });
    }
  }
  const before=new Map((previous.candidates||[]).map(c=>[candidateKey(c),c]));
  const after=new Map((current.candidates||[]).map(c=>[candidateKey(c),c]));
  const new_candidates=[...after.entries()].filter(([k])=>!before.has(k)).map(([,v])=>v);
  const removed_candidates=[...before.entries()].filter(([k])=>!after.has(k)).map(([,v])=>v);
  const trackedInstrumentChange=changed_pages.some(x=>Boolean(x.instrument_key));
  const legalChange=Boolean(new_candidates.length||removed_candidates.length||trackedInstrumentChange);
  return {
    state:legalChange?"CHANGE_DETECTED":changed_pages.length?"SOURCE_CHURN_NO_LEGAL_CANDIDATE":"NO_CHANGE",
    changed_pages,
    new_candidates,
    removed_candidates,
    requires_human_review:legalChange
  };
}

export function buildHumanGatePacket(snapshot,diff){
  const gateNames=snapshot?.governance?.current_law_promotion_requires_all||[];
  return {
    packet_version:"AI_ADVOCAT_CURRENT_LAW_CHANGE_PACKET_R1",
    created_at:snapshot.captured_at,
    state:diff.state,
    automatic_database_write:false,
    automatic_current_law_promotion:false,
    source_first:true,
    candidates:diff.new_candidates,
    changed_pages:diff.changed_pages,
    workflow:[
      "Verify the originating official source and exact item identity.",
      "If this is a Sobranie signal, treat it only as legislative early warning until official publication is identified.",
      "Bind the exact Official Gazette issue/document and SHA-256 before parsing amendment effects.",
      "Parse amendment events deterministically; unresolved operations STOP the pipeline.",
      "Generate only a WORKING/EDITORIAL consolidation candidate.",
      "Verify effective date and application date separately, including transitional provisions.",
      "Resolve Constitutional Court effects and any later amendments.",
      "Run the complete current-law readiness gate.",
      "Human Gate decides approval; no autonomous promotion is permitted."
    ],
    required_promotion_gates:gateNames,
    current_law_promotion:"BLOCKED_PENDING_ALL_GATES_AND_HUMAN_APPROVAL"
  };
}

async function main(){
  const [,,configPath,outPath,previousPath,packetPath]=process.argv;
  if(!configPath||!outPath||!packetPath){
    console.error("Usage: node scripts/mk-current-law-watch.mjs <config.json> <snapshot.json> [previous.json] <packet.json>");
    process.exit(2);
  }
  const config=JSON.parse(fs.readFileSync(configPath,"utf8"));
  const previous=previousPath && fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath,"utf8")) : null;
  const snapshot=await collectSnapshot(config);
  const diff=diffSnapshots(previous,snapshot);
  snapshot.diff=diff;
  fs.writeFileSync(outPath,JSON.stringify(snapshot,null,2)+"\n","utf8");
  fs.writeFileSync(packetPath,JSON.stringify(buildHumanGatePacket(snapshot,diff),null,2)+"\n","utf8");
  console.log(JSON.stringify({version:snapshot.version,counts:snapshot.counts,diff:diff.state,requires_human_review:diff.requires_human_review}));
}

if(import.meta.url===`file://${process.argv[1]}`){
  main().catch(error=>{console.error(error);process.exit(1);});
}
