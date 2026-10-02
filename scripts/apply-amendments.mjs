#!/usr/bin/env node
// AI Advokat — deterministic amendment engine (corpus foundation).
//
// Applies ONE amending act to a parsed base corpus (parser v0.3 NDJSON) using a human-verified
// operations table, and writes a merged NDJSON plus a merge log. It never interprets legal text:
// every operation is an explicit instruction copied from the amending act, and anything that does
// not apply exactly (missing target, missing paragraph, 0 or 2+ matches, wrong order, unaccounted
// amending article) is a STOP. No partial output is written on STOP.
//
// Usage:
//   node scripts/apply-amendments.mjs <base.ndjson> <plan.json> <merged.ndjson> <merge-log.json>
// Exit code 0 = APPLIED, 1 = STOP, 2 = usage error.
//
// Several amending acts are applied by running the engine once per act, in chronological order;
// the merged output of one run is the base of the next (the source_chain records the order).
//
// Plan format (engine_input_version 1):
// {
//   "engine_input_version": 1,
//   "instrument_key": "mk:zpp",
//   "base":      { "role": "official_consolidation", "issue_number": "7/2011", "issue_date": "2011-01-20",
//                  "url": "https://...", "sha256": "<64 hex>" },
//   "amendment": { "role": "amendment", "issue_number": "124/2015", "issue_date": "2015-07-23",
//                  "url": "https://...", "sha256": "<64 hex>", "article_count": 40 },
//   "target":    { "version_label": "...", "status": "needs_version_review",
//                  "valid_from": "YYYY-MM-DD|null", "application_from": "YYYY-MM-DD|null", "valid_to": "YYYY-MM-DD|null" },
//   "operations": [
//     { "op": "replace_article",   "amendment_article": 1, "source_text": "...", "target": "12", "new_text": "..." },
//     { "op": "insert_article",    "amendment_article": 2, "source_text": "...", "after": "12", "number": "12-а", "text": "..." },
//     { "op": "delete_article",    "amendment_article": 3, "source_text": "Членот 15 се брише.", "target": "15" },
//     { "op": "replace_paragraph", "amendment_article": 4, "source_text": "...", "target": "20", "paragraph": "2", "new_text": "(2) ..." },
//     { "op": "textual_edit",      "amendment_article": 5, "source_text": "...", "target": "21", "paragraph": "1",
//       "find": "300.000", "replace": "600.000", "expected_matches": 1 },
//     { "op": "non_text",          "amendment_article": 6, "source_text": "...", "kind": "application" }
//   ]
// }
import fs from "node:fs";
import crypto from "node:crypto";
import { parseLegalText, normalizeArticleNumber, PARSER_VERSION } from "./parse-mk-legal-text.mjs";

export const ENGINE_VERSION = "mk-amendment-engine-v1.0.0";

const OPS = {
  replace_article:   ["target", "new_text"],
  insert_article:    ["after", "number", "text"],
  delete_article:    ["target"],
  replace_paragraph: ["target", "paragraph", "new_text"],
  textual_edit:      ["target", "find", "replace"],
  non_text:          ["kind"]
};
const OPTIONAL = { textual_edit: ["paragraph", "expected_matches", "whole_word"], non_text: ["note"] };
const COMMON = ["op", "amendment_article", "source_text"];
const NON_TEXT_KINDS = new Set(["transitional", "entry_into_force", "application", "other"]);
const ALLOWED_TARGET_STATUSES = new Set(["source_text", "needs_version_review", "historical", "verified"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const PARA_LINE = /^\s*\(([0-9]+)\)/u;
// A line with upper-case Cyrillic and no lower-case letters (e.g. "ПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ") is a
// chapter/section heading that the parser leaves at the end of the preceding article. It is not part of
// that article: paragraph blocks stop before it, and replacing or deleting the article keeps it.
const STRUCTURAL_LINE = /^(?=.*[А-ШЃЅЈЉЊЌЏ])[^a-zа-шѓѕјљњќџ]+$/u;

function splitTrailingStructure(lines) {
  let k = lines.length;
  while (k > 0 && STRUCTURAL_LINE.test(lines[k - 1].trim()) && !PARA_LINE.test(lines[k - 1])) k--;
  return { body: lines.slice(0, k), trailing: lines.slice(k) };
}

export class AmendmentStop extends Error {
  constructor(stops, log) {
    super(`STOP: ${stops.map(s => s.detail).join(" | ")}`);
    this.stops = stops;
    this.log = log;
  }
}

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");
const compactText = (s) => String(s).normalize("NFC").replace(/\r\n?/g, "\n").split("\n")
  .map(l => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function orderKey(n) {
  const [base, suffix = ""] = String(n).split("-");
  return [Number(base), suffix];
}
function compareNumbers(a, b) {
  const [ab, as] = orderKey(a), [bb, bs] = orderKey(b);
  if (ab !== bb) return ab - bb;
  return as.localeCompare(bs, "mk");
}

function normNumber(raw) {
  const n = normalizeArticleNumber(String(raw ?? ""));
  if (!/^[0-9]+(-[а-шѓѕјљњќџ])?$/u.test(n)) return null;
  return n;
}

function paragraphBlock(lines, paragraph) {
  const starts = [];
  lines.forEach((l, i) => { const m = l.match(PARA_LINE); if (m) starts.push({ i, n: m[1] }); });
  const hits = starts.filter(s => s.n === String(paragraph));
  if (hits.length !== 1) return { error: hits.length ? `paragraph (${paragraph}) appears ${hits.length} times` : `paragraph (${paragraph}) not found` };
  const next = starts.find(s => s.i > hits[0].i);
  let end = next ? next.i : lines.length;
  const structural = lines.findIndex((l, i) => i > hits[0].i && i < end && STRUCTURAL_LINE.test(l.trim()));
  if (structural >= 0) end = structural;
  return { start: hits[0].i, end };
}

function validatePlan(plan, header, records) {
  const stops = [];
  const stop = (detail, index = null) => stops.push({ check: "plan", detail, operation: index });
  if (!plan || typeof plan !== "object") { stop("plan is not an object"); return stops; }
  if (plan.engine_input_version !== 1) stop(`engine_input_version must be 1 (got ${plan.engine_input_version})`);
  if (plan.instrument_key !== header.instrument_key) stop(`plan instrument_key '${plan.instrument_key}' differs from base corpus '${header.instrument_key}'`);
  if ((header.errors || []).length) stop(`base corpus has ${header.errors.length} parser error(s)`);
  const baseStopFindings = Array.isArray(header.warnings) ? header.warnings.filter(w => w?.severity === "stop") : [];
  if (baseStopFindings.length) {
    stop(`base corpus has ${baseStopFindings.length} parser STOP finding(s): ${baseStopFindings.map(w => w.code || "unknown").join(", ")}`);
  }
  const pv = String(header.parser_version || "").match(/v(\d+)\.(\d+)/);
  if (!pv || (Number(pv[1]) === 0 && Number(pv[2]) < 3)) stop(`base corpus parser '${header.parser_version}' predates v0.3`);
  if (!records.length) stop("base corpus has no article records");

  for (const key of ["base", "amendment"]) {
    const s = plan[key];
    if (!s || typeof s !== "object") { stop(`${key} source is missing`); continue; }
    if (!s.role) stop(`${key}.role is missing`);
    if (!s.url || !/^https:\/\//.test(s.url)) stop(`${key}.url missing or not https`);
    if (!s.sha256 || !SHA256_RE.test(s.sha256)) stop(`${key}.sha256 missing or malformed`);
    if (!s.issue_number) stop(`${key}.issue_number is missing`);
    if (!s.issue_date || !ISO_DATE.test(s.issue_date)) stop(`${key}.issue_date missing or not YYYY-MM-DD`);
  }
  const chain = Array.isArray(header.source_chain) && header.source_chain.length ? header.source_chain : null;
  const baseSha = String(chain ? chain[0].sha256 : header.source_sha256 || "").toLowerCase();
  const baseUrl = chain ? chain[0].url : header.source_url;
  if (plan.base?.sha256 && plan.base.sha256.toLowerCase() !== baseSha) stop("base.sha256 does not match the base corpus");
  if (plan.base?.url && plan.base.url !== baseUrl) stop("base.url does not match the base corpus");
  if (plan.amendment?.sha256 && plan.base?.sha256 && plan.amendment.sha256.toLowerCase() === plan.base.sha256.toLowerCase()) stop("amendment.sha256 equals base.sha256");
  if (chain && plan.amendment?.sha256 && chain.some(c => String(c.sha256).toLowerCase() === plan.amendment.sha256.toLowerCase())) {
    stop("this amending act has already been applied to the base corpus");
  }
  const lastDate = (chain ? chain[chain.length - 1].issue_date : plan.base?.issue_date) || null;
  if (lastDate && plan.amendment?.issue_date && plan.amendment.issue_date <= lastDate) {
    stop(`amendment ${plan.amendment.issue_number} (${plan.amendment.issue_date}) is not later than the last applied source (${lastDate}); apply acts in chronological order`);
  }
  const count = plan.amendment?.article_count;
  if (!Number.isInteger(count) || count < 1) stop("amendment.article_count must be a positive integer (number of articles in the amending act)");

  const t = plan.target;
  if (!t || typeof t !== "object") stop("target is missing");
  else {
    if (!t.version_label) stop("target.version_label is missing");
    if (!ALLOWED_TARGET_STATUSES.has(t.status)) stop(`target.status '${t.status}' is not allowed (the engine never produces current_consolidated or repealed versions)`);
    if (t.human_review_status !== undefined && t.human_review_status !== "pending") stop("target.human_review_status must be 'pending' (Human Gate is never set by the engine)");
    for (const k of ["valid_from", "application_from", "valid_to"]) if (t[k] && !ISO_DATE.test(t[k])) stop(`target.${k} is not YYYY-MM-DD`);
    const start = t.application_from || t.valid_from;
    if (t.application_from && t.valid_from && t.application_from < t.valid_from) stop("target.application_from is before target.valid_from");
    if (start && t.valid_to && t.valid_to <= start) stop("target.valid_to is not after the start of application");
  }

  if (!Array.isArray(plan.operations) || !plan.operations.length) { stop("operations must be a non-empty array"); return stops; }
  const covered = new Set();
  let previousAmendmentArticle = 0;
  plan.operations.forEach((o, i) => {
    if (!o || typeof o !== "object") { stop("operation is not an object", i); return; }
    const required = OPS[o.op];
    if (!required) { stop(`unknown op '${o.op}'`, i); return; }
    const allowed = new Set([...COMMON, ...required, ...(OPTIONAL[o.op] || [])]);
    for (const k of Object.keys(o)) if (!allowed.has(k)) stop(`unexpected field '${k}' for ${o.op}`, i);
    for (const k of required) if (o[k] === undefined || o[k] === null || (k !== "replace" && o[k] === "")) stop(`${o.op} requires '${k}'`, i);
    if (!Number.isInteger(o.amendment_article) || o.amendment_article < 1 || (Number.isInteger(count) && o.amendment_article > count)) {
      stop(`amendment_article must be an integer between 1 and ${count}`, i);
    } else {
      if (o.amendment_article < previousAmendmentArticle) {
        stop(`amendment_article ${o.amendment_article} is out of statutory order after ${previousAmendmentArticle}; operations must be nondecreasing`, i);
      }
      previousAmendmentArticle = Math.max(previousAmendmentArticle, o.amendment_article);
      covered.add(o.amendment_article);
    }
    if (typeof o.source_text !== "string" || !o.source_text.trim()) stop("source_text (verbatim instruction from the amending act) is required", i);
    if (o.op === "non_text" && !NON_TEXT_KINDS.has(o.kind)) stop(`non_text kind must be one of ${[...NON_TEXT_KINDS].join(", ")}`, i);
    if (o.op === "textual_edit") {
      if (typeof o.find !== "string" || !o.find.trim()) stop("textual_edit find must be a non-empty string", i);
      if (typeof o.replace !== "string") stop("textual_edit replace must be a string (may be empty for a deletion)", i);
      if (o.find === o.replace) stop("textual_edit find equals replace", i);
      if (o.expected_matches !== undefined && (!Number.isInteger(o.expected_matches) || o.expected_matches < 1)) stop("expected_matches must be a positive integer", i);
      if (o.whole_word !== undefined && typeof o.whole_word !== "boolean") stop("whole_word must be true or false", i);
    }
  });
  if (Number.isInteger(count)) {
    for (let k = 1; k <= count; k++) if (!covered.has(k)) stop(`amending article ${k} is not accounted for by any operation (add an operation or a non_text entry)`);
  }
  return stops;
}

function reparse(number, text, header, target) {
  const meta = {
    instrument_key: header.instrument_key, instrument_title: header.instrument_title || header.instrument_key,
    version_id: target.version_label, version_label: target.version_label,
    source_url: "https://engine.invalid/reparse", source_sha256: "0".repeat(64), status: target.status
  };
  return parseLegalText(`Член ${number}\n${text}`, meta, { strict: false });
}

export function applyAmendments(base, plan) {
  const header = base?.manifest || {};
  const records = (base?.records || []).map(r => JSON.parse(JSON.stringify(r)));
  const log = {
    engine_version: ENGINE_VERSION, parser_version: PARSER_VERSION, verdict: null,
    instrument_key: plan?.instrument_key ?? null,
    base: plan?.base ?? null, amendment: plan?.amendment ?? null, target: plan?.target ?? null,
    operations: [], stops: [], summary: null
  };
  const fail = (stops) => { log.verdict = "STOP"; log.stops = stops; throw new AmendmentStop(stops, log); };

  const planStops = validatePlan(plan, header, records);
  if (planStops.length) fail(planStops);

  const amendSource = {
    issue_number: plan.amendment.issue_number, issue_date: plan.amendment.issue_date,
    url: plan.amendment.url, page_start: null, page_end: null, sha256: plan.amendment.sha256.toLowerCase()
  };
  const derived = (o) => ({
    role: plan.amendment.role, issue_number: plan.amendment.issue_number, issue_date: plan.amendment.issue_date,
    sha256: plan.amendment.sha256.toLowerCase(), amendment_article: o.amendment_article, op: o.op
  });

  const state = records;
  const find = (n) => state.findIndex(r => r.article_number_normalized === n);
  const changed = new Map(); // number -> true when text changed
  const extraFindings = [];

  plan.operations.forEach((o, i) => {
    const entry = { index: i, op: o.op, amendment_article: o.amendment_article, source_text: o.source_text };
    const opStop = (detail) => fail([{ check: "operation", detail: `#${i} ${o.op} (amending art. ${o.amendment_article}): ${detail}`, operation: i }]);
    log.operations.push(entry);

    if (o.op === "non_text") { entry.kind = o.kind; entry.result = "recorded"; return; }

    if (o.op === "insert_article") {
      const after = normNumber(o.after), number = normNumber(o.number);
      if (!after) opStop(`'after' value '${o.after}' is not a valid article number`);
      if (!number) opStop(`'number' value '${o.number}' is not a valid article number (Cyrillic letter suffix only)`);
      const ai = find(after);
      if (ai < 0) opStop(`article ${after} (insert after) does not exist`);
      if (find(number) >= 0) opStop(`article ${number} already exists`);
      if (compareNumbers(number, after) <= 0) opStop(`article ${number} would not come after ${after}`);
      const next = state[ai + 1];
      if (next && compareNumbers(number, next.article_number_normalized) >= 0) opStop(`article ${number} would not come before the next article ${next.article_number_normalized}`);
      const text = compactText(o.text);
      if (!text) opStop("text is empty");
      const template = state[ai];
      const rec = {
        ...JSON.parse(JSON.stringify(template)),
        article_number: number, article_number_normalized: number, article_text: text,
        source: { ...amendSource }, derived_from: [derived(o)], extraction_method: "amendment_engine"
      };
      state.splice(ai + 1, 0, rec);
      changed.set(number, true);
      Object.assign(entry, { number, after, before_text: null, after_text: text, result: "applied" });
      return;
    }

    const target = normNumber(o.target);
    if (!target) opStop(`target '${o.target}' is not a valid article number`);
    const ti = find(target);
    if (ti < 0) opStop(`target article ${target} does not exist`);
    const rec = state[ti];
    if (rec.status === "repealed") opStop(`target article ${target} is already repealed`);
    const before = rec.article_text;
    let after;
    entry.target = target;

    const { trailing } = splitTrailingStructure(before.split("\n"));
    if (o.op === "replace_article") {
      after = compactText(o.new_text);
      if (!after) opStop("new_text is empty");
      if (trailing.length) { after = [after, ...trailing].join("\n"); entry.kept_trailing_structure = trailing; }
    } else if (o.op === "delete_article") {
      // The repealed article keeps only the amending act's own words ("Членот N се брише."), verbatim.
      after = compactText(o.source_text);
      if (trailing.length) { after = [after, ...trailing].join("\n"); entry.kept_trailing_structure = trailing; }
      rec.status = "repealed";
    } else if (o.op === "replace_paragraph") {
      const lines = before.split("\n");
      const b = paragraphBlock(lines, o.paragraph);
      if (b.error) opStop(`article ${target}: ${b.error}`);
      const repl = compactText(o.new_text);
      if (!repl.match(PARA_LINE) || repl.match(PARA_LINE)[1] !== String(o.paragraph)) opStop(`new_text must start with the paragraph marker (${o.paragraph})`);
      after = [...lines.slice(0, b.start), ...repl.split("\n"), ...lines.slice(b.end)].join("\n");
      entry.paragraph = String(o.paragraph);
    } else if (o.op === "textual_edit") {
      const lines = before.split("\n");
      let start = 0, end = lines.length;
      if (o.paragraph !== undefined) {
        const b = paragraphBlock(lines, o.paragraph);
        if (b.error) opStop(`article ${target}: ${b.error}`);
        ({ start, end } = b);
        entry.paragraph = String(o.paragraph);
      }
      const scope = lines.slice(start, end).join("\n");
      // Literal match; whitespace runs match any whitespace (line wraps). whole_word: the match may not
      // touch another letter ("зборот X" in an amending act), using Unicode letters, not ASCII \b.
      const core = escapeRe(o.find.trim()).replace(/\s+/g, "\\s+");
      const re = new RegExp(o.whole_word ? `(?<![\\p{L}])${core}(?![\\p{L}])` : core, "gu");
      const matches = scope.match(re) || [];
      const expected = o.expected_matches ?? 1;
      entry.matches = matches.length;
      if (matches.length !== expected) opStop(`'${o.find}' matches ${matches.length} time(s) in article ${target}${o.paragraph !== undefined ? ` paragraph (${o.paragraph})` : ""}; expected exactly ${expected}`);
      const edited = scope.replace(re, o.replace).split("\n").map(l => l.replace(/[ \t]+/g, " ").trim());
      if (o.paragraph !== undefined) {
        const m = (edited[0] || "").match(PARA_LINE);
        if (!m || m[1] !== String(o.paragraph)) opStop(`the edit would alter the paragraph marker (${o.paragraph})`);
      }
      after = compactText([...lines.slice(0, start), ...edited, ...lines.slice(end)].join("\n"));
      if (!after) opStop("the edit leaves the article empty (use delete_article)");
    }

    rec.article_text = after;
    rec.derived_from = [...(Array.isArray(rec.derived_from) ? rec.derived_from : []), derived(o)];
    changed.set(target, true);
    Object.assign(entry, { before_text: before, after_text: after, before_sha256: sha256(before), after_sha256: sha256(after), result: "applied" });
  });

  // Re-derive heading/paragraphs of changed articles with the parser itself; any structural problem is a STOP.
  for (const n of changed.keys()) {
    const rec = state[find(n)];
    const p = reparse(n, rec.article_text, header, plan.target);
    if (p.errors.length || p.records.length !== 1 || p.records[0].article_number_normalized !== n) {
      fail([{ check: "reparse", detail: `article ${n}: changed text does not re-parse as exactly one article (${p.errors.map(e => e.code).join(", ") || `${p.records.length} records`}); it may contain an article header`, operation: null }]);
    }
    const stopsHere = p.warnings.filter(w => w.severity === "stop");
    if (stopsHere.length) fail(stopsHere.map(w => ({ check: "reparse", detail: `article ${n}: ${w.code}: ${w.detail}`, operation: null })));
    for (const w of p.warnings.filter(w => w.severity === "warning")) extraFindings.push({ ...w, article: n, line: null, source: "amendment_engine" });
    rec.article_heading = p.records[0].article_heading;
    rec.paragraphs = p.records[0].paragraphs;
  }

  // Bind every record to the target version.
  const priorChain = Array.isArray(header.source_chain) && header.source_chain.length
    ? header.source_chain
    : [{ role: plan.base.role, issue_number: plan.base.issue_number, issue_date: plan.base.issue_date, url: plan.base.url, sha256: plan.base.sha256.toLowerCase() }];
  const sourceChain = [...priorChain, { role: plan.amendment.role, issue_number: plan.amendment.issue_number, issue_date: plan.amendment.issue_date, url: plan.amendment.url, sha256: plan.amendment.sha256.toLowerCase() }];
  const chainSeed = sourceChain.map(c => c.sha256).join("+");
  const t = plan.target;
  for (const r of state) {
    r.version_id = t.version_label;
    r.instrument_version_label = t.version_label;
    r.instrument_version_id = null;
    if (r.status !== "repealed") r.status = t.status;
    r.human_review_status = "pending";
    r.valid_from = t.valid_from || null;
    r.valid_to = t.valid_to || null;
    r.canonical_id = "MK:" + sha256(["MK", header.instrument_key, t.version_label, "ART", r.article_number_normalized, chainSeed].join(":")).slice(0, 32);
  }

  const bases = [...new Set(state.map(r => Number(String(r.article_number_normalized).split("-")[0])))].sort((a, b) => a - b);
  const gaps = [];
  for (let n = bases[0]; n <= bases[bases.length - 1]; n++) if (!bases.includes(n)) gaps.push(String(n));
  const warnings = [...(header.warnings || []), ...extraFindings];
  const merged = {
    ...header,
    records: undefined,
    merge_engine_version: ENGINE_VERSION,
    version_id: t.version_label,
    instrument_version_label: t.version_label,
    source_chain: sourceChain,
    article_count: state.length,
    first_article: state[0]?.article_number_normalized ?? null,
    last_article: state[state.length - 1]?.article_number_normalized ?? null,
    gaps,
    lettered_articles: state.filter(r => r.article_number_normalized.includes("-")).map(r => r.article_number_normalized),
    repealed_articles: state.filter(r => r.status === "repealed").map(r => r.article_number_normalized),
    warning_count: warnings.filter(w => w.severity === "stop" || w.severity === "warning").length,
    info_count: warnings.filter(w => w.severity === "info").length,
    warnings,
    errors: []
  };

  log.verdict = "APPLIED";
  log.source_chain = sourceChain;
  log.summary = {
    operations: plan.operations.length,
    changed_articles: [...changed.keys()].length,
    inserted: log.operations.filter(e => e.op === "insert_article").map(e => e.number),
    repealed: log.operations.filter(e => e.op === "delete_article").map(e => e.target),
    non_text: log.operations.filter(e => e.op === "non_text").map(e => ({ amendment_article: e.amendment_article, kind: e.kind })),
    article_count_before: base.records.length,
    article_count_after: state.length,
    new_parser_warnings: extraFindings.length
  };
  return { header: merged, records: state, log };
}

export function toNdjson({ header, records }) {
  return [JSON.stringify({ type: "ingest_manifest", ...header }), ...records.map(r => JSON.stringify({ type: "article", ...r }))].join("\n") + "\n";
}

export function readNdjson(text) {
  const lines = text.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
  return { manifest: lines.find(x => x.type === "ingest_manifest") || null, records: lines.filter(x => x.type === "article") };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, basePath, planPath, outPath, logPath] = process.argv;
  if (!basePath || !planPath || !outPath || !logPath) {
    console.error("Usage: node scripts/apply-amendments.mjs <base.ndjson> <plan.json> <merged.ndjson> <merge-log.json>");
    process.exit(2);
  }
  const base = readNdjson(fs.readFileSync(basePath, "utf8"));
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  try {
    const result = applyAmendments(base, plan);
    fs.writeFileSync(outPath, toNdjson(result), "utf8");
    fs.writeFileSync(logPath, JSON.stringify(result.log, null, 2) + "\n", "utf8");
    console.error(`APPLIED: ${result.log.summary.operations} operation(s), ${result.log.summary.changed_articles} article(s) changed, ${result.records.length} articles`);
    process.exit(0);
  } catch (e) {
    if (!(e instanceof AmendmentStop)) throw e;
    if (fs.existsSync(outPath)) fs.rmSync(outPath); // never leave a stale merged corpus next to a STOP log
    fs.writeFileSync(logPath, JSON.stringify(e.log, null, 2) + "\n", "utf8");
    for (const s of e.stops) console.error(`[STOP] ${s.check}: ${s.detail}`);
    process.exit(1);
  }
}
