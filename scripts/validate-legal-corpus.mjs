#!/usr/bin/env node
// AI Advokat — legal corpus QA validator (Corpus Safety Foundation, F2).
//
// Usage:
//   node scripts/validate-legal-corpus.mjs <parsed.ndjson> <manifest.json> <report.json> <report.md>
// Exit code 0 = PASS, 1 = STOP, 2 = usage error.
//
// The validator never trusts the parser's own summary: counts, gaps, duplicates and
// mixed-script tokens are recomputed from the article records.
//
// Manifest fields (all required unless marked optional):
// {
//   "instrument_key": "mk:zro",
//   "version_label": "official-consolidated-...",
//   "version_class": "original_text|official_consolidated|dated_snapshot|reference_consolidation|amendment_text|other",
//   "expected_article_count": 298,
//   "expected_first_article": "1",
//   "expected_last_article": "273",
//   "allowed_gaps": ["12"],                                  (optional; each needs an official reason)
//   "acknowledged_warnings": [{"code":"...","article":"5","reason":"..."}],   (optional)
//   "source": {"url":"https://...","sha256":"<64 hex>","issue_number":"62/2005","issue_date":"2005-07-28"},
//   "legal_status": "source_text|verified|needs_version_review|historical|current_consolidated",
//   "human_gate": {"status":"pending|reviewed|approved|rejected","approved_by":null,"approved_at":null},
//   "validity": {"valid_from":"YYYY-MM-DD|null","application_from":"YYYY-MM-DD|null","valid_to":"YYYY-MM-DD|null"},
//   "other_versions": [{"version_label":"...","valid_from":"...","application_from":"...","valid_to":"..."}], (optional)
//   "min_extraction_confidence": 0.9,                        (optional)
//   "transitional_final_provisions": {"present": true, "starts_at_article": "270"},
//   "expected_lettered_articles": ["10-а","122-а"],          (optional; compared exactly when given)
//   "expected_repealed_articles": ["15"]                     (optional; compared exactly when given)
// }
import fs from "node:fs";
import { normalizeArticleNumber, mixedScriptTokens } from "./parse-mk-legal-text.mjs";

export const VALIDATOR_VERSION = "mk-legal-corpus-validator-v1.0.0";
const VERSION_CLASSES = new Set(["original_text","official_consolidated","dated_snapshot","reference_consolidation","amendment_text","other"]);
const LEGAL_STATUSES = new Set(["source_text","verified","needs_version_review","historical","current_consolidated"]);
const HUMAN_GATE = new Set(["pending","reviewed","approved","rejected"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseNdjson(text) {
  const lines = text.split(/\r?\n/).filter(Boolean).map(JSON.parse);
  return { manifest: lines.find(x => x.type === "ingest_manifest") || null, records: lines.filter(x => x.type === "article") };
}

function windowOf(v) {
  const start = v?.application_from || v?.valid_from || null;
  return { start, end: v?.valid_to || null };
}

function overlaps(a, b) {
  // Open-ended windows run to +infinity; a missing start is treated as -infinity.
  const aStart = a.start || "0000-00-00", bStart = b.start || "0000-00-00";
  const aEnd = a.end || "9999-12-31", bEnd = b.end || "9999-12-31";
  return aStart < bEnd && bStart < aEnd;
}

export function validateCorpus(parsed, m) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const stop = (check, detail, article = null) => errors.push({ check, detail, article });
  const note = (check, detail, article = null) => warnings.push({ check, detail, article });
  const run = (name, fn) => { const before = errors.length; fn(); checks.push({ name, result: errors.length === before ? "PASS" : "STOP" }); };

  const header = parsed.manifest || {};
  const records = parsed.records || [];
  const norm = x => normalizeArticleNumber(String(x));
  const nums = records.map(r => norm(r.article_number_normalized ?? r.article_number));

  run("manifest", () => {
    for (const k of ["instrument_key","version_label","version_class","expected_article_count","expected_first_article","expected_last_article","source","legal_status","human_gate","validity","transitional_final_provisions"]) {
      if (m[k] === undefined || m[k] === null || m[k] === "") stop("manifest", `Manifest field '${k}' is missing`);
    }
    if (m.version_class && !VERSION_CLASSES.has(m.version_class)) stop("manifest", `Unknown version_class '${m.version_class}'`);
    if (header.instrument_key && m.instrument_key && header.instrument_key !== m.instrument_key) {
      stop("manifest", `Parsed instrument '${header.instrument_key}' does not match manifest '${m.instrument_key}'`);
    }
  });

  run("parser_version", () => {
    const v = String(header.parser_version || "");
    const mm = v.match(/v(\d+)\.(\d+)/);
    if (!mm || Number(mm[1]) === 0 && Number(mm[2]) < 3) stop("parser_version", `Parser '${v || "unknown"}' predates v0.3; its warnings are not meaningful`);
  });

  run("extraction_errors", () => {
    for (const e of header.errors || []) stop("extraction_errors", `${e.code}: ${e.detail}`, e.article);
    if (!records.length) stop("extraction_errors", "No article records");
    const min = m.min_extraction_confidence ?? null;
    if (min !== null) {
      for (const r of records) {
        if (r.extraction_confidence === null || r.extraction_confidence === undefined || Number(r.extraction_confidence) < min) {
          stop("extraction_uncertainty", `extraction_confidence ${r.extraction_confidence ?? "missing"} < ${min}`, r.article_number_normalized);
        }
      }
    }
  });

  run("article_count", () => {
    if (records.length !== Number(m.expected_article_count)) stop("article_count", `Parsed ${records.length} articles, manifest expects ${m.expected_article_count}`);
  });

  run("first_last_article", () => {
    if (nums[0] !== norm(m.expected_first_article)) stop("first_last_article", `First article is ${nums[0]}, expected ${m.expected_first_article}`);
    if (nums[nums.length - 1] !== norm(m.expected_last_article)) stop("first_last_article", `Last article is ${nums[nums.length - 1]}, expected ${m.expected_last_article}`);
  });

  run("duplicates", () => {
    const seen = new Map();
    for (const n of nums) seen.set(n, (seen.get(n) || 0) + 1);
    for (const [n, c] of seen) if (c > 1) stop("duplicates", `Article ${n} appears ${c} times`, n);
  });

  run("gaps", () => {
    const allowed = new Set((m.allowed_gaps || []).map(norm));
    const bases = [...new Set(nums.map(n => Number(n.split("-")[0])).filter(Number.isFinite))].sort((a, b) => a - b);
    for (let n = bases[0]; n <= bases[bases.length - 1]; n++) {
      if (bases.includes(n)) continue;
      if (allowed.has(String(n))) note("gaps", `Article ${n} absent (allowed by manifest)`, String(n));
      else stop("gaps", `Article ${n} is missing and not in allowed_gaps`, String(n));
    }
    for (const g of allowed) if (nums.includes(g)) stop("gaps", `allowed_gaps lists ${g}, but that article is present`, g);
  });

  run("lettered_articles", () => {
    const found = nums.filter(n => n.includes("-"));
    if (Array.isArray(m.expected_lettered_articles)) {
      const exp = m.expected_lettered_articles.map(norm);
      for (const n of exp) if (!found.includes(n)) stop("lettered_articles", `Expected lettered article ${n} is missing`, n);
      for (const n of found) if (!exp.includes(n)) stop("lettered_articles", `Unexpected lettered article ${n}`, n);
    } else if (found.length) {
      note("lettered_articles", `${found.length} lettered article(s): ${found.slice(0, 20).join(", ")}${found.length > 20 ? " …" : ""}`);
    }
  });

  run("repealed_articles", () => {
    const found = records.filter(r => r.status === "repealed").map(r => norm(r.article_number_normalized));
    if (Array.isArray(m.expected_repealed_articles)) {
      const exp = m.expected_repealed_articles.map(norm);
      for (const n of exp) if (!found.includes(n)) stop("repealed_articles", `Article ${n} should be marked repealed but is not`, n);
      for (const n of found) if (!exp.includes(n)) stop("repealed_articles", `Article ${n} is marked repealed but the manifest does not expect it`, n);
    } else if (found.length) {
      note("repealed_articles", `${found.length} article(s) detected as repealed: ${found.join(", ")} (text kept verbatim)`);
    }
  });

  run("transitional_final", () => {
    const tf = m.transitional_final_provisions;
    if (!tf || typeof tf !== "object" || typeof tf.present !== "boolean") {
      stop("transitional_final", "transitional_final_provisions.present (true/false) must be declared");
      return;
    }
    const detected = header.transitional_final_starts_at ? norm(header.transitional_final_starts_at) : null;
    if (!tf.present && detected) stop("transitional_final", `Manifest says no transitional/final provisions, but a heading opens them at article ${detected}`);
    if (tf.present) {
      if (!tf.starts_at_article) stop("transitional_final", "transitional_final_provisions.starts_at_article is required when present=true");
      else if (!nums.includes(norm(tf.starts_at_article))) stop("transitional_final", `starts_at_article ${tf.starts_at_article} is not among the parsed articles`);
      else if (detected && detected !== norm(tf.starts_at_article)) stop("transitional_final", `Heading opens transitional/final provisions at ${detected}, manifest says ${tf.starts_at_article}`);
      else if (!detected) note("transitional_final", "No transitional/final heading detected in the text; relying on the manifest's starts_at_article");
    }
  });

  run("instrument_version", () => {
    for (const r of records) {
      const hasId = r.instrument_version_id !== null && r.instrument_version_id !== undefined && r.instrument_version_id !== "";
      const label = r.instrument_version_label || header.instrument_version_label || null;
      if (!hasId && !label) stop("instrument_version", "Article has neither instrument_version_id nor a version label (would be NULL)", r.article_number_normalized);
      else if (!hasId && label !== m.version_label) stop("instrument_version", `Article version label '${label}' differs from manifest '${m.version_label}'`, r.article_number_normalized);
    }
  });

  run("mixed_scripts", () => {
    for (const r of records) {
      const tokens = mixedScriptTokens(`${r.article_heading || ""}\n${r.article_text || ""}`);
      if (tokens.length) stop("mixed_scripts", `Mixed Latin/Cyrillic tokens: ${[...new Set(tokens)].slice(0, 5).join(", ")}`, r.article_number_normalized);
      if (/[A-Za-z]/.test(String(r.article_number_normalized))) stop("mixed_scripts", "Latin letter in article number", r.article_number_normalized);
    }
  });

  run("parser_findings", () => {
    const ack = m.acknowledged_warnings || [];
    const isAck = f => ack.some(a => a.code === f.code && (a.article == null || norm(a.article) === norm(f.article ?? "")) && a.reason);
    for (const f of header.warnings || []) {
      if (typeof f !== "object") continue;
      if (f.severity === "stop") {
        if (f.code === "unexplained_gap" || f.code === "mixed_script_token") continue; // recomputed above
        stop("parser_findings", `${f.code}: ${f.detail}`, f.article);
      } else if (f.severity === "warning") {
        if (isAck(f)) note("parser_findings", `acknowledged ${f.code}: ${f.detail}`, f.article);
        else {
          const check = { possible_header_footer: "header_footer", editorial_note_contamination: "amendment_editorial_contamination",
            amending_act_contamination: "amendment_editorial_contamination", malformed_article_header: "malformed_header" }[f.code] || "parser_findings";
          stop(check, `${f.code}: ${f.detail}`, f.article);
        }
      }
    }
  });

  run("provenance", () => {
    const s = m.source || {};
    if (!s.url || !/^https:\/\//.test(s.url)) stop("provenance", "source.url missing or not https");
    if (!s.sha256 || !/^[a-f0-9]{64}$/i.test(s.sha256)) stop("provenance", "source.sha256 missing or malformed");
    if (!s.issue_number && !s.issue_date) stop("provenance", "source.issue_number and source.issue_date are both missing");
    if (s.issue_date && !ISO_DATE.test(s.issue_date)) stop("provenance", "source.issue_date is not YYYY-MM-DD");
    for (const r of records) {
      if (!r.source?.url) stop("provenance", "Article without source url", r.article_number_normalized);
      if (!r.source?.sha256 || !/^[a-f0-9]{64}$/i.test(r.source.sha256)) stop("provenance", "Article without sha256", r.article_number_normalized);
      if (s.sha256 && r.source?.sha256 && r.source.sha256.toLowerCase() !== s.sha256.toLowerCase()) stop("provenance", "Article sha256 differs from manifest source", r.article_number_normalized);
      if (s.url && r.source?.url && r.source.url !== s.url) stop("provenance", "Article source url differs from manifest source", r.article_number_normalized);
    }
  });

  run("legal_status", () => {
    if (!LEGAL_STATUSES.has(m.legal_status)) stop("legal_status", `Unresolved legal_status '${m.legal_status}'`);
    const hg = m.human_gate || {};
    if (!HUMAN_GATE.has(hg.status)) stop("legal_status", `Unresolved human_gate.status '${hg.status}'`);
    const approved = hg.status === "approved" && hg.approved_by && hg.approved_at;
    if (m.legal_status === "current_consolidated" && !approved) stop("legal_status", "current_consolidated requires an approved Human Gate (status, approved_by, approved_at)");
    for (const r of records) {
      if (r.status === "current_consolidated" && !(approved && r.human_review_status === "approved")) {
        stop("legal_status", "Article marked current_consolidated without approved Human Gate", r.article_number_normalized);
      }
      if (r.status !== m.legal_status && r.status !== "repealed") stop("legal_status", `Article status '${r.status}' differs from manifest legal_status '${m.legal_status}'`, r.article_number_normalized);
    }
  });

  run("validity_dates", () => {
    const v = m.validity || {};
    for (const k of ["valid_from","application_from","valid_to"]) if (v[k] && !ISO_DATE.test(v[k])) stop("validity_dates", `validity.${k} is not YYYY-MM-DD`);
    if (v.application_from && v.valid_from && v.application_from < v.valid_from) stop("validity_dates", "application_from is before valid_from");
    const w = windowOf(v);
    if (w.start && w.end && w.end <= w.start) stop("validity_dates", "valid_to is not after the start of application");
    for (const o of m.other_versions || []) {
      if (o.version_label === m.version_label) stop("validity_dates", "other_versions repeats this version label");
      if ((w.start || w.end) && overlaps(w, windowOf(o))) stop("validity_dates", `Validity window overlaps version '${o.version_label}'`);
    }
    for (const r of records) {
      if ((r.valid_from || null) !== (v.valid_from || null) || (r.valid_to || null) !== (v.valid_to || null)) {
        note("validity_dates", "Article validity differs from version validity (verify intentional)", r.article_number_normalized);
      }
    }
  });

  const verdict = errors.length ? "STOP" : "PASS";
  return {
    validator_version: VALIDATOR_VERSION,
    verdict,
    instrument_key: m.instrument_key ?? null,
    version_label: m.version_label ?? null,
    parser_version: header.parser_version ?? null,
    counts: { articles: records.length, errors: errors.length, warnings: warnings.length,
              parser_warning_count: header.warning_count ?? null, first: nums[0] ?? null, last: nums[nums.length - 1] ?? null },
    checks, errors, warnings
  };
}

export function toMarkdown(r) {
  const lines = [
    `# Corpus QA — ${r.instrument_key} · ${r.version_label}`,
    "",
    `**Verdict: ${r.verdict}**  `,
    `Validator: ${r.validator_version} · Parser: ${r.parser_version ?? "unknown"}  `,
    `Articles: ${r.counts.articles} (first ${r.counts.first ?? "-"}, last ${r.counts.last ?? "-"}) · errors ${r.counts.errors} · notes ${r.counts.warnings}`,
    "",
    "| Check | Result |", "|---|---|",
    ...r.checks.map(c => `| ${c.name} | ${c.result} |`),
    ""
  ];
  if (r.errors.length) {
    lines.push("## STOP reasons", "", "| Check | Article | Detail |", "|---|---|---|",
      ...r.errors.map(e => `| ${e.check} | ${e.article ?? "-"} | ${String(e.detail).replace(/\|/g, "\\|")} |`), "");
  }
  if (r.warnings.length) {
    lines.push("## Notes (do not block)", "", "| Check | Article | Detail |", "|---|---|---|",
      ...r.warnings.map(e => `| ${e.check} | ${e.article ?? "-"} | ${String(e.detail).replace(/\|/g, "\\|")} |`), "");
  }
  lines.push("Human Gate remains required before any production import or status promotion.");
  return lines.join("\n") + "\n";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, ndjsonPath, manifestPath, jsonOut, mdOut] = process.argv;
  if (!ndjsonPath || !manifestPath || !jsonOut || !mdOut) {
    console.error("Usage: node scripts/validate-legal-corpus.mjs <parsed.ndjson> <manifest.json> <report.json> <report.md>");
    process.exit(2);
  }
  const report = validateCorpus(parseNdjson(fs.readFileSync(ndjsonPath, "utf8")), JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2) + "\n", "utf8");
  fs.writeFileSync(mdOut, toMarkdown(report), "utf8");
  console.error(`${report.verdict}: ${report.counts.errors} error(s), ${report.counts.warnings} note(s) — ${report.instrument_key} ${report.version_label}`);
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

export { parseNdjson };
