#!/usr/bin/env node
// Article NDJSON -> SQL for D1.
//
// Corpus Safety Foundation (0023):
//   * every article row is bound to an instrument version, resolved by
//     (canonical_key, version label) — a missing version aborts the import
//     through the 0023 trigger instead of producing unversioned rows;
//   * plain INSERT, never INSERT OR REPLACE: with the per-version UNIQUE index,
//     REPLACE would silently delete an existing article and its paragraphs.
//     A duplicate article (same version + number) or a re-run of the same import
//     therefore fails loudly and must be resolved by a human.
import fs from "node:fs";

function sqlString(v) {
  if (v===null || v===undefined) return "NULL";
  return "'" + String(v).replaceAll("'","''") + "'";
}
function sqlNumber(v) {
  return v===null || v===undefined || v==="" ? "NULL" : String(Number(v));
}

export function generateImportSql(ndjsonText) {
  const lines=ndjsonText.split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const manifest=lines.find(x=>x.type==="ingest_manifest");
  const articles=lines.filter(x=>x.type==="article");
  if (!manifest) throw new Error("Missing ingest_manifest");
  if (!articles.length) throw new Error("No article records");
  if (!manifest.instrument_key) throw new Error("Missing instrument_key in ingest_manifest");
  if (Array.isArray(manifest.errors) && manifest.errors.length) {
    throw new Error(`Parser reported ${manifest.errors.length} structural error(s); refusing to generate SQL`);
  }

  const instrumentIdExpr=(key)=>"(SELECT id FROM legal_instruments WHERE canonical_key="+sqlString(key)+")";
  const versionIdExpr=(a)=>{
    if (a.instrument_version_id!==null && a.instrument_version_id!==undefined && a.instrument_version_id!=="") {
      return sqlNumber(a.instrument_version_id);
    }
    const label=a.instrument_version_label || manifest.instrument_version_label;
    if (!label) throw new Error(`Article ${a.article_number}: no instrument_version_id or version label; refusing unversioned import`);
    return `(SELECT id FROM instrument_versions WHERE instrument_id=${instrumentIdExpr(a.instrument_key)} AND version_label=${sqlString(label)})`;
  };

  const runKey=`legal:${manifest.instrument_key}:${manifest.version_id}:${manifest.source_sha256.slice(0,16)}`;
  const sql=[];
  sql.push("PRAGMA foreign_keys=ON;");
  sql.push(`INSERT OR REPLACE INTO corpus_ingest_runs
(run_key,source_url,source_sha256,instrument_id,input_kind,parser_version,article_count,warning_count,status,notes)
VALUES (${sqlString(runKey)},${sqlString(manifest.source_url)},${sqlString(manifest.source_sha256)},${instrumentIdExpr(manifest.instrument_key)},'article_ndjson',${sqlString(manifest.parser_version)},${articles.length},${Number(manifest.warning_count||0)},'staged',${sqlString((manifest.warnings||[]).map(w=>typeof w==="string"?w:`${w.severity}:${w.code}:${w.article ?? "-"}`).join(" | ").slice(0,4000))});`);

  for (const a of articles) {
    sql.push(`INSERT INTO legal_article_versions
(canonical_id,instrument_id,instrument_version_id,article_number,article_number_normalized,article_heading,article_text,status,valid_from,valid_to,source_issue_number,source_issue_date,source_url,source_page_start,source_page_end,source_sha256,extraction_method,extraction_confidence,human_review_status)
VALUES (${[
      sqlString(a.canonical_id),instrumentIdExpr(a.instrument_key),versionIdExpr(a),
      sqlString(a.article_number),sqlString(a.article_number_normalized),sqlString(a.article_heading),
      sqlString(a.article_text),sqlString(a.status),sqlString(a.valid_from),sqlString(a.valid_to),
      sqlString(a.source?.issue_number),sqlString(a.source?.issue_date),sqlString(a.source?.url),
      sqlNumber(a.source?.page_start),sqlNumber(a.source?.page_end),sqlString(a.source?.sha256),
      sqlString(a.extraction_method),sqlNumber(a.extraction_confidence),sqlString(a.human_review_status)
    ].join(",")});`);

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
  return { sql: sql.join("\n")+"\n", articleCount: articles.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [,,ndjsonPath,outSqlPath] = process.argv;
  if (!ndjsonPath || !outSqlPath) {
    console.error("Usage: node scripts/legal-ndjson-to-sql.mjs <articles.ndjson> <out.sql>");
    process.exit(2);
  }
  const { sql, articleCount } = generateImportSql(fs.readFileSync(ndjsonPath,"utf8"));
  fs.writeFileSync(outSqlPath,sql,"utf8");
  console.error(`Generated SQL for ${articleCount} articles -> ${outSqlPath}`);
}
