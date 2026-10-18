#!/usr/bin/env node
import fs from "node:fs";

const [inputPath, outputPath, reportPath] = process.argv.slice(2);
if (!inputPath || !outputPath || !reportPath) {
  console.error("usage: node scripts/normalize-zkp-commentary-v6.mjs input.jsonl output.jsonl report.json");
  process.exit(2);
}

const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/).filter(Boolean);
const rows = lines.map((line, i) => {
  try { return JSON.parse(line); } catch { throw new Error(`Invalid JSONL at line ${i + 1}`); }
});
if (rows.length !== 570) throw new Error(`Expected 570 records, got ${rows.length}`);

const seen = new Set();
let brandFixes = 0;
let relatedBackfills = 0;
let emptyLawText = 0;
let emptyCommentary = 0;

function clean(v) {
  if (typeof v === "string") {
    const n = v.replace(/АИ АДВОКАТ 4/g, "АИ АДВОКАТ").replace(/AI ADVOKAT 4/g, "AI Advokat");
    if (n !== v) brandFixes++;
    return n;
  }
  if (Array.isArray(v)) return v.map(clean);
  return v;
}

for (const row of rows) {
  const n = String(row.article_number || "").trim();
  if (!n) throw new Error("Missing article_number");
  if (seen.has(n)) throw new Error(`Duplicate article ${n}`);
  seen.add(n);

  for (const k of Object.keys(row)) row[k] = clean(row[k]);

  if (!row.law_text || (Array.isArray(row.law_text) && row.law_text.length === 0)) emptyLawText++;
  if (!row.commentary || (Array.isArray(row.commentary) && row.commentary.length === 0)) emptyCommentary++;

  if ((!row.related_provisions || row.related_provisions.length === 0) && Array.isArray(row.related_articles) && row.related_articles.length) {
    row.related_provisions = [...row.related_articles];
    relatedBackfills++;
  }

  row.knowledge_role = "authorial_analysis";
  row.primary_law_dependency = "mk:zkp";
  row.brand = "AI Advokat";
}

if (emptyLawText) throw new Error(`Law text missing in ${emptyLawText} records`);
if (emptyCommentary) throw new Error(`Commentary missing in ${emptyCommentary} records`);

fs.writeFileSync(outputPath, rows.map(x => JSON.stringify(x)).join("\n") + "\n");
fs.writeFileSync(reportPath, JSON.stringify({
  schema_version: "1.0",
  records: rows.length,
  unique_articles: seen.size,
  brand_fixes: brandFixes,
  related_provisions_backfilled_from_related_articles: relatedBackfills,
  empty_law_text: emptyLawText,
  empty_commentary: emptyCommentary,
  release_gate: "SECONDARY_COMMENTARY_HUMAN_GATE_REQUIRED"
}, null, 2) + "\n");
console.log("ZKP COMMENTARY V6 NORMALIZATION: PASS");
