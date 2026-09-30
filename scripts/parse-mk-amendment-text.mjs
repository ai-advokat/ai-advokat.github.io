#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

export const AMENDMENT_PARSER_VERSION = "mk-amendment-event-v0.1.0";

function norm(s="") {
  return String(s).normalize("NFKC").replace(/\r\n?/g,"\n");
}
function compact(s="") {
  return norm(s).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const ACT_ARTICLE_RE=/^\s*Член\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s*\.?\s*$/imu;
const TARGET_RE=/Во\s+член(?:от)?\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)/giu;
const AFTER_RE=/По\s+член(?:от)?\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s+се\s+додава/giu;
const HEADING_TARGET_RE=/Насловот\s+на\s+член(?:от)?\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)/giu;
const DIRECT_CHANGE_RE=/Член(?:от)?\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s+се\s+менува/giu;
const INSERTED_ARTICLE_RE=/нов(?:\s+наслов\s+и\s+нов)?\s+член\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)/giu;
const DELETE_RE=/член(?:от)?\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s+се\s+брише/giu;

function normalizeArticleNumber(raw="") {
  return compact(raw).toLocaleLowerCase("mk").replace(/[–—]/g,"-").replace(/\s+/g,"");
}

function splitAmendmentActArticles(text) {
  const lines=norm(text).split("\n");
  const starts=[];
  let expected=1;
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(ACT_ARTICLE_RE);
    if(!m) continue;
    const raw=compact(m[1]);
    if(!/^\d+$/u.test(raw)) continue;
    const n=Number(raw);
    if(n===expected){
      starts.push({line:i,number:raw});
      expected++;
    }
  }
  if(!starts.length || starts[0].number!=="1") throw new Error("No sequential amendment-act article headers detected.");
  return starts.map((start,idx)=>({
    amendment_article_number:start.number,
    text:compact(lines.slice(start.line+1, idx+1<starts.length?starts[idx+1].line:lines.length).join("\n"))
  }));
}

function classifyEvent(text) {
  const t=text.toLocaleLowerCase("mk");
  if(/се\s+брише/u.test(t)) return "delete";
  if(/се\s+заменува|се\s+заменуваат/u.test(t)) return "replace";
  if(/се\s+додава|се\s+додаваат/u.test(t)) return "insert";
  if(/се\s+менува/u.test(t)) return "amend";
  return "other";
}

export function parseAmendmentText(text,meta) {
  const required=["instrument_key","instrument_title","amendment_title","source_url","source_sha256"];
  for(const key of required){
    if(meta[key]===undefined || meta[key]===null || meta[key]==="") throw new Error("Missing required metadata: "+key);
  }
  if(!/^[a-f0-9]{64}$/i.test(meta.source_sha256)) throw new Error("source_sha256 must be a 64-character SHA-256 hex digest");

  const actArticles=splitAmendmentActArticles(text);
  const events=[];
  const warnings=[];

  for(const art of actArticles){
    if(!art.text) throw new Error("Empty amendment-act article body: "+art.amendment_article_number);

    const targets=new Set();
    const insertedArticles=new Set();
    INSERTED_ARTICLE_RE.lastIndex=0;
    for(const m of art.text.matchAll(INSERTED_ARTICLE_RE)) insertedArticles.add(normalizeArticleNumber(m[1]));
    for(const re of [TARGET_RE,AFTER_RE,DELETE_RE,HEADING_TARGET_RE,DIRECT_CHANGE_RE]){
      re.lastIndex=0;
      for(const m of art.text.matchAll(re)) targets.add(normalizeArticleNumber(m[1]));
    }

    if(!targets.size){
      warnings.push(`No target article detected in amendment act article ${art.amendment_article_number}`);
      events.push({
        event_id:"MKAM:"+sha256([meta.instrument_key,meta.source_sha256,art.amendment_article_number,"unresolved"].join(":")).slice(0,32),
        instrument_key:String(meta.instrument_key),
        instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
        instrument_title:String(meta.instrument_title),
        amendment_title:String(meta.amendment_title),
        amendment_article_number:art.amendment_article_number,
        target_article_number:null,
        inserted_article_numbers:[...insertedArticles],
        event_type:"other",
        event_text:art.text,
        source_issue_number:meta.source_issue_number||null,
        source_issue_date:meta.source_issue_date||null,
        source_url:String(meta.source_url),
        source_sha256:String(meta.source_sha256).toLowerCase(),
        effective_date:meta.effective_date||null,
        application_date:meta.application_date||null,
        human_review_status:"pending"
      });
      continue;
    }

    for(const target of targets){
      events.push({
        event_id:"MKAM:"+sha256([meta.instrument_key,meta.source_sha256,art.amendment_article_number,target].join(":")).slice(0,32),
        instrument_key:String(meta.instrument_key),
        instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
        instrument_title:String(meta.instrument_title),
        amendment_title:String(meta.amendment_title),
        amendment_article_number:art.amendment_article_number,
        target_article_number:target,
        inserted_article_numbers:[...insertedArticles],
        event_type:classifyEvent(art.text),
        event_text:art.text,
        source_issue_number:meta.source_issue_number||null,
        source_issue_date:meta.source_issue_date||null,
        source_url:String(meta.source_url),
        source_sha256:String(meta.source_sha256).toLowerCase(),
        effective_date:meta.effective_date||null,
        application_date:meta.application_date||null,
        human_review_status:"pending"
      });
    }
  }

  return {
    parser_version:AMENDMENT_PARSER_VERSION,
    instrument_key:String(meta.instrument_key),
    instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
    amendment_title:String(meta.amendment_title),
    source_url:String(meta.source_url),
    source_sha256:String(meta.source_sha256).toLowerCase(),
    amendment_article_count:actArticles.length,
    event_count:events.length,
    warning_count:warnings.length,
    warnings,
    events
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,textPath,metaPath,outPath]=process.argv;
  if(!textPath||!metaPath||!outPath){
    console.error("Usage: node scripts/parse-mk-amendment-text.mjs <text.txt> <meta.json> <out.ndjson>");
    process.exit(2);
  }
  const parsed=parseAmendmentText(
    fs.readFileSync(textPath,"utf8"),
    JSON.parse(fs.readFileSync(metaPath,"utf8"))
  );
  const lines=[
    JSON.stringify({type:"amendment_manifest",...parsed,events:undefined}),
    ...parsed.events.map(e=>JSON.stringify({type:"amendment_event",...e}))
  ];
  fs.writeFileSync(outPath,lines.join("\n")+"\n","utf8");
  console.error(`Parsed ${parsed.amendment_article_count} amendment-act articles -> ${parsed.event_count} events; warnings=${parsed.warning_count}`);
}
