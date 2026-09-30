#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

export const PARSER_VERSION = "mk-legal-article-v0.2.0";

function norm(s="") {
  return String(s).normalize("NFKC").replace(/\r\n?/g, "\n");
}

function compact(s="") {
  return norm(s).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeArticleNumber(raw="") {
  return norm(raw)
    .trim()
    .toLocaleLowerCase("mk")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const ARTICLE_RE = /^\s*Член\s+([0-9]+(?:\s*[-–—]\s*[A-Za-zА-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]+)?)\s*\.?\s*$/imu;
const PARA_RE = /^\s*\(([0-9]+)\)\s*(.*)$/u;
const ITEM_RE = /^\s*(?:([0-9]+)[.)]|([А-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ])[.)])\s+(.*)$/u;

export function splitArticles(text) {
  const source = norm(text);
  const lines = source.split("\n");
  const starts = [];
  for (let i=0;i<lines.length;i++) {
    const m=lines[i].match(ARTICLE_RE);
    if (m) starts.push({line:i, number:m[1]});
  }
  const articles=[];
  for (let n=0;n<starts.length;n++) {
    const here=starts[n];
    const end=n+1<starts.length?starts[n+1].line:lines.length;
    const bodyLines=lines.slice(here.line+1,end);
    articles.push({number:here.number, bodyLines});
  }
  return articles;
}

function parseStructure(bodyLines) {
  const cleanLines=bodyLines.map(x=>x.trim()).filter(Boolean);
  let heading=null;
  let idx=0;

  // Conservative heading detection: only a short first line before a numbered paragraph.
  if (cleanLines.length>1 && cleanLines[0].length<=120 && !/[.;,:!?]$/u.test(cleanLines[0]) && !PARA_RE.test(cleanLines[0]) && PARA_RE.test(cleanLines[1])) {
    heading=cleanLines[0];
    idx=1;
  }

  const paragraphs=[];
  let current=null;
  let itemOrder=0;

  for (; idx<cleanLines.length; idx++) {
    const line=cleanLines[idx];
    const pm=line.match(PARA_RE);
    if (pm) {
      current={
        paragraph_number:pm[1],
        paragraph_order:paragraphs.length+1,
        text:pm[2] || "",
        items:[]
      };
      paragraphs.push(current);
      itemOrder=0;
      continue;
    }

    const im=line.match(ITEM_RE);
    if (im && !current) {
      current={
        paragraph_number:"1",
        paragraph_order:1,
        text:"",
        items:[]
      };
      paragraphs.push(current);
      itemOrder=0;
    }
    if (current && im) {
      itemOrder++;
      current.items.push({
        item_number:im[1] || im[2],
        item_order:itemOrder,
        text:im[3]
      });
      continue;
    }

    if (!current) {
      current={
        paragraph_number:"1",
        paragraph_order:1,
        text:"",
        items:[]
      };
      paragraphs.push(current);
    }

    if (current.items.length) {
      current.items[current.items.length-1].text=compact(current.items[current.items.length-1].text+" "+line);
    } else {
      current.text=compact(current.text+" "+line);
    }
  }

  for (const p of paragraphs) {
    p.text=compact(p.text);
    for (const item of p.items) item.text=compact(item.text);
  }

  return {heading, paragraphs};
}

export function parseLegalText(text, meta) {
  const required=["instrument_key","instrument_title","version_id","source_url","source_sha256"];
  for (const key of required) {
    if (meta[key]===undefined || meta[key]===null || meta[key]==="") {
      throw new Error("Missing required metadata: "+key);
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(meta.source_sha256)) {
    throw new Error("source_sha256 must be a 64-character SHA-256 hex digest");
  }

  const rawArticles=splitArticles(text);
  if (!rawArticles.length) throw new Error("No Macedonian article headers ('Член N') detected.");

  const warnings=[];
  const seen=new Set();
  const records=[];

  for (const raw of rawArticles) {
    const number=compact(raw.number);
    const numberNorm=normalizeArticleNumber(number);
    if (seen.has(numberNorm)) {
      throw new Error(`Duplicate article number detected: ${number}`);
    }
    seen.add(numberNorm);

    const body=compact(raw.bodyLines.join("\n"));
    if (!body) {
      throw new Error(`Empty article body: ${number}`);
    }

    const {heading,paragraphs}=parseStructure(raw.bodyLines);
    const canonicalSeed=[
      "MK",
      String(meta.instrument_key),
      String(meta.version_id),
      "ART",
      numberNorm,
      String(meta.source_sha256)
    ].join(":");
    const canonical_id="MK:"+sha256(canonicalSeed).slice(0,32);

    records.push({
      canonical_id,
      instrument_key:String(meta.instrument_key),
      instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
      instrument_title:String(meta.instrument_title),
      version_id:String(meta.version_id),
      instrument_version_id:meta.instrument_version_id ?? null,
      article_number:number,
      article_number_normalized:numberNorm,
      article_heading:heading,
      article_text:body,
      paragraphs,
      status:meta.status || "source_text",
      valid_from:meta.valid_from || null,
      valid_to:meta.valid_to || null,
      source:{
        issue_number:meta.source_issue_number || null,
        issue_date:meta.source_issue_date || null,
        url:String(meta.source_url),
        page_start:meta.source_page_start ?? null,
        page_end:meta.source_page_end ?? null,
        sha256:String(meta.source_sha256).toLowerCase()
      },
      extraction_method:meta.extraction_method || "text_parser",
      extraction_confidence:meta.extraction_confidence ?? null,
      human_review_status:meta.human_review_status || "pending"
    });
  }

  return {
    parser_version:PARSER_VERSION,
    instrument_key:String(meta.instrument_key),
    instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
    instrument_title:String(meta.instrument_title),
    version_id:String(meta.version_id),
    source_url:String(meta.source_url),
    source_sha256:String(meta.source_sha256).toLowerCase(),
    article_count:records.length,
    warning_count:warnings.length,
    warnings,
    records
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [,,textPath,metaPath,outPath] = process.argv;
  if (!textPath || !metaPath || !outPath) {
    console.error("Usage: node scripts/parse-mk-legal-text.mjs <text.txt> <meta.json> <out.ndjson>");
    process.exit(2);
  }
  const text=fs.readFileSync(textPath,"utf8");
  const meta=JSON.parse(fs.readFileSync(metaPath,"utf8"));
  const parsed=parseLegalText(text,meta);
  const lines=[
    JSON.stringify({type:"ingest_manifest", ...parsed, records:undefined}),
    ...parsed.records.map(record=>JSON.stringify({type:"article",...record}))
  ];
  fs.writeFileSync(outPath,lines.join("\n")+"\n","utf8");
  console.error(`Parsed ${parsed.article_count} articles; warnings=${parsed.warning_count}`);
}
