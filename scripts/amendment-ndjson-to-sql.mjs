#!/usr/bin/env node
import fs from "node:fs";

function sqlString(v){
  if(v===null || v===undefined) return "NULL";
  return "'" + String(v).replaceAll("'","''") + "'";
}
function sqlNumber(v){
  return v===null || v===undefined || v==="" ? "NULL" : String(Number(v));
}

const [,,ndjsonPath,outSqlPath,instrumentKey] = process.argv;
if(!ndjsonPath || !outSqlPath || !instrumentKey){
  console.error("Usage: node scripts/amendment-ndjson-to-sql.mjs <events.ndjson> <out.sql> <instrument_key>");
  process.exit(2);
}

const rows=fs.readFileSync(ndjsonPath,"utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=rows.find(x=>x.type==="amendment_manifest");
const events=rows.filter(x=>x.type==="amendment_event");
if(!manifest) throw new Error("Missing amendment_manifest");
if(!events.length) throw new Error("No amendment events");

const instrumentExpr=`(SELECT id FROM legal_instruments WHERE canonical_key=${sqlString(instrumentKey)})`;
const sql=["PRAGMA foreign_keys=ON;"];

for(const e of events){
  sql.push(`INSERT OR REPLACE INTO legal_amendment_events
(event_key,instrument_id,amendment_title,amendment_article_number,target_article_number,inserted_article_numbers_json,event_type,event_text,source_issue_number,source_issue_date,source_url,source_page_start,source_page_end,source_sha256,effective_date,application_date,human_review_status)
VALUES (${[
    sqlString(e.event_id),
    instrumentExpr,
    sqlString(e.amendment_title),
    sqlString(e.amendment_article_number),
    sqlString(e.target_article_number),
    sqlString(JSON.stringify(e.inserted_article_numbers||[])),
    sqlString(e.event_type),
    sqlString(e.event_text),
    sqlString(e.source_issue_number),
    sqlString(e.source_issue_date),
    sqlString(e.source_url),
    sqlNumber(e.source_page_start),
    sqlNumber(e.source_page_end),
    sqlString(e.source_sha256),
    sqlString(e.effective_date),
    sqlString(e.application_date),
    sqlString(e.human_review_status||"pending")
  ].join(",")});`);
}

const affected=[...new Set(events.flatMap(e=>[
  e.target_article_number,
  ...(e.inserted_article_numbers||[])
]).filter(Boolean))];

for(const article of affected){
  sql.push(`UPDATE legal_article_versions
SET status='needs_version_review', updated_at=CURRENT_TIMESTAMP
WHERE instrument_id=${instrumentExpr}
  AND article_number_normalized=${sqlString(article)}
  AND status IN ('historical','verified','current_consolidated','source_text');`);
}

fs.writeFileSync(outSqlPath,sql.join("\n")+"\n","utf8");
console.error(`Generated SQL for ${events.length} amendment events; affected_articles=${affected.length}`);
