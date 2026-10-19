#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("usage: node scripts/zkp-commentary-jsonl-to-sql.mjs input.jsonl output.sql");
  process.exit(2);
}

const RELEASE_ID = "zkp-commentary-v6-2026";
const EXPECTED_SOURCE_SHA256 = "5a6a691cf616599c1648ab9749a34d388f7c4b5fea8b49ecfd3b4f409903c363";
const SOURCE_LABEL = "Коментар на ЗКП, верзија 6 (2026), адв. Зоран Стојанкиќ — АИ АДВОКАТ";

const raw = fs.readFileSync(inputPath);
const sourceSha256 = crypto.createHash("sha256").update(raw).digest("hex");
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`source_sha256_mismatch expected=${EXPECTED_SOURCE_SHA256} got=${sourceSha256}`);
}

const rows = raw.toString("utf8").split(/\r?\n/).filter(Boolean).map((line, i) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`invalid_jsonl_line_${i + 1}`); }
});
if (rows.length !== 570) throw new Error(`expected_570_records_got_${rows.length}`);

const seen = new Set();
const expected = Array.from({length: 568}, (_, i) => String(i + 1));
expected.splice(267, 0, "267-а");
expected.splice(expected.length - 1, 0, "567-а");

function sqlText(value) {
  if (value === null || value === undefined) return "NULL";
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function sqlJson(value, fallback) {
  return sqlText(JSON.stringify(value === undefined ? fallback : value));
}
function canonicalRecord(row) {
  return {
    ...row,
    source: SOURCE_LABEL,
    brand: "AI Advokat",
    knowledge_role: "authorial_analysis",
    primary_law_dependency: "mk:zkp"
  };
}

const statements = ["BEGIN TRANSACTION;"];
statements.push(`DELETE FROM zkp_commentary_articles WHERE release_id=${sqlText(RELEASE_ID)};`);

for (const row of rows) {
  const number = String(row.article_number || "").trim();
  if (!number) throw new Error("missing_article_number");
  if (seen.has(number)) throw new Error(`duplicate_article_${number}`);
  seen.add(number);
  if (!Array.isArray(row.law_text) || !row.law_text.length) throw new Error(`missing_law_text_${number}`);
  if (!Array.isArray(row.commentary) || !row.commentary.length) throw new Error(`missing_commentary_${number}`);

  const normalized = canonicalRecord(row);
  const recordSha256 = crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");

  const values = [
    sqlText(RELEASE_ID),
    sqlText(number),
    sqlText(row.article_title || ""),
    sqlJson(row.law_text, []),
    sqlJson(row.commentary, []),
    sqlJson(row.practice, []),
    sqlJson(row.common_errors, []),
    sqlJson(row.formulations, []),
    sqlJson(row.related_provisions, []),
    row.systematics ? sqlJson(row.systematics, {}) : "NULL",
    row.procedure_phase ? sqlJson(row.procedure_phase, []) : "NULL",
    row.actors ? sqlJson(row.actors, []) : "NULL",
    row.topics ? sqlJson(row.topics, []) : "NULL",
    row.related_articles ? sqlJson(row.related_articles, []) : "NULL",
    sqlText(row.practical_use || ""),
    sqlText(row.risk_level || ""),
    sqlText(SOURCE_LABEL),
    sqlText(recordSha256)
  ];

  statements.push(
    "INSERT INTO zkp_commentary_articles " +
    "(release_id,article_number,article_title,law_text_json,commentary_json,practice_json,common_errors_json,formulations_json,related_provisions_json,systematics_json,procedure_phase_json,actors_json,topics_json,related_articles_json,practical_use,risk_level,source_label,record_sha256) VALUES (" +
    values.join(",") + ");"
  );
}

const missing = expected.filter(n => !seen.has(n));
const unexpected = [...seen].filter(n => !expected.includes(n));
if (missing.length || unexpected.length) {
  throw new Error(`coverage_mismatch missing=${missing.join(",") || "none"} unexpected=${unexpected.join(",") || "none"}`);
}

statements.push(
  `UPDATE zkp_commentary_releases
      SET source_sha256=${sqlText(EXPECTED_SOURCE_SHA256)},
          record_count=570,
          authority_role='authorial_analysis',
          updated_at=CURRENT_TIMESTAMP
    WHERE id=${sqlText(RELEASE_ID)};`
);
statements.push("COMMIT;");
fs.writeFileSync(outputPath, statements.join("\n") + "\n");
console.log(JSON.stringify({ok:true,records:rows.length,sourceSha256,releaseId:RELEASE_ID}));
