#!/usr/bin/env node
import fs from 'node:fs';

function clean(v){return String(v??'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/\s+/g,' ').trim();}
export function normalizeCaseNumber(value){
  let s=clean(value).toUpperCase();
  s=s.replace(/БР\.?/g,'').replace(/БРОЈ/g,'').replace(/[._ ]+/g,'-').replace(/-+/g,'-');
  s=s.replace(/^-|-$/g,'');
  const m=s.match(/^([А-ШЃЅЈЉЊЌЏA-Z0-9]+)-?(\d+)\/(\d{2,4})$/u);
  if(!m) return s.replace(/[^А-ШЃЅЈЉЊЌЏA-Z0-9/.-]/gu,'');
  let year=m[3];
  if(year.length===2){const n=Number(year); year=String(n>=70?1900+n:2000+n);}
  return `${m[1]}-${Number(m[2])}/${year}`;
}
export function caseAliases(value){
  const n=normalizeCaseNumber(value); if(!n)return[];
  const m=n.match(/^(.+)-(\d+)\/(\d{4})$/u); if(!m)return[n];
  const [,prefix,num,year]=m; const yy=year.slice(-2);
  return [...new Set([n,`${prefix} ${num}/${year}`,`${prefix}.бр.${num}/${year}`,`${prefix} бр.${num}/${year}`,`${prefix}-${num}/${yy}`,`${prefix} ${num}/${yy}`].map(clean))];
}
function readNdjson(p){return fs.readFileSync(p,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);}
function readOfficialCandidates(p){
  const text=fs.readFileSync(p,'utf8');
  if(p.endsWith('.ndjson')) return readNdjson(p);
  const obj=JSON.parse(text);
  if(Array.isArray(obj)) return obj;
  if(Array.isArray(obj.candidates)) return obj.candidates;
  if(Array.isArray(obj.records)) return obj.records;
  return [];
}
function candidateUrl(c){return c.source_url||c.final_url||c.url||null;}
function candidateText(c){return clean([c.label,c.case_number,c.caseNumber,c.source_record_id,candidateUrl(c)].filter(Boolean).join(' '));}
function candidateCaseNumbers(c){
  const values=[c.case_number,c.caseNumber,c.source_record_id,c.label].filter(Boolean).map(clean);
  const out=[];
  const re=/([А-ШЃЅЈЉЊЌЏA-Z]{1,10}\d*)\s*(?:\.?\s*бр\.?)?\s*[- ]?\s*(\d+)\/(\d{2,4})/giu;
  for(const value of values){
    for(const m of value.matchAll(re)){ const n=normalizeCaseNumber(m[0]); if(n&&!out.includes(n)) out.push(n); }
  }
  return out;
}
function officialUrl(url){try{const u=new URL(url);return u.protocol==='https:'&&['vrhoven.sud.mk','www.vrhoven.sud.mk'].includes(u.hostname.toLowerCase())}catch{return false}}
export function matchOne(target,candidates){
  const wanted=normalizeCaseNumber(target.supreme_case_number||target.case_number||'');
  const aliases=caseAliases(wanted).map(x=>x.toUpperCase());
  const scored=[];
  for(const c of candidates){
    const url=candidateUrl(c); if(!url||!officialUrl(url))continue;
    const hay=candidateText(c).toUpperCase();
    const extracted=candidateCaseNumbers(c);
    let score=0;
    if(extracted.includes(wanted)) score=110;
    else if(hay.includes(wanted)) score=100;
    for(const a of aliases) if(a&&hay.includes(a)) score=Math.max(score,85);
    if(score){
      const cDate=String(c.decision_date||c.decisionDate||'');
      if(target.decision_date&&cDate&&target.decision_date===cDate) score+=10;
      scored.push({score,source_url:url,label:c.label||null,case_number:c.case_number||c.caseNumber||null,decision_date:cDate||null});
    }
  }
  scored.sort((a,b)=>b.score-a.score||a.source_url.localeCompare(b.source_url));
  const top=scored[0];
  const tied=top?scored.filter(x=>x.score===top.score):[];
  if(!top) return {...target,normalized_case_number:wanted,resolver_status:'unresolved',official_binding_verified:false,matched_source_url:null,human_gate_required:true,do_not_invent_url:true};
  if(tied.length>1) return {...target,normalized_case_number:wanted,resolver_status:'ambiguous',official_binding_verified:false,candidates:tied.slice(0,10),human_gate_required:true,do_not_invent_url:true};
  return {...target,normalized_case_number:wanted,resolver_status:'official_candidate_match',official_binding_verified:false,matched_source_url:top.source_url,match_score:top.score,match_label:top.label,human_gate_required:true,remote_hash_verification_required:true,do_not_invent_url:true};
}
export function matchQueue(targets,candidates){return targets.map(x=>matchOne(x,candidates));}

if(import.meta.url===`file://${process.argv[1]}`){
  const args=process.argv.slice(2); const get=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
  const targetsPath=get('--targets'), officialPath=get('--official-candidates'), out=get('--out');
  if(!targetsPath||!officialPath||!out){console.error('Usage: node scripts/match-mk-supreme-case-number.mjs --targets supreme-binding-queue.ndjson --official-candidates queue.json --out matches.ndjson');process.exit(2)}
  const targets=readNdjson(targetsPath); const candidates=readOfficialCandidates(officialPath); const rows=matchQueue(targets,candidates);
  fs.writeFileSync(out,rows.map(JSON.stringify).join('\n')+'\n');
  const stats=rows.reduce((a,r)=>(a[r.resolver_status]=(a[r.resolver_status]||0)+1,a),{});
  console.log(JSON.stringify({ok:true,targetCount:targets.length,candidateCount:candidates.length,status:stats,out},null,2));
}
