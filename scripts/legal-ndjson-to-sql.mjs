#!/usr/bin/env node
import fs from "node:fs";

function sqlString(v) {
  if (v===null || v===undefined) return "NULL";
  return "'" + String(v).replaceAll("'","''") + "'";
}
function sqlNumber(v) {
  return v===null || v===undefined || v==="" ? "NULL" : String(Number(v));
}

const [,,ndjsonPath,outSqlPath] = process.argv;
if (!ndjsonPath || !outSqlPath) {
  console.error("Usage: node scripts/legal-ndjson-to-sql.mjs <articles.ndjson> <out.sql>");
  process.exit(2);
}
const lines=fs.readFileSync(ndjsonPath,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=lines.find(x=>x.type==="ingest_manifest");
const articles=lines.filter(x=>x.type==="article");
if (!manifest) throw new Error("Missing ingest_manifest");
if (!articles.length) throw new Error("No article records");

if (!manifest.instrument_key) throw new Error("Missing instrument_key in ingest_manifest");
const instrumentIdExpr=(key,fallbackId=null)=>{
  if (key) return "(SELECT id FROM legal_instruments WHERE canonical_key="+sqlString(key)+")";
  return sqlNumber(fallbackId);
};
const runKey=`legal:${manifest.instrument_key}:${manifest.version_id}:${manifest.source_sha256.slice(0,16)}`;
const sql=[];
sql.push("PRAGMA foreign_keys=ON;");
sql.push("BEGIN TRANSACTION;");
sql.push(`INSERT OR REPLACE INTO corpus_ingest_runs
(run_key,source_url,source_sha256,instrument_id,input_kind,parser_version,article_count,warning_count,status,notes)
VALUES (${sqlString(runKey)},${sqlString(manifest.source_url)},${sqlString(manifest.source_sha256)},${instrumentIdExpr(manifest.instrument_key,manifest.instrument_id)},'article_ndjson',${sqlString(manifest.parser_version)},${articles.length},${Number(manifest.warning_count||0)},'staged',${sqlString((manifest.warnings||[]).join(" | "))});`);

for (const a of articles) {
  sql.push(`INSERT OR REPLACE INTO legal_article_versions
(canonical_id,instrument_id,instrument_version_id,article_number,article_number_normalized,article_heading,article_text,status,valid_from,valid_to,source_issue_number,source_issue_date,source_url,source_page_start,source_page_end,source_sha256,extraction_method,extraction_confidence,human_review_status)
VALUES (${[
    sqlString(a.canonical_id),instrumentIdExpr(a.instrument_key,a.instrument_id),sqlNumber(a.instrument_version_id),
    sqlString(a.article_number),sqlString(a.article_number_normalized),sqlString(a.article_heading),
    sqlString(a.article_text),sqlString(a.status),sqlString(a.valid_from),sqlString(a.valid_to),
    sqlString(a.source?.issue_number),sqlString(a.source?.issue_date),sqlString(a.source?.url),
    sqlNumber(a.source?.page_start),sqlNumber(a.source?.page_end),sqlString(a.source?.sha256),
    sqlString(a.extraction_method),sqlNumber(a.extraction_confidence),sqlString(a.human_review_status)
  ].join(",")});`);

  sql.push(`DELETE FROM legal_article_paragraphs WHERE article_version_id=(SELECT id FROM legal_article_versions WHERE canonical_id=${sqlString(a.canonical_id)});`);
  for (const p of a.paragraphs||[]) {
    sql.push(`INSERT INTO legal_article_paragraphs
(article_version_id,paragraph_number,paragraph_order,paragraph_text)
VALUES ((SELECT id FROM legal_article_versions WHERE canonical_id=${sqlString(a.canonical_id)}),${sqlString(p.paragraph_number)},${Number(p.paragraph_order)},${sqlString(p.text)});`);
    for (const item of p.items||[]) {
      sql.push(`INSERT INTO legal_article_items
(paragraph_id,item_number,item_order,item_text)
VALUES ((SELECT id FROM legal_article_paragraphs WHERE article_version_id=(SELECT id FROM legal_article_versions WHERE canonical_id=${sqlString(a.canonical_id)}) AND paragraph_order=${Number(p.paragraph_order)}),${sqlString(item.item_number)},${Number(item.item_order)},${sqlString(item.text)});`);
    }
  }
}
sql.push(`UPDATE corpus_ingest_runs SET status='validated' WHERE run_key=${sqlString(runKey)};`);
sql.push("COMMIT;");
fs.writeFileSync(outSqlPath,sql.join("\n")+"\n","utf8");
console.error(`Generated SQL for ${articles.length} articles -> ${outSqlPath}`);
