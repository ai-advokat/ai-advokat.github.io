#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const [inputPath, outputPath, reportPath] = process.argv.slice(2);
if (!inputPath || !outputPath || !reportPath) {
  console.error("usage: node scripts/normalize-zkp-commentary-v6.mjs input.jsonl output.jsonl report.json");
  process.exit(2);
}

const rawBytes = fs.readFileSync(inputPath);
const sourceSha256 = crypto.createHash("sha256").update(rawBytes).digest("hex");
const EXPECTED_SOURCE_SHA256 = "5a6a691cf616599c1648ab9749a34d388f7c4b5fea8b49ecfd3b4f409903c363";
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) throw new Error(`Source SHA-256 mismatch: expected ${EXPECTED_SOURCE_SHA256}, got ${sourceSha256}`);
const lines = rawBytes.toString("utf8").split(/\r?\n/).filter(Boolean);
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

const expectedNumbers=[...Array.from({length:568},(_,i)=>String(i+1))];
expectedNumbers.splice(267,0,"267-а");
expectedNumbers.splice(expectedNumbers.length-1,0,"567-а");
if (seen.size!==expectedNumbers.length || expectedNumbers.some(n=>!seen.has(n))) {
  const missing=expectedNumbers.filter(n=>!seen.has(n));
  const unexpected=[...seen].filter(n=>!expectedNumbers.includes(n));
  throw new Error(`Article coverage mismatch; missing=${missing.join(",")||"none"}; unexpected=${unexpected.join(",")||"none"}`);
}
if (emptyLawText) throw new Error(`Law text missing in ${emptyLawText} records`);
if (emptyCommentary) throw new Error(`Commentary missing in ${emptyCommentary} records`);

fs.writeFileSync(outputPath, rows.map(x => JSON.stringify(x)).join("\n") + "\n");
fs.writeFileSync(reportPath, JSON.stringify({
  schema_version: "1.0",
  source_sha256: sourceSha256,
  source_sha256_verified: true,
  article_coverage_verified: true,
  records: rows.length,
  unique_articles: seen.size,
  brand_fixes: brandFixes,
  related_provisions_backfilled_from_related_articles: relatedBackfills,
  empty_law_text: emptyLawText,
  empty_commentary: emptyCommentary,
  release_gate: "SECONDARY_COMMENTARY_HUMAN_GATE_REQUIRED"
}, null, 2) + "\n");
console.log("ZKP COMMENTARY V6 NORMALIZATION: PASS");
