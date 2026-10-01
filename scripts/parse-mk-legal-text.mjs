#!/usr/bin/env node
// Macedonian legal text -> article-level records.
//
// v0.3 principles (Corpus Safety Foundation):
//   * never rewrite legal text; ambiguity becomes a finding, not a fix;
//   * structural impossibilities (duplicate / out-of-order / empty / homoglyph
//     article numbers) throw in strict mode (the default, used by the CLI);
//   * everything else is reported as a finding with a severity:
//       stop    -> the QA validator must STOP (e.g. unexplained gap, mixed script)
//       warning -> the QA validator STOPs unless the manifest acknowledges it
//       info    -> reported only
//   * warning_count counts stop + warning findings, so it is never silently 0.
import fs from "node:fs";
import crypto from "node:crypto";

export const PARSER_VERSION = "mk-legal-article-v0.3.0";

function norm(s="") {
  return String(s).normalize("NFKC").replace(/\r\n?/g, "\n");
}

function compact(s="") {
  return norm(s).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Every dash a PDF/HTML source may use between the number and the letter.
const DASHES = "\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212";
const CYR_LOWER = "а-шѓѕјљњќџ";
const CYR_UPPER = "А-ШЃЅЈЉЊЌЏ";

// Header: capital "Член", number, optional (dash) single letter suffix, optional period,
// nothing else on the line. Case-sensitive on purpose: a wrapped cross-reference
// line such as "член 5" must not start a new article.
const HEADER_RE = new RegExp(
  `^\\s*Член\\s+([0-9]+)(?:\\s*[${DASHES}]?\\s*([A-Za-z${CYR_LOWER}${CYR_UPPER}]))?\\s*\\.?\\s*$`, "u");
const LOWER_HEADER_RE = new RegExp(`^\\s*член\\s+[0-9]+(?:\\s*[${DASHES}]?\\s*[A-Za-z${CYR_LOWER}])?\\s*\\.?\\s*$`, "u");

const PARA_RE = /^\s*\(([0-9]+)\)\s*(.*)$/u;
const ITEM_RE = /^\s*(?:([0-9]+)[.)]|([А-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ])[.)])\s+(.*)$/u;

// Contamination signals (reported, never removed).
const HEADER_FOOTER_PATTERNS = [
  // Whole-line banners only: sentences that cite the Gazette ("...објавувањето во „Службен весник...“")
  // are normal legal text and must not be flagged.
  { code: "gazette_banner", re: /^\s*[„"]?Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија[“"]?\s*(?:,?\s*бр(?:ој)?\.?\s*[0-9/]+)?[\s,.0-9]*$/u },
  { code: "consolidation_banner", re: /^\s*Редакциски\s+пречистени\s+текстови\s*$/iu },
  { code: "page_x_of_y", re: /^\s*\d+\s+од\s+\d+\s*$/u },
  { code: "page_label", re: /^\s*(?:стр\.?|страна|page)\s*\d+\s*$/iu },
  { code: "bare_page_number", re: /^\s*\d{1,4}\s*$/u },
  { code: "form_feed", re: /\f/u }
];
const AMENDING_ACT_PATTERNS = [
  /ЗАКОН\s+ЗА\s+ИЗМЕНУВАЊЕ(?:\s+И\s+ДОПОЛНУВАЊЕ)?\s+НА\s+ЗАКОНОТ/u,
  /ОДРЕДБИ\s+ОД\s+(?:ДРУГИ\s+)?ЗАКОНИ/u,
  /Одредби\s+од\s+Законот\s+за\s+изменување/u,
  /Пречистениот\s+текст\s+на\s+Законот/u
];
// Editorial/amendment notes that consolidated texts sometimes interleave with the law.
// Citations of the Gazette inside legal sentences are NOT matched (they are normal law text).
const EDITORIAL_NOTE_PATTERNS = [
  /^\s*\*{1,3}\s*\S/u,
  /^\s*(?:Напомена|Забелешка|Редакциска\s+(?:белешка|напомена))(?![\p{L}])/iu,
  /^\s*\[?\s*(?:Членот|Ставот|Точката|Алинејата)\s+(?:е|се)\s+(?:изменет|дополнет|избришан|бришан)/iu,
  /\((?:изменет|дополнет|избришан)\s+со(?![\p{L}])/iu
];
// Heading that opens the transitional/final provisions (it sits at the end of the previous article's body).
const TRANSITIONAL_HEADING_RE = /^\s*(?:[IVXLC]+\.?\s+)?(?:ПРЕОДНИ\s+И\s+ЗАВРШНИ\s+ОДРЕДБИ|ПРЕОДНИ\s+ОДРЕДБИ|ЗАВРШНИ\s+ОДРЕДБИ|ЗАВРШНА\s+ОДРЕДБА|ПРЕОДНА\s+И\s+ЗАВРШНА\s+ОДРЕДБА)\s*$/u;
// Short line that looks like an article header but is not a valid one ("ЧЛЕН 5", "Член5", "Член 5)", "Член 5-аб").
const HEADER_LIKE_RE = /^\s*(?:ЧЛЕН|Член|Чл\.?)\s*[0-9]+\S{0,4}(?:\s+\S{1,3})?\s*$/u;
const HEADER_WORD_HOMOGLYPH_RE = /^\s*[\p{L}]{4}\s+[0-9]+(?:\s*[-–—]?\s*\p{L})?\s*\.?\s*$/u;

const REPEALED_BODY_RE = /^\(?\s*(?:избришан|се\s+брише|бришан|престанува\s+да\s+важи|престана(?:т)?\s+да\s+важи|укинат)\s*\)?\s*\.?$/iu;

export function normalizeArticleNumber(raw="") {
  const m = norm(raw).trim().match(new RegExp(`^([0-9]+)(?:\\s*[${DASHES}]?\\s*([A-Za-z${CYR_LOWER}${CYR_UPPER}]))?$`, "u"));
  if (!m) {
    return norm(raw).trim().toLocaleLowerCase("mk").replace(new RegExp(`[${DASHES}]`, "gu"), "-").replace(/\s+/g, "");
  }
  return m[2] ? `${Number(m[1])}-${m[2].toLocaleLowerCase("mk")}` : String(Number(m[1]));
}

function isLatin(ch) { return /[A-Za-z]/.test(ch); }

/** Tokens (letter runs) that mix Latin and Cyrillic letters, e.g. "kulturата". */
export function mixedScriptTokens(text) {
  const out = [];
  for (const m of norm(text).matchAll(/[\p{L}]+/gu)) {
    const t = m[0];
    if (/[A-Za-z]/.test(t) && /[Ѐ-ӿ]/.test(t)) out.push(t);
  }
  return out;
}

export function splitArticles(text) {
  const lines = norm(text).split("\n");
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER_RE);
    if (!m) continue;
    const suffix = m[2] || null;
    starts.push({
      line: i,
      number: suffix ? `${m[1]}-${suffix}` : m[1],
      base: Number(m[1]),
      suffix,
      raw: lines[i].trim()
    });
  }
  return starts.map((here, n) => {
    const end = n + 1 < starts.length ? starts[n + 1].line : lines.length;
    return { ...here, bodyLines: lines.slice(here.line + 1, end), bodyStartLine: here.line + 2 };
  });
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
      current={ paragraph_number:pm[1], paragraph_order:paragraphs.length+1, text:pm[2] || "", items:[] };
      paragraphs.push(current);
      itemOrder=0;
      continue;
    }

    const im=line.match(ITEM_RE);
    if (im && !current) {
      current={ paragraph_number:"1", paragraph_order:1, text:"", items:[] };
      paragraphs.push(current);
      itemOrder=0;
    }
    if (current && im) {
      itemOrder++;
      current.items.push({ item_number:im[1] || im[2], item_order:itemOrder, text:im[3] });
      continue;
    }

    if (!current) {
      current={ paragraph_number:"1", paragraph_order:1, text:"", items:[] };
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

class ParseError extends Error {
  constructor(message, findings) { super(message); this.findings = findings; }
}

/**
 * Parses a legal text. Options:
 *   strict (default true): throw on structural errors (duplicate, out-of-order,
 *   empty body, Latin homoglyph in an article number). With strict=false the
 *   errors are returned in `errors` for the QA validator.
 * meta.allowed_gaps: array of article numbers whose absence is officially explained.
 */
export function parseLegalText(text, meta, { strict = true } = {}) {
  const required=["instrument_key","instrument_title","version_id","source_url","source_sha256"];
  for (const key of required) {
    if (meta[key]===undefined || meta[key]===null || meta[key]==="") {
      throw new Error("Missing required metadata: "+key);
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(meta.source_sha256)) {
    throw new Error("source_sha256 must be a 64-character SHA-256 hex digest");
  }

  const findings = [];
  const errors = [];
  const add = (severity, code, detail, article = null, line = null) => findings.push({ severity, code, article, line, detail });
  const fail = (code, detail, article = null, line = null) => errors.push({ severity: "error", code, article, line, detail });

  const lines = norm(text).split("\n");
  lines.forEach((l, i) => {
    if (HEADER_RE.test(l)) return;
    if (LOWER_HEADER_RE.test(l)) {
      add("warning", "lowercase_article_marker_line",
        "A line containing only a lowercase 'член N' was NOT treated as an article header (likely a wrapped cross-reference). Verify against the source.", null, i + 1);
      return;
    }
    const looksLikeHeader = HEADER_LIKE_RE.test(l) ||
      (HEADER_WORD_HOMOGLYPH_RE.test(l) && mixedScriptTokens(l.split(/\s+/).filter(Boolean)[0] || "").length > 0);
    if (looksLikeHeader) {
      add("warning", "malformed_article_header",
        `Line '${l.trim().slice(0, 40)}' looks like an article header but is not a valid 'Член N' header; it was kept as body text. An article may be missing.`, null, i + 1);
    }
  });

  const rawArticles = splitArticles(text);
  if (!rawArticles.length) throw new Error("No Macedonian article headers ('Член N') detected.");

  const seen = new Set();
  const records = [];
  const transitionalHeadingAfter = [];
  let prevKey = null;

  for (const raw of rawArticles) {
    const number = raw.number;
    if (raw.suffix && isLatin(raw.suffix)) {
      fail("latin_letter_in_article_number",
        `Article header '${raw.raw}' uses a Latin letter suffix; Macedonian texts use Cyrillic. Possible homoglyph — not normalised.`,
        number, raw.line + 1);
    }
    const numberNorm = normalizeArticleNumber(number);
    if (seen.has(numberNorm)) {
      fail("duplicate_article_number", `Duplicate article number detected: ${number}`, number, raw.line + 1);
      continue;
    }
    seen.add(numberNorm);

    const orderKey = [raw.base, raw.suffix ? raw.suffix.toLocaleLowerCase("mk") : ""];
    if (prevKey && (orderKey[0] < prevKey[0] || (orderKey[0] === prevKey[0] && orderKey[1].localeCompare(prevKey[1], "mk") <= 0))) {
      fail("non_monotonic_article_sequence",
        `Article ${number} appears after ${prevKey.join("-").replace(/-$/, "")}; numbering must increase (possible cross-reference parsed as header, or appended amending act).`,
        number, raw.line + 1);
    }
    prevKey = orderKey;

    const body = compact(raw.bodyLines.join("\n"));
    if (!body) {
      fail("empty_article_body", `Empty article body: ${number}`, number, raw.line + 1);
      continue;
    }

    raw.bodyLines.forEach((l, k) => {
      for (const p of HEADER_FOOTER_PATTERNS) {
        if (p.re.test(l)) {
          add("warning", "possible_header_footer",
            `${p.code}: '${l.trim().slice(0, 80)}' inside the article body`, numberNorm, raw.bodyStartLine + k);
        }
      }
      for (const re of EDITORIAL_NOTE_PATTERNS) {
        if (re.test(l)) {
          add("warning", "editorial_note_contamination",
            `Editorial/amendment note inside the article body: '${l.trim().slice(0, 80)}'`, numberNorm, raw.bodyStartLine + k);
          break;
        }
      }
      if (TRANSITIONAL_HEADING_RE.test(l)) {
        transitionalHeadingAfter.push(numberNorm);
        add("info", "transitional_final_heading",
          `Heading '${l.trim()}' found at the end of article ${number}; transitional/final provisions start with the next article.`, numberNorm, raw.bodyStartLine + k);
      }
      for (const re of AMENDING_ACT_PATTERNS) {
        if (re.test(l)) {
          add("warning", "amending_act_contamination",
            `Text from an amending act or consolidation note appears inside the article body: '${l.trim().slice(0, 80)}'`, numberNorm, raw.bodyStartLine + k);
        }
      }
    });

    const mixed = mixedScriptTokens(raw.bodyLines.join("\n"));
    if (mixed.length) {
      add("stop", "mixed_script_token",
        `Tokens mixing Latin and Cyrillic letters: ${[...new Set(mixed)].slice(0, 5).join(", ")}`, numberNorm);
    }

    let status = meta.status || "source_text";
    if (body.length <= 80 && REPEALED_BODY_RE.test(body.replace(/\s+/g, " "))) {
      status = "repealed";
      add("info", "repealed_article_detected", `Body '${body}' marks the article as deleted; status set to 'repealed', text kept verbatim.`, numberNorm);
    }

    const {heading,paragraphs}=parseStructure(raw.bodyLines);
    // Canonical id is unchanged from v0.2 for every header v0.2 recognised ("25-а" stays "25-а").
    const canonicalSeed=[ "MK", String(meta.instrument_key), String(meta.version_id), "ART", numberNorm, String(meta.source_sha256) ].join(":");
    const canonical_id="MK:"+sha256(canonicalSeed).slice(0,32);

    records.push({
      canonical_id,
      instrument_key:String(meta.instrument_key),
      instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
      instrument_title:String(meta.instrument_title),
      version_id:String(meta.version_id),
      instrument_version_id:meta.instrument_version_id ?? null,
      instrument_version_label:meta.version_label || meta.version_id,
      article_number:number,
      article_number_normalized:numberNorm,
      article_heading:heading,
      article_text:body,
      paragraphs,
      status,
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

  // Gap detection on base numbers (lettered articles never fill gaps).
  const bases = [...new Set(records.map(r => Number(String(r.article_number_normalized).split("-")[0])))].sort((a, b) => a - b);
  const allowed = new Set((meta.allowed_gaps || []).map(x => normalizeArticleNumber(String(x))));
  const gaps = [];
  if (bases.length) {
    for (let n = bases[0]; n <= bases[bases.length - 1]; n++) if (!bases.includes(n)) gaps.push(String(n));
  }
  for (const g of gaps) {
    if (allowed.has(g)) add("info", "allowed_gap", `Article ${g} is absent; explained by manifest allowed_gaps.`, g);
    else add("stop", "unexplained_gap", `Article ${g} is missing between ${bases[0]} and ${bases[bases.length - 1]} and is not listed in allowed_gaps.`, g);
  }

  const warningCount = findings.filter(f => f.severity === "stop" || f.severity === "warning").length;

  let transitionalStartsAt = null;
  if (transitionalHeadingAfter.length) {
    const idx = records.findIndex(r => r.article_number_normalized === transitionalHeadingAfter[0]);
    transitionalStartsAt = records[idx + 1]?.article_number_normalized ?? null;
  }

  if (strict && errors.length) {
    throw new ParseError(errors.map(e => e.detail).join(" | "), errors);
  }

  return {
    parser_version:PARSER_VERSION,
    instrument_key:String(meta.instrument_key),
    instrument_id:meta.instrument_id===undefined || meta.instrument_id===null ? null : Number(meta.instrument_id),
    instrument_title:String(meta.instrument_title),
    version_id:String(meta.version_id),
    instrument_version_label:meta.version_label || meta.version_id,
    source_url:String(meta.source_url),
    source_sha256:String(meta.source_sha256).toLowerCase(),
    article_count:records.length,
    first_article:records[0]?.article_number_normalized ?? null,
    last_article:records[records.length-1]?.article_number_normalized ?? null,
    gaps,
    lettered_articles:records.filter(r => r.article_number_normalized.includes("-")).map(r => r.article_number_normalized),
    repealed_articles:records.filter(r => r.status === "repealed").map(r => r.article_number_normalized),
    transitional_final_starts_at:transitionalStartsAt,
    warning_count:warningCount,
    info_count:findings.length - warningCount,
    warnings:findings,
    errors,
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
  console.error(`Parsed ${parsed.article_count} articles; warnings=${parsed.warning_count}; info=${parsed.info_count}; gaps=${parsed.gaps.length}`);
  for (const f of parsed.warnings.filter(w => w.severity !== "info").slice(0, 50)) {
    console.error(`[${f.severity}] ${f.code} art=${f.article ?? "-"} line=${f.line ?? "-"}: ${f.detail}`);
  }
}
