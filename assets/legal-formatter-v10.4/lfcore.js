(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LFCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ----------------------------------------------------------------------
   *  0. Cyrillic helpers & normalisation
   * --------------------------------------------------------------------*/
  // Macedonian lowercase letters used as article suffixes (а, б, в ...).
  const MK_SUFFIX = 'абвгдѓежзѕијклљмнњопрстќуфхцчџш';

  // Normalise smart quotes, dashes and stray whitespace without touching
  // the legally meaningful text content.
  function normalizeText(s) {
    if (s == null) return '';
    let str = String(s)
      .replace(/\r\n?/g, '\n')
      .replace(/\u00A0/g, ' ');         // nbsp -> space
    // Straight ASCII double quotes are ambiguous (same glyph for open/close).
    // Gazette text balances them, so alternate open/close → „ … “.
    let open = true;
    str = str.replace(/"/g, function () { const r = open ? '„' : '\u201C'; open = !open; return r; });
    return str
      .replace(/[\u201E\u201F\u00AB]/g, '„')   // opening quotes (incl. «) -> „
      .replace(/[\u201D\u00BB]/g, '\u201C')    // closing quotes (incl. ») -> “ (U+201C)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Strip the УКАЗ / Official-Gazette preamble that precedes "З А К О Н".
  function stripUkaz(text) {
    const t = normalizeText(text);
    const zakon = t.match(/З\s*А\s*К\s*О\s*Н\b/);
    if (zakon && zakon.index < t.length * 0.6) return t.slice(zakon.index);
    return t;
  }

  // Clean text extracted from a Gazette PDF: drop running headers/footers, page
  // numbers and stray code numbers; rejoin wrapped lines into sentences while
  // preserving "Член N" headings, paragraph markers, alineas and quoted blocks.
  function cleanupGazetteText(raw) {
    let t = normalizeText(raw);
    // Build kept lines: drop headers/footers/page-numbers/code-numbers.
    const kept = [];
    t.split('\n').forEach(function (ln) {
      const s = ln.trim();
      if (/^Службен\s+весник/i.test(s) && /бр\.?\s*\d+/i.test(s)) return;            // running header
      if (/^\d+\s+од\s+\d+$/.test(s)) return;
      if (/^[-–—]?\s*\d{1,4}\s*[-–—]?$/.test(s) && s.replace(/[-–—\s]/g, '').length <= 4 && !/^\(\d+\)/.test(s)) return;
      if (/^\d{7,}$/.test(s)) return;
      kept.push(s);
    });
    // Rejoin wrapped lines.
    const merged = [];
    for (let i = 0; i < kept.length; i++) {
      let cur = kept[i];
      if (!cur) { merged.push(''); continue; }
      if (/^Член\s+\d/.test(cur)) { merged.push(cur); continue; }   // keep heading standalone
      while (i + 1 < kept.length) {
        const nxt = (kept[i + 1] || '').trim();
        const curEnds = /[.;:!?“"]$/.test(cur);
        const nxtIsNew = !nxt || /^Член\s+\d/.test(nxt) || /^\(\d+\)/.test(nxt) || /^[-–—]\s/.test(nxt);
        // Merge ONLY genuine wrapped continuations: the next line begins mid-sentence
        // (Cyrillic lowercase) or the current line ends with a comma. Heading/structure
        // lines (ДЕЛ/ГЛАВА/Оддел/секции/наслови) start with a capital and are never merged.
        const isContinuation = /^[а-шѓѕјљњќџ]/.test(nxt) || /,$/.test(cur);
        if (!curEnds && nxt && !nxtIsNew && isContinuation) { cur = cur + ' ' + nxt; i++; } else break;
      }
      merged.push(cur);
    }
    return normalizeText(merged.join('\n'));
  }

  // Sortable key for article numbers like "12", "12-а", "418-б".
  function articleSortKey(num) {
    const m = String(num).match(/^(\d+)(?:[-–—]?\s*([а-шѓѕјљњќџ]+))?$/i);
    if (!m) return [Number.MAX_SAFE_INTEGER, 0];
    const base = parseInt(m[1], 10);
    let suffix = 0;
    if (m[2]) {
      const ch = m[2].toLowerCase()[0];
      suffix = MK_SUFFIX.indexOf(ch) + 1;
    }
    return [base, suffix];
  }

  function cmpArticle(a, b) {
    const ka = articleSortKey(a), kb = articleSortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  }

  // Balanced extractor: returns the content of the OUTERMOST „…“ span, so inner
  // Macedonian quotes are preserved. If keywordRegex is given, scanning starts
  // after the keyword (e.g. "гласи:"). Falls back to the text after the keyword
  // when no quotes are present.
  function extractOuterQuotedAfterKeyword(text, keywordRegex) {
    if (!text) return null;
    const s = String(text);
    let start = 0, km = null;
    if (keywordRegex) { km = s.match(keywordRegex); if (km) start = km.index + km[0].length; }
    const open = s.indexOf('„', start);
    if (open === -1) {
      if (km) { // fallback: text after the keyword to the end, stripped of stray quotes
        let tail = s.slice(km.index + km[0].length).trim();
        tail = tail.replace(/^[„"]+/, '').replace(/[“"]+\s*$/, '').trim();
        return tail || null;
      }
      return null;
    }
    let depth = 0;
    for (let i = open; i < s.length; i++) {
      const ch = s[i];
      if (ch === '„') depth++;
      else if (ch === '“' || ch === '"') { depth--; if (depth === 0) return s.slice(open + 1, i).trim(); }
    }
    return s.slice(open + 1).trim(); // unbalanced -> take to end
  }

  // Keyword that introduces a quoted article/paragraph/alinea payload. Covers
  // singular and plural ("се менува и гласи:" / "се менуваат и гласат:"),
  // relative forms ("кој/која/кои/кое ... гласи/гласат:") and bare "гласи:/гласат:".
  const GLASI_RE = /(?:се\s+менува(?:ат)?\s+и\s+)?(?:(?:кој|која|кои|кое)\s+)?глас(?:и|ат)\s*:/i;
  // Payload extractor for article/paragraph/alinea replacements (NOT for word lists).
  function extractPayload(body) { return extractOuterQuotedAfterKeyword(body, GLASI_RE); }

  // The quoted-content extractor: pulls the OUTERMOST „…“ span (balanced, so it
  // never cuts at the first inner quote). Falls back to colon-text.
  function extractQuoted(s) {
    if (!s) return null;
    const r = extractOuterQuotedAfterKeyword(s, null);
    if (r != null && r !== '') return r;
    const c = s.match(/:\s*["„]?([\s\S]+?)["“]?\s*$/);
    return c ? c[1].trim() : null;
  }

  let _id = 0;
  function uid(prefix) { _id += 1; return (prefix || 'op') + '_' + _id; }
  function resetIds() { _id = 0; }

  /* ----------------------------------------------------------------------
   *  1. BASE-LAW PARSER  ->  structured Law model
   * --------------------------------------------------------------------*/
  // Article heading: "Член 5", "Член 12-а", tolerant of spacing.
  const RE_ARTICLE_HEAD = /(?:^|\n)[ \t]*(?:Член|ЧЛЕН)[ \t]+(\d+(?:[ \t]*[-–—‐‒−][ \t]*[а-шѓѕјљњќџa-zA-ZА-Я](?![а-шѓѕјљњќџ]))?)([^\n]*)(?=\n|$)/g;
  // Paragraph marker "(1)" at start of a line.
  const RE_PARA = /(?:^|\n)\s*\((\d+)\)\s*/g;

  // ---------------------------------------------------------------------
  // CANONICAL article-number normaliser (spec #1). Single source of truth used
  // everywhere (heads, amendments, deleted notes, validator, sort). Normalises
  // every dash, spaces around dashes, and Latin homoglyphs inside the suffix.
  // Truly ambiguous characters (I / І) are NOT collapsed to the base number —
  // they raise `article_number_homoglyph_needs_review`.
  const ALL_DASHES = /[-–—‐‒−]/g;
  const SUFFIX_HOMOGLYPH = {
    'a':'а','b':'б','c':'с','e':'е','j':'ј','k':'к','m':'м','n':'н','o':'о','p':'р','s':'ѕ','t':'т','x':'х','y':'у',
    'A':'а','B':'б','C':'с','E':'е','J':'ј','K':'к','M':'м','N':'н','O':'о','P':'р','S':'ѕ','T':'т','X':'х','Y':'у'
  };
  const RE_MK_SUFFIX = /[а-шѓѕјљњќџ]/;
  function normalizeArticleNumberEx(input) {
    const raw = String(input == null ? '' : input);
    const warnings = [];
    let s = raw.trim().replace(ALL_DASHES, '-').replace(/\s*-\s*/g, '-').replace(/\s+/g, '');
    const m = s.match(/^(\d+)(?:-(.+))?$/);
    if (!m) return { number: s, warnings: warnings, raw: raw };
    if (!m[2]) return { number: m[1], warnings: warnings, raw: raw };
    let suf = '';
    for (const ch of m[2]) {
      if (ch === '-') { suf += '-'; continue; }
      if (RE_MK_SUFFIX.test(ch)) { suf += ch; continue; }          // already Cyrillic suffix letter
      if (SUFFIX_HOMOGLYPH[ch]) { suf += SUFFIX_HOMOGLYPH[ch]; continue; } // Latin homoglyph → Cyrillic
      // ambiguous I/І or any other char: keep, but flag — never silently drop
      warnings.push('article_number_homoglyph_needs_review');
      suf += ch;
    }
    return { number: m[1] + '-' + suf, warnings: warnings, raw: raw };
  }
  function normalizeArticleNumber(input) { return normalizeArticleNumberEx(input).number; }
  function normArticleNumber(n) { return normalizeArticleNumber(n); }   // back-compat delegate

  // ---------------------------------------------------------------------
  // OFFICIAL CONSOLIDATED TEXT ("Редакциски пречистен текст") normalizer.
  // Such documents append, after the main body, the transitional/final
  // provisions of every amending act (each restarting Член 1/2/3…) plus
  // constitutional-court decisions, and carry per-page gazette footers.
  // This splits the genuine main body from that appendix and strips footers,
  // so parseBaseLaw sees only the real consolidated articles.
  // ---------------------------------------------------------------------
  function looksOfficialConsolidated(text) {
    const t = String(text || '');
    const odredbi = (t.match(/(?:^|\n)\s*ОДРЕДБ[АИ]\s*\n\s*од\s+Закон/gi) || []).length
                  + (t.match(/ОДРЕДБ[АИ]\s+од\s+Законот\s+за\s+изменување/gi) || []).length;
    const transHeaders = (t.match(/(?:ПРЕОДНИ\s+И\s+ЗАВРШНИ|ПРЕОДНИ|ЗАВРШНИ)\s+ОДРЕДБ[АИ]\s+ОД\s+ЗАКОН|ЗАВРШНА\s+ОДРЕДБА\s+ОД\s+ЗАКОН/gi) || []).length;
    const decisions = (t.match(/СО\s+ОДЛУКА\s+на\s+Уставниот\s+суд/gi) || []).length;
    const footers = (t.match(/Редакциски\s+пречистени\s+текстови/gi) || []).length;
    const srcNote = (t.match(/Редакциски\s+пречистениот\s+текст\s+на\s+Закон/gi) || []).length;
    return (odredbi >= 2) || (transHeaders >= 1) || (footers >= 2 && (decisions >= 1 || srcNote >= 1)) || (footers >= 3 && decisions >= 1);
  }

  // ── v10.0.3 robust splitter (Publication Gate Edition) ──────────────────
  // Cyrillic-safe: JS \b is ASCII-only and FAILS after Cyrillic letters
  // (e.g. /ЗА\b/.test('ЗА ИЗМЕНУВАЊЕ')===false), so every boundary uses
  // explicit (?:\s|$) lookaheads instead of \b. Produces a canonical model
  // with appendices (transitional/constitutional/source notes) + metadata,
  // keeping backward-compatible baseText/appendixText/report shape.
  function lf_isGazetteFurniture(s) {
    const z = String(s || '').trim();
    if (!z) return false;
    if (/^Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија\s+Редакциски\s+пречистени\s+текстови/i.test(z)) return true;
    if (/^Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија\s*$/i.test(z)) return true;
    if (/^Редакциски\s+пречистени\s+текстови\s*$/i.test(z)) return true;
    if (/^\d+\s+од\s+\d+\s*$/.test(z)) return true; // "N од M"
    return false;
  }
  const LF_FOOTER_INLINE = /\s*Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија\s+Редакциски\s+пречистени\s+текстови\s*/gi;
  const LF_RE_TRANS_HEADER = /^\s*(?:(?:ПРЕОДНИ\s+И\s+ЗАВРШНИ|ПРЕОДНИ|ЗАВРШНИ)\s+ОДРЕДБ[АИ]|ЗАВРШНА\s+ОДРЕДБА|ОДРЕДБ[АИ])\s+ОД\s+ЗАКОН(?:ОТ|И)?(?:\s+ЗА(?:\s|$)|\s*$)/i;
  const LF_RE_TRANS_HEADER_LOOSE = /^\s*ОДРЕДБ[АИ]\s*$/i;
  const LF_RE_CONST_HEADER = /^\s*СО\s+ОДЛУКА\s+на\s+Уставниот\s+суд(?:\s|$)/i;
  const LF_RE_SOURCE_FOOTNOTE = /^\s*\d?\s*Редакциски\s+пречистениот\s+текст\s+на\s+Закон/i;
  const LF_RE_INLINE_FOOTNOTE = /(?:^|[\s.;,])\d?\s*Редакциски\s+пречистениот\s+текст\s+на\s+Закон[\s\S]*$/i;
  const LF_RE_TRANS_BODY = /Овој\s+закон\s+влегува\s+во\s+сила/i;

  function normalizeOfficialConsolidated(text) {
    const report = { removedFooterLines: 0, suffixesNormalized: 0, appendixCutAtLine: null, boundaryLine: null, boundaryReason: null, transitionalBlocks: 0, constitutionalBlocks: 0, sourceNoteCount: 0, detected: false };
    const appendices = { transitionalProvisions: [], constitutionalCourtDecisions: [], sourceNotes: [], gazetteFootersRemoved: 0 };
    const metadata = { sourceNote: null };
    let lines = String(text || '').replace(/\f/g, '\n').split('\n');
    // 1) strip recurring page furniture; lift standalone source footnotes.
    const kept = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (lf_isGazetteFurniture(ln)) { report.removedFooterLines++; appendices.gazetteFootersRemoved++; continue; }
      if (LF_RE_SOURCE_FOOTNOTE.test(ln)) {
        let buf = [ln.replace(/^\s*\d?\s*/, '').trim()]; let j = i + 1;
        for (; j < lines.length; j++) {
          const nx = (lines[j] || '').trim(); if (!nx) break;
          if (/^Член\s+\d/.test(nx) || LF_RE_TRANS_HEADER.test(nx) || LF_RE_CONST_HEADER.test(nx)) break;
          if (lf_isGazetteFurniture(nx)) { report.removedFooterLines++; appendices.gazetteFootersRemoved++; continue; }
          buf.push(nx);
        }
        const note = buf.join(' ').replace(/\s+/g, ' ').trim();
        appendices.sourceNotes.push(note); if (!metadata.sourceNote) metadata.sourceNote = note;
        i = j - 1; continue;
      }
      kept.push(ln);
    }
    // 1.5) extract footnote glued INLINE to a body (page-bottom footnote
    //      linearised next to an early article); cut from marker to end of block.
    for (let i = 0; i < kept.length; i++) {
      const mm = kept[i].match(LF_RE_INLINE_FOOTNOTE);
      if (mm) {
        const note = mm[0].replace(/^[\s.;,]*\d?\s*/, '').trim();
        if (note.length > 30) {
          appendices.sourceNotes.push(note); if (!metadata.sourceNote) metadata.sourceNote = note;
          kept[i] = kept[i].slice(0, mm.index).replace(/[\s.;,]*$/, '.').trim();
        }
      }
    }
    // 2) strip footer phrase glued mid-line.
    for (let i = 0; i < kept.length; i++) {
      if (LF_FOOTER_INLINE.test(kept[i])) { kept[i] = kept[i].replace(LF_FOOTER_INLINE, ' ').replace(/\s{2,}/g, ' ').trim(); }
    }
    // 3) normalize spaced/Latin article suffixes: "Член 193 –б" → "Член 193-б".
    const LAT2CYR = { a: 'а', c: 'с', e: 'е', j: 'ј', k: 'к', o: 'о', p: 'р', s: 'ѕ', t: 'т', x: 'х', y: 'у', b: 'б', n: 'н', m: 'м' };
    for (let i = 0; i < kept.length; i++) {
      const m = kept[i].match(/^(\s*Член\s+\d+)\s*[-–—]\s*([а-шѓѕјљњќџa-z])(?![а-шѓѕјљњќџa-z])(.*)$/i);
      if (m) { let suf = m[2]; if (/[a-z]/i.test(suf)) suf = LAT2CYR[suf.toLowerCase()] || suf; kept[i] = m[1] + '-' + suf + m[3]; report.suffixesNormalized++; }
    }
    // 4) find boundary after the main body: first transitional/constitutional
    //    header, OR an article-number RESTART (Член 1/2/3 after we are deep into
    //    the body, carrying an "Овој закон влегува во сила" amending tail).
    let maxSeen = 0, boundary = -1, reason = null;
    for (let i = 0; i < kept.length; i++) {
      const s = kept[i].trim();
      if (LF_RE_TRANS_HEADER.test(s)) { boundary = i; reason = 'transitional_header'; break; }
      if (LF_RE_CONST_HEADER.test(s)) { boundary = i; reason = 'constitutional_header'; break; }
      if (LF_RE_TRANS_HEADER_LOOSE.test(s)) {
        let j = i + 1; while (j < kept.length && !kept[j].trim()) j++;
        if (j < kept.length && /^од\s+Закон/i.test(kept[j].trim())) { boundary = i; reason = 'transitional_header_loose'; break; }
      }
      const hm = s.match(/^Член\s+(\d+)/);
      if (hm) {
        const n = parseInt(hm[1], 10);
        if (maxSeen >= 100 && n <= 20 && n < maxSeen - 50) {
          let body = ''; let c = 0;
          for (let j = i + 1; j < kept.length && c < 3; j++) { if (kept[j].trim()) { body += ' ' + kept[j]; c++; } }
          if (LF_RE_TRANS_BODY.test(body) || LF_RE_TRANS_BODY.test(s)) { boundary = i; reason = 'article_restart'; break; }
        }
        if (n > maxSeen) maxSeen = n;
      }
    }
    let baseText, appendixText = '';
    if (boundary >= 0) {
      report.appendixCutAtLine = boundary; report.boundaryLine = boundary; report.boundaryReason = reason;
      baseText = kept.slice(0, boundary).join('\n').trim();
      appendixText = kept.slice(boundary).join('\n').trim();
    } else {
      baseText = kept.join('\n').trim();
    }
    // 5) segment the appendix region into transitional / constitutional blocks.
    if (appendixText) {
      const al = appendixText.split('\n'); let cur = null, curType = null;
      const flush = () => {
        if (cur && cur.text.trim()) {
          const blk = { header: cur.header, text: cur.text.trim() };
          if (curType === 'const') appendices.constitutionalCourtDecisions.push(blk);
          else appendices.transitionalProvisions.push(blk);
        }
        cur = null;
      };
      for (const raw of al) {
        const s = raw.trim();
        if (LF_RE_CONST_HEADER.test(s)) { flush(); cur = { header: s, text: '' }; curType = 'const'; continue; }
        if (LF_RE_TRANS_HEADER.test(s) || LF_RE_TRANS_HEADER_LOOSE.test(s)) { flush(); cur = { header: s, text: '' }; curType = 'trans'; continue; }
        if (!cur) { cur = { header: null, text: '' }; curType = 'trans'; }
        cur.text += (cur.text ? '\n' : '') + raw;
      }
      flush();
    }
    report.transitionalBlocks = appendices.transitionalProvisions.length;
    report.constitutionalBlocks = appendices.constitutionalCourtDecisions.length;
    report.sourceNoteCount = appendices.sourceNotes.length;
    report.detected = looksOfficialConsolidated(text);
    // OCR Latin→Cyrillic correction inside mixed words (spec #7), with audit log.
    const lat = normalizeMixedCyrillicLatin(baseText);
    baseText = lat.text;
    report.latinFixes = lat.fixes;          // [{from,to}] audit trail
    report.latinFixedCount = lat.fixes.length;
    // v10.0.4: safe WHOLE-TOKEN homoglyph cleaner (Co→Со, Bo→Во, He→Не, …) +
    // typography normalizer — both audited, both content-preserving.
    const hg = normalizeCyrillicHomoglyphsSafe(baseText, {});
    baseText = hg.text;
    report.homoglyphFixes = hg.fixes;       // [{type,from,to,confidence,reason}]
    report.homoglyphFixCount = hg.fixes.length;
    report.homoglyphFlags = hg.flags;
    const typ = normalizeTypography(baseText);
    baseText = typ.text;
    report.typographyFixes = typ.fixes;
    report.typographyFixCount = typ.fixCount;
    // v10.0.9: safe OCR de-hyphenation — join "за-кон" → "закон" ONLY when the
    // joined token occurs elsewhere as a whole word (corpus-confirmed). Legitimate
    // dashes between distinct words (e.g. "ствар-стока") are left untouched.
    const dh = normalizeOcrHyphenation(baseText);
    baseText = dh.text;
    report.ocrHyphenationFixes = dh.fixes;
    report.ocrHyphenationFixCount = dh.fixes.length;
    // v10.3: safe newline-before-comma/period typography fix (audited).
    const nlp = normalizeNewlineBeforePunct(baseText);
    baseText = nlp.text;
    report.newlineBeforePunctFixes = nlp.fixes;
    report.newlineBeforePunctFixCount = nlp.fixes.length;
    // Spec alias: removedGazetteFooters (== gazetteFootersRemoved) for the
    // Hybrid Publication Engine appendices contract.
    appendices.removedGazetteFooters = appendices.gazetteFootersRemoved;
    return { baseText: baseText, appendixText: appendixText, appendices: appendices, metadata: metadata, report: report };
  }

  // Genuine duplicate article numbers in a parsed law (same full number string,
  // e.g. two different "Член 165-в"). Reported for manual verification, never
  // silently merged.
  function findDuplicateArticles(law) {
    const seen = {}, dups = {};
    (law.articles || []).forEach(a => {
      if (a.status === 'deleted') return;
      seen[a.number] = (seen[a.number] || 0) + 1;
      if (seen[a.number] > 1) dups[a.number] = seen[a.number];
    });
    return Object.keys(dups).map(n => ({ number: n, count: dups[n] }));
  }

  // Extract "deleted article" notes (spec #5). In consolidated texts a repealed
  // article is represented by a note like "Насловот на членот 172 и членот 172
  // се избришани, види: Закон за …(бр.142/12)." Such notes must NOT stay in the
  // previous article's body; they become structured deleted-article records and
  // the note text is preserved separately.
  const RE_DEL_START = /^\s*(?:Насловот\s+на\s+членот\s+(\d+(?:[-–—‐−]\s*[а-шѓѕјљњќџ])?)(?![\dа-шѓѕјљњќџ])|Членот\s+(\d+(?:[-–—‐−]\s*[а-шѓѕјљњќџ])?)(?![\dа-шѓѕјљњќџ])|Членовите\s+((?:\d+(?:[-–—‐−]\s*[а-шѓѕјљњќџ])?[,\s]*(?:и\s+)?)+)|одредбите\s+од\s+членовите\s+од\s+(\d+)\s+до\s+(\d+))[\s\S]*?(избришан|избришани|се\s+бриша|се\s+бришат|престан\w+\s+да\s+важ|укинат|укинати|укинуваат|се\s+укинува)/i;
  function extractDeletedArticleNotes(text) {
    const lines = String(text || '').split('\n');
    const out = [];
    const deleted = [];      // { number, note }
    for (let i = 0; i < lines.length; i++) {
      // Look ahead up to 3 lines to let a wrapped note start match.
      const probe = [lines[i], lines[i + 1] || '', lines[i + 2] || ''].join(' ');
      const m = probe.match(RE_DEL_START);
      const startsHere = /^\s*(Насловот\s+на\s+членот|Членот\s+\d|Членовите\s|одредбите\s+од\s+членовите)/i.test(lines[i]) && m;
      if (startsHere) {
        // consume the note block: until a line ends with ")" or ").", i.e. the
        // citation close, or until the next article/heading/note start.
        let j = i, buf = [];
        for (; j < lines.length; j++) {
          buf.push(lines[j].trim());
          if (/\)\.?\s*$/.test(lines[j]) && j > i) break;          // citation closes
          if (/\)\.?\s*$/.test(lines[j]) && /види:/i.test(buf.join(' '))) break;
          if (j > i && /^\s*Член\s+\d/.test(lines[j + 1] || '')) { /* next is article */ }
          if (j - i > 6) break;                                     // safety
        }
        const noteText = buf.join(' ').replace(/\s+/g, ' ').trim();
        // collect article numbers mentioned as deleted
        const nums = [];
        if (m[1]) nums.push(normArticleNumber(m[1]));
        else if (m[2]) nums.push(normArticleNumber(m[2]));
        else if (m[3]) { (m[3].match(/\d+(?:-[а-шѓѕјљњќџ])?/g) || []).forEach(x => nums.push(normArticleNumber(x))); }
        else if (m[4] && m[5]) { for (let n = parseInt(m[4], 10); n <= parseInt(m[5], 10); n++) nums.push(String(n)); }
        nums.forEach(n => deleted.push({ number: n, note: noteText }));
        if (!nums.length) deleted.push({ number: null, note: noteText });
        i = j;            // skip consumed lines
        continue;
      }
      out.push(lines[i]);
    }
    return { text: out.join('\n'), deleted: deleted };
  }

  function parseAlineas(text) {
    // Alineas begin with -, – or — at line start.
    const lines = text.split('\n');
    const head = [];
    const alineas = [];
    let inAlinea = false;
    for (const ln of lines) {
      if (/^\s*[-–—]\s+/.test(ln)) {
        inAlinea = true;
        alineas.push({ marker: '-', text: ln.replace(/^\s*[-–—]\s+/, '').trim() });
      } else if (inAlinea && ln.trim()) {
        // continuation of previous alinea
        alineas[alineas.length - 1].text += ' ' + ln.trim();
      } else {
        head.push(ln);
      }
    }
    return { lead: head.join('\n').trim(), alineas };
  }

  // Enumerated sub-points within a paragraph: "1) …", "2) …" or "а) …", "б) …"
  // at line start. Split them into a structured `points` array so each point is
  // machine-addressable, while keeping the lead-in text. Continuation lines
  // (no new marker) attach to the current point. Years like "2014)" are excluded
  // by limiting the numeric marker to 1–2 digits.
  const RE_POINT = /^\s*(\d{1,2}|[а-шѓѕјљњќџ])\)\s+/;
  function extractPoints(text) {
    const lines = (text || '').split('\n');
    const head = [];
    const points = [];
    let inPoint = false;
    for (const ln of lines) {
      const m = ln.match(RE_POINT);
      if (m) { inPoint = true; points.push({ marker: m[1], text: ln.replace(RE_POINT, '').trim() }); }
      else if (inPoint && ln.trim()) { points[points.length - 1].text += ' ' + ln.trim(); }
      else head.push(ln);
    }
    return { text: head.join('\n').trim(), points: points };
  }

  // Attach points to a paragraph object (after alineas have been extracted).
  function withPoints(p) {
    const ep = extractPoints(p.text);
    p.text = ep.text;
    p.points = ep.points;   // [] when none
    return p;
  }

  // Split a body that has NO "(N)" markers into separate ставови. In MK
  // nomotechnics paragraphs are frequently unnumbered and divided only by line
  // breaks; collapsing them into one paragraph loses the article's structure.
  // Wrapped lines (mid-sentence breaks) are rejoined first; "- " lines attach as
  // alineas to the current paragraph.
  function splitUnnumberedParagraphs(body) {
    const rawLines = body.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const isPointLine = function (s) { return RE_POINT.test(s); };
    // 1) rejoin wrapped continuation lines
    const merged = [];
    rawLines.forEach(function (ln) {
      const isAlinea = /^[-–—]\s/.test(ln);
      const isPoint = isPointLine(ln);
      if (merged.length && !isAlinea && !isPoint) {
        const prev = merged[merged.length - 1];
        const prevIsAlinea = /^[-–—]\s/.test(prev);
        const prevEnds = /[.;:!?“"»]$/.test(prev);
        const isContinuation = /^[а-шѓѕјљњќџ]/.test(ln) || /,$/.test(prev);
        if (!prevIsAlinea && !prevEnds && isContinuation) { merged[merged.length - 1] = prev + ' ' + ln; return; }
      }
      merged.push(ln);
    });
    // 2) each non-alinea/non-point logical line is a paragraph; "- " lines attach
    //    as alineas and "N)"/"letter)" lines attach as structured points.
    const paras = [];
    let cur = null;
    merged.forEach(function (ln) {
      if (/^[-–—]\s/.test(ln)) {
        if (!cur) cur = { number: null, text: '', alineas: [], points: [] };
        cur.alineas.push({ marker: '-', text: ln.replace(/^[-–—]\s*/, '') });
      } else if (isPointLine(ln)) {
        if (!cur) cur = { number: null, text: '', alineas: [], points: [] };
        const mm = ln.match(RE_POINT);
        cur.points.push({ marker: mm[1], text: ln.replace(RE_POINT, '').trim() });
      } else {
        if (cur) paras.push(cur);
        cur = { number: null, text: ln, alineas: [], points: [] };
      }
    });
    if (cur) paras.push(cur);
    return paras;
  }

  // Words that, when they immediately precede a "(N)" at a line start, mark it
  // as a CROSS-REFERENCE ("од ставот (1)", "ставови (1) и (2)", "член 230 став
  // (1)"), NOT a new paragraph.
  const PARA_REF_WORDS = /(^|[^а-шѓѕјљњќџ])(став|ставот|ставови|ставовите|ставовиte|член|членот|членовите|точка|точката|точки|алинеја|алинејата|алинеи|алинеите)$/i;

  function parseParagraphs(body) {
    const paras = [];
    const cand = [];
    let m;
    RE_PARA.lastIndex = 0;
    while ((m = RE_PARA.exec(body)) !== null) {
      cand.push({ num: parseInt(m[1], 10), raw: m[1], start: m.index, contentStart: m.index + m[0].length });
    }
    // Validity gate (spec #1): a candidate "(N)" is a real new став only when
    //   (a) N is the expected next number (ставови run 1,2,3…),
    //   (b) the previous став text logically closed (ends with . ; : ! ? » " )),
    //   (c) the text after the marker is not a lowercase continuation.
    // Cross-references ("од ставот (1) на овој член", "член 230 став (1)",
    // reference lists) fail (a) and/or (b)+(c), so they stay inline as text.
    const idx = [];
    let expected = 1;
    for (let i = 0; i < cand.length; i++) {
      const c = cand[i];
      const after = body.slice(c.contentStart);
      const prevText = idx.length ? body.slice(idx[idx.length - 1].contentStart, c.start).trim() : body.slice(0, c.start).trim();
      const prevEndsOk = idx.length === 0 || /[.;:!?“"»)]$/.test(prevText);   // (b)
      const startsLower = /^[а-шѓѕјљњќџ]/.test(after.trim());                 // (c)
      const ok = (c.num === expected) && (prevEndsOk || !startsLower);        // (a)+(b/c)
      if (ok) { idx.push(c); expected = c.num + 1; }
      // rejected → left inline (no split here)
    }

    if (idx.length === 0) {
      const t = body.trim();
      if (!t) return paras;
      return splitUnnumberedParagraphs(t);   // unnumbered ставови → separate paragraphs
    }
    // Text before the first accepted "(N)" becomes an unnumbered lead paragraph.
    const pre = body.slice(0, idx[0].start).trim();
    if (pre) {
      const { lead, alineas } = parseAlineas(pre);
      paras.push(withPoints({ number: null, text: lead, alineas }));
    }
    for (let i = 0; i < idx.length; i++) {
      const end = i + 1 < idx.length ? idx[i + 1].start : body.length;
      const chunk = body.slice(idx[i].contentStart, end).trim();
      const { lead, alineas } = parseAlineas(chunk);
      paras.push(withPoints({ number: idx[i].raw, text: lead, alineas }));
    }
    return paras;
  }

  // Heuristic: the line directly under "Член N" is the article TITLE when it
  // Evaluate a candidate title that appears INLINE on the "Член N <…>" header
  // line (e.g. "Член 1 Предмет"). Returns {title,titleConfidence,possibleTitle}
  // when it is a real title, or {title:null, body:<text>} when the text is in
  // fact the start of a provision (so it is preserved as body, never dropped).
  function evalInlineTitle(raw) {
    const s = (raw || '').replace(/^[ \t]*[.\-–—]+[ \t]*/, '').replace(/[ \t]+$/, '').trim();
    if (!s) return { title: null, titleConfidence: 0, possibleTitle: false, body: '' };
    const NEG = /^(Со\s+овој\s+закон|Овој\s+закон|Во\s+постапката|Органот|Правата|Правото|Обврската|Обврските|Се\s+уредува|Се\s+уредуваат|Се\s+гарантира|Се\s+применуваат|Доколку|Ако\s|Кога\s|Секој\s|Сите\s|Лицето|Тој\s+што|Тој\s+кој|Судот\s+може|Судот\s+ќе|Граѓанин|Странец|Кој\s|Со\s+казната|Со\s+затвор|Со\s+парична|На\s+ствар|Право\s+на\s+сопственост\s+можат)/;
    const startsParaMarker = /^\(\d+\)/.test(s) || /^[-–—]\s/.test(s);
    const endsSentence = /[.;:!?]$/.test(s);
    if (startsParaMarker || NEG.test(s) || endsSentence) return { title: null, titleConfidence: 0, possibleTitle: false, body: s };
    let conf = 0.5;
    if (s.length <= 60) conf += 0.25; else if (s.length > 80) conf -= 0.35;
    if (/^[A-ZА-ШЃЅЈЉЊЌЏ«„]/.test(s)) conf += 0.1;
    if (!/\b(се|е|мора|може|треба|има|нема)\b/i.test(s)) conf += 0.1; // titles rarely carry a finite verb
    conf = Math.max(0, Math.min(1, conf));
    if (conf >= 0.5) return { title: s, titleConfidence: Math.round(conf * 100) / 100, possibleTitle: conf < 0.8, body: '' };
    return { title: null, titleConfidence: Math.round(conf * 100) / 100, possibleTitle: false, body: s };
  }

  // is short, not a paragraph marker, and not obviously body text.
  // Decide whether the line directly under "Член N" is an article TITLE or the
  // first paragraph. Returns {title, titleConfidence, possibleTitle, body}.
  // Strict guards stop a PDF/OCR-clipped sentence from being mistaken for a title.
  function splitTitleAndBody(block) {
    const lines = block.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].trim()) i++;
    const first = (lines[i] || '').trim();
    const next = (lines[i + 1] || '').trim();
    if (!first) return { title: null, titleConfidence: 0, possibleTitle: false, body: block.trim() };

    // Hard negatives — these begin a provision, never a title.
    const NEG = /^(Со\s+овој\s+закон|Овој\s+закон|Во\s+постапката|Органот|Правата|Обврските|Се\s+уредува|Се\s+уредуваат|Се\s+гарантира|Се\s+применуваат|Доколку|Ако\s|Кога\s|Секој\s|Сите\s|Лицето|Тој\s+што|Тој\s+кој|Судот\s+може|Судот\s+ќе|Граѓанин|Странец|Кој\s|Со\s+казната|Со\s+затвор|Со\s+парична|На\s+ствар|Право\s+на\s+сопственост\s+можат)/;
    const startsParaMarker = /^\(\d+\)/.test(first) || /^[-–—]\s/.test(first);
    const endsSentence = /[.;:!?]$/.test(first);
    const nextIsLowerCont = /^[а-шѓѕјљњќџ]/.test(next);   // next line continues the sentence
    const nextIsNumbered = /^\(\d+\)/.test(next);

    if (startsParaMarker || NEG.test(first) || endsSentence || nextIsLowerCont) {
      return { title: null, titleConfidence: 0, possibleTitle: false, body: lines.slice(i).join('\n').trim() };
    }

    // Score a title candidate.
    let conf = 0.5;
    if (first.length <= 60) conf += 0.25; else if (first.length > 80) conf -= 0.35;
    if (nextIsNumbered) conf += 0.3;                                  // "Предмет на законот" then "(1) …"
    if (/^[A-ZА-ШЃЅЈЉЊЌЏ«„]/.test(first)) conf += 0.1;
    if (!/\b(се|е|мора|може|треба|има|нема|се\s)\b/i.test(first)) conf += 0.05; // titles rarely carry a finite verb
    conf = Math.max(0, Math.min(1, conf));

    if (conf >= 0.5) {
      return { title: first, titleConfidence: Math.round(conf * 100) / 100, possibleTitle: conf < 0.8, body: lines.slice(i + 1).join('\n').trim() };
    }
    return { title: null, titleConfidence: Math.round(conf * 100) / 100, possibleTitle: false, body: lines.slice(i).join('\n').trim() };
  }

  // A heading that sits on its own line just before "Член N" (short, capitalised,
  // no sentence-ending punctuation, not a legal sentence). Returns it separately
  // so the first real sentence is NOT mistaken for an inline title.
  // Is the line written entirely in Cyrillic CAPITALS (section names like
  // "ОСНОВНИ ОДРЕДБИ", "ПРАВО НА СОПСТВЕНОСТ", "ПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ")?
  function isAllCapsCyrillic(s) {
    return /[А-ШЃЅЈЉЊЌЏ]/.test(s) && !/[а-шѓѕјљњќџ]/.test(s);
  }

  // Classify a structural divider line. Returns {type,label} or null (= not structural).
  // Types follow MK nomotechnics: дел > глава > оддел > отсек > секција (named caps block).
  function classifyStructuralLine(line) {
    const s = (line || '').trim();
    if (!s) return null;
    if (/^ДЕЛ\s+\S+/.test(s)) return { type: 'дел', label: s };
    if (/^ГЛАВА\s+\S+/i.test(s)) return { type: 'глава', label: s };
    if (/^Оддел\s+\S+/i.test(s)) return { type: 'оддел', label: s };
    if (/^Отсек\s+\S+/i.test(s)) return { type: 'отсек', label: s };
    // Numbered section heading: "1. Општи одредби", "2. Подготвување…" — a short
    // capitalised label, NOT ending in sentence punctuation (spec #1).
    if (/^\d{1,2}\.\s+[А-ШЃЅЈЉЊЌЏ]/.test(s) && s.length <= 150 && !/[.;:!?]$/.test(s)) return { type: 'поднаслов', label: s };
    if (/^(ПРЕОДНИ|ЗАВРШНИ|ПРЕОДНИ\s+И\s+ЗАВРШНИ)\b/i.test(s) && s.length <= 90) return { type: 'секција', label: s };
    if (s.length <= 90 && isAllCapsCyrillic(s)) return { type: 'секција', label: s };
    return null;
  }

  // Is a line a plausible descriptive heading (the title that sits right above
  // "Член N", e.g. "Право на првенствено купување")?  Mixed-case, short, no
  // terminal punctuation, not a paragraph/alinea/gazette/law-title line.
  function looksDescriptiveHeading(s) {
    return s.length <= 110 &&
      !/[.;:!?]$/.test(s) &&
      !/^\(\d+\)/.test(s) && !/^[-–—]\s/.test(s) &&
      !/Службен\s+весник|бр\.?\s*\d+\/\d{2,4}|^З\s*А\s*К\s*О\s*Н/i.test(s) &&
      /^[A-ZА-ШЃЅЈЉЊЌЏ«„(]/.test(s);
  }

  // Pop the trailing run of heading/structure lines off a block. Returns the
  // article body (kept) plus the gap (ordered list of {text,type}) that belongs
  // to the NEXT article. Structural markers no longer leak into the previous body.
  // Canonical Markdown export (spec #4) — SAME order as every other renderer:
  // structural_path → preArticleHeading → Член N → title → paragraphs → points
  // → alineas → deleted notes → QA flags.
  function exportMarkdown(law, meta) {
    const recs = buildArticleRecords(law);
    const out = [];
    if (meta && meta.title) out.push('# ' + meta.title, '');
    if (law.title) out.push('## ' + law.title, '');
    let lastPath = '';
    recs.forEach(function (r) {
      const pathStr = (r.structural_path || []).join(' › ');
      if (pathStr && pathStr !== lastPath) { out.push('', '### ' + pathStr, ''); lastPath = pathStr; }
      if (r.article_heading) out.push('**' + r.article_heading + '**', '');
      out.push('#### Член ' + r.article_number + (r.status === 'deleted' ? ' (избришан/укинат)' : ''));
      if (r.status === 'deleted') {
        (r.deleted_reference_notes || []).forEach(function (n) { out.push('> ' + n); });
      } else {
        (r.paragraphs || []).forEach(function (p) {
          out.push((p.number ? '(' + p.number + ') ' : '') + p.text_normalized);
          (p.points || []).forEach(function (pt) { out.push('   ' + pt.marker + ') ' + pt.text); });
          (p.alineas || []).forEach(function (al) { out.push('   ' + (al.marker ? al.marker + ' ' : '- ') + al.text); });
        });
      }
      if (r.qa_flags && r.qa_flags.length) out.push('', '<!-- QA: ' + r.qa_flags.join(', ') + ' -->');
      out.push('');
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  // Vendor/offline readiness (spec #3) + hosted CSP validator codes (spec #5).
  // Pure logic: a host page passes in what it actually detected at runtime.
  function vendorStatus(detected) {
    const d = detected || {};
    const st = {
      mammoth: !!d.mammoth, jszip: !!d.jszip, pdfjs: !!d.pdfjs,
      pdfWorkerLocal: !!d.pdfWorkerLocal,
      offlineReady: !!(d.mammoth && d.jszip && d.pdfjs && d.pdfWorkerLocal),
      cdnFallbackUsed: (d.cdnFallbackUsed != null ? !!d.cdnFallbackUsed : (typeof window !== 'undefined' ? !!window.__cdnFallbackUsed : false))
    };
    return st;
  }
  function cspValidate(env) {
    const e = env || {}; const issues = [];
    if (e.hosted && e.unsafeInline) issues.push({ code: 'hosted_unsafe_inline_csp', severity: 'error', msg: 'Hosted build има unsafe-inline во CSP.' });
    if (e.cdnScripts && e.cdnScripts.some(function (s) { return !s.integrity; })) issues.push({ code: 'cdn_without_sri', severity: 'error', msg: 'CDN script без integrity (SRI).' });
    if (!e.vendorBundlePresent) issues.push({ code: 'missing_vendor_bundle', severity: 'warning', msg: 'Нема локален vendor bundle (потпира на CDN).' });
    if (!e.pdfWorkerLocal) issues.push({ code: 'pdf_worker_not_local', severity: 'warning', msg: 'pdf.js worker не е локален.' });
    if (!e.offlineReady) issues.push({ code: 'offline_not_ready', severity: 'warning', msg: 'Алатката не е целосно offline-спремна.' });
    // Spec #10: expose the three required flags explicitly. When the local vendor
    // bundle is present and the worker is local, all three are false.
    issues.flags = {
      missing_vendor_bundle: !e.vendorBundlePresent,
      pdf_worker_not_local: !e.pdfWorkerLocal,
      offline_not_ready: !e.offlineReady,
      hosted_unsafe_inline_csp: !!(e.hosted && e.unsafeInline),
      cdn_without_sri: !!(e.cdnScripts && e.cdnScripts.some(function (s) { return !s.integrity; }))
    };
    return issues;
  }
  // Convenience: just the boolean flags object (spec #10).
  function cspFlags(env) { return cspValidate(env).flags; }

  // Renderer-order guard (spec #4): all exports must list articles identically.
  function rendererOrderConsistent(law) {
    const order = buildArticleRecords(law).map(function (r) { return r.article_number; });
    const md = exportMarkdown(law).match(/^#### Член (\S+)/gm) || [];
    const mdOrder = md.map(function (h) { return h.replace(/^#### Член /, ''); });
    let ok = order.length === mdOrder.length;
    for (let i = 0; ok && i < order.length; i++) if (order[i] !== mdOrder[i]) ok = false;
    return { consistent: ok, canonical: order, markdown: mdOrder };
  }

  // Inline tail structural heading (spec #3): a numbered section heading that
  // ends an article body even without its own line. Returns {body, heading} when
  // found. Guarded so it never eats a normal "(5)" став or a "член 36. При…"
  // reference, and only fires when the body does not end like a legal sentence.
  const RE_INLINE_TAIL = /(\d{1,2}\.\s+[А-ШЃЅЈЉЊЌЏ][^.!?;:]{10,140})$/;
  function extractInlineTailStructure(body) {
    const t = String(body || '').replace(/\s+$/, '');
    const m = t.match(RE_INLINE_TAIL);
    if (!m) return { body: body, heading: null };
    const heading = m[1].trim();
    // reject if it's actually "член 36. При…" (preceded by член/став) or a list item
    const before = t.slice(0, t.length - m[1].length);
    if (/\b(член|членот|став|ставот|точка|алинеја)\s*$/i.test(before)) return { body: body, heading: null };
    return { body: before.replace(/\s+$/, ''), heading: heading };
  }

  function popGap(block) {
    let lines = block.split('\n');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    // Join soft-wrapped continuation lines so a wrapped descriptive heading
    // ("Донесување … / казнена евиденција") is evaluated as ONE line. A line that
    // starts lowercase and follows a line not ending in sentence punctuation is a
    // continuation. (Body lines merge harmlessly — popGap only pops the tail.)
    const merged = [];
    for (const raw of lines) {
      const t = raw.trim();
      if (!t) { merged.push(''); continue; }
      const prev = merged.length ? merged[merged.length - 1] : '';
      if (prev && /^[а-шѓѕјљњќџ]/.test(t) && !/[.;:!?»")]$/.test(prev) && !/^[-–—]\s/.test(prev) && !/^\(\d+\)/.test(t) && !/^\d{1,2}[\.\)]\s/.test(t)) {
        merged[merged.length - 1] = prev + ' ' + t; continue;
      }
      merged.push(t);
    }
    lines = merged;
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const gapRev = [];
    while (lines.length) {
      const cand = lines[lines.length - 1].trim();
      if (!cand) { lines.pop(); continue; }                 // skip blanks between headings
      const st = classifyStructuralLine(cand);
      if (st) { gapRev.push({ text: cand, type: st.type }); lines.pop(); continue; }
      if (looksDescriptiveHeading(cand)) { gapRev.push({ text: cand, type: 'наслов' }); lines.pop(); continue; }
      break;                                                 // hit real body
    }
    // Merge adjacent ALL-CAPS section lines into one structural title (spec #4):
    // "КОНФИСКАЦИЈА НА ИМОТ И ИМОТНА КОРИСТ" + "И ОДЗЕМАЊЕ НА ПРЕДМЕТИ" → one.
    const gap = gapRev.reverse();
    const mergedGap = [];
    for (const item of gap) {
      const prev = mergedGap[mergedGap.length - 1];
      if (prev && prev.type === 'секција' && item.type === 'секција' &&
          isAllCapsCyrillic(prev.text) && isAllCapsCyrillic(item.text) &&
          (prev.text.length + item.text.length) <= 140) {
        prev.text = prev.text + ' ' + item.text;     // wrapped section title
        continue;
      }
      mergedGap.push(item);
    }
    // Defensive: an inline numbered heading still glued to the body tail.
    if (lines.length) {
      const lastIdx = lines.length - 1;
      const it = extractInlineTailStructure(lines[lastIdx]);
      if (it.heading) { lines[lastIdx] = it.body; mergedGap.unshift({ text: it.heading, type: 'поднаслов' }); }
    }
    return { body: lines.join('\n').trim(), gap: mergedGap };
  }

  // Split a gap into the structural context (Дел/Глава/Оддел/Отсек/секција and any
  // chapter titles) and the single descriptive heading that titles the article.
  function splitGap(gap) {
    const structure = gap.slice();
    let preArticleHeading = null;
    if (structure.length && structure[structure.length - 1].type === 'наслов') {
      preArticleHeading = structure.pop().text;             // article's own heading
    }
    return { preArticleHeading: preArticleHeading, precedingStructure: structure };
  }

  function extractTrailingHeading(block) {
    const lines = block.split('\n');
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    if (lines.length < 2) return { body: block, heading: null };
    const last = lines[lines.length - 1].trim();
    const looksHeading = last && last.length <= 90 &&
      !/[.;:]$/.test(last) &&
      !/^\(\d+\)/.test(last) && !/^[-–—]\s/.test(last) &&
      !/Службен\s+весник|бр\.?\s*\d+\/\d{2,4}|^З\s*А\s*К\s*О\s*Н/i.test(last) &&
      !/\b(се|на|во|од|за|кој|која|чие)\b.+\b(закон|член|став|лице|право|пропис|договор|услов)\b/i.test(last) &&
      /^[A-ZА-ШЃЅЈЉЊЌЏ«„]/.test(last);
    if (looksHeading) { lines.pop(); return { body: lines.join('\n').trim(), heading: last }; }
    return { body: block, heading: null };
  }

  function parseBaseLaw(rawText) {
    const stripped = stripUkaz(rawText);
    const del = extractDeletedArticleNotes(stripped);
    const text = del.text;
    const law = { title: null, meta: { gazette: null, eif: null }, articles: [], deletedArticles: del.deleted };

    // Title (v10.0.8): strict extraction — never gazette/source-note noise.
    const titleRes = extractLawTitleStrict(text);
    // v10.0.9: completeness — recover truncated titles ("…И ДРУГИ") from text.
    const titleComplete = lawTitleCompletenessCheck(titleRes.title, text);
    law.title = titleComplete.title;
    law.titleNeedsReview = !!titleRes.needsReview || !!titleComplete.needsReview;
    law.titleSource = titleComplete.recovered ? 'recovered' : titleRes.source;

    // Gazette reference.
    const gaz = text.match(/Службен\s+весник[^\n)]*\d+\/\d+/i);
    if (gaz) law.meta.gazette = gaz[0].trim();

    const heads = [];
    let m;
    RE_ARTICLE_HEAD.lastIndex = 0;
    while ((m = RE_ARTICLE_HEAD.exec(text)) !== null) {
      heads.push({ number: normArticleNumber(m[1]), inlineRest: m[2] || '', start: m.index, bodyStart: m.index + m[0].length });
    }
    // The gap (structural context + descriptive heading) for the FIRST article
    // comes from the preamble tail; for every later article it comes from the
    // tail of the previous article's block. Structural markers never leak into
    // the previous article's body.
    let pendingGap = heads.length ? popGap(text.slice(0, heads[0].start)).gap : [];
    // First article only: the preamble carries the law title / gazette ref / УКАЗ
    // remnants — these are NOT structural dividers, so drop them.
    pendingGap = pendingGap.filter(function (g) {
      const t = g.text;
      if (law.title && t === law.title) return false;
      if (/^(У\s*К\s*А\s*З|З\s*А\s*К\s*О\s*Н)(?:\s|$)/i.test(t)) return false;
      if (/Службен\s+весник|^Сл\.?\s*в\.?|^Сл\.?\s*весник/i.test(t)) return false;
      if (/^бр\.?\s*\d+\/\d{2,4}/i.test(t) || /^\d+\/\d{2,4}$/.test(t)) return false;
      return true;
    });
    for (let i = 0; i < heads.length; i++) {
      const end = i + 1 < heads.length ? heads[i + 1].start : text.length;
      let block = text.slice(heads[i].bodyStart, end);
      let nextGap = [];
      if (i + 1 < heads.length) {
        const pg = popGap(block);
        block = pg.body; nextGap = pg.gap;
      } else {
        block = block.trim();
      }
      const sg = splitGap(pendingGap);
      // Inline header title (e.g. "Член 1 Предмет" / "Член 12-а – Наслов").
      // If the inline text is actually the start of a provision, keep it as body.
      const inl = evalInlineTitle(heads[i].inlineRest);
      let title, titleConfidence, possibleTitle, bodyText;
      if (inl.title) {
        title = inl.title; titleConfidence = inl.titleConfidence; possibleTitle = inl.possibleTitle;
        bodyText = block;
      } else {
        const prefixed = (inl.body ? inl.body + '\n' : '') + block;   // preserve clipped first sentence
        const st = splitTitleAndBody(prefixed);
        title = st.title; titleConfidence = st.title ? st.titleConfidence : null; possibleTitle = !!st.possibleTitle;
        bodyText = st.body;
      }
      law.articles.push({
        number: heads[i].number,
        precedingStructure: sg.precedingStructure,   // [{text,type}] — Дел/Глава/Оддел/Отсек/секција/поднаслов
        preArticleHeading: sg.preArticleHeading,
        title: title,
        titleConfidence: titleConfidence,
        possibleTitle: possibleTitle,
        paragraphs: parseParagraphs(bodyText),
        status: 'original',
        raw: block
      });
      pendingGap = nextGap;
    }
    // Insert deleted-article records (spec #5) at their sequential position so
    // the model reflects repealed articles without leaking notes into bodies.
    (law.deletedArticles || []).forEach(function (d) {
      if (d.number == null) return;
      if (law.articles.some(function (a) { return a.number === d.number; })) return;
      const rec = {
        precedingStructure: [], preArticleHeading: null,
        number: d.number, title: null, titleConfidence: 0, possibleTitle: false,
        paragraphs: [], status: 'deleted', sourceNote: d.note, raw: d.note
      };
      // place by article order
      let pos = law.articles.findIndex(function (a) { return cmpArticle(a.number, d.number) > 0; });
      if (pos < 0) pos = law.articles.length;
      law.articles.splice(pos, 0, rec);
    });
    return law;
  }

  /* ----------------------------------------------------------------------
   *  2. AMENDMENT PARSER  ->  Operation[]
   *     Distinguishes the *administrative* article of the amending act from
   *     the *target* article inside the base law.
   * --------------------------------------------------------------------*/

  // Quote depth at a given index: „ opens (+1), “ closes (-1, clamped at 0).
  function quoteDepthAt(s, idx) {
    let d = 0;
    for (let i = 0; i < idx; i++) {
      const c = s[i];
      if (c === '„') d++;
      else if (c === '\u201C') { if (d > 0) d--; }
    }
    return d;
  }

  // Split amending act into administrative articles (Член 1, Член 2 ...).
  // Quote-aware: a "Член N" that sits INSIDE a quoted payload (e.g. „Член 243 …“)
  // is NOT treated as a new administrative article.
  function splitAdminArticles(text) {
    const t = stripUkaz(text);
    const headerRe = /(?:^|\n)[ \t]*Член\s+(\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?)\b[ \t]*(?=\n|$)/g;
    const heads = [];
    let m;
    while ((m = headerRe.exec(t)) !== null) {
      if (quoteDepthAt(t, m.index) === 0) {
        heads.push({ num: m[1], start: m.index, contentStart: headerRe.lastIndex });
      }
    }
    const out = [];
    for (let i = 0; i < heads.length; i++) {
      const end = (i + 1 < heads.length) ? heads[i + 1].start : t.length;
      out.push({ adminNumber: normArticleNumber(heads[i].num), body: t.slice(heads[i].contentStart, end).trim() });
    }
    // Fallback: some acts inline "Член 1." — try a looser split.
    if (out.length === 0) {
      const re2 = /Член\s+(\d+)\b([\s\S]*?)(?=Член\s+\d+\b|$)/g;
      let m2;
      while ((m2 = re2.exec(t)) !== null) out.push({ adminNumber: m2[1], body: m2[2].trim() });
    }
    return out;
  }

  const TARGET_ART = '(\\d+(?:\\s*[-–—‐‒−]\\s*[а-шѓѕјљњќџa-zA-ZА-Я])?)';

  // Confidence model: explicit target + quoted payload = high.
  function score(parts) {
    let c = 0.4;
    if (parts.target) c += 0.3;
    if (parts.payload || parts.noPayloadOk) c += 0.2;
    if (parts.unambiguous) c += 0.1;
    return Math.min(1, Math.round(c * 100) / 100);
  }

  function makeOp(o) {
    return Object.assign({
      id: uid('op'),
      sourceAmendmentArticle: null,
      targetArticle: null,
      targetParagraph: null,
      targetAlinea: null,
      operation: null,
      oldText: null,
      newText: null,
      rawInstruction: '',
      confidence: 0,
      status: 'parsed',          // parsed -> applied | needs_review | failed
      applied: false,            // spec #7: explicit application flag
      rawTargetArticle: null,    // spec #7: as written in the instruction
      normalizedTargetArticle: null,
      normalizationWarnings: [],
      normalizationRisk: 'none', // none | high
      warnings: [],
      evidence: '',
      reason: ''                 // human-readable justification for the final status
    }, o);
  }

  // Detect the target article referenced in the instruction body.
  function findTargetArticle(body) {
    const m =
      body.match(new RegExp('[Чч]ленот\\s+' + TARGET_ART)) ||
      body.match(new RegExp('во\\s+член(?:от)?\\s+' + TARGET_ART, 'i')) ||
      body.match(new RegExp('по\\s+член(?:от)?\\s+' + TARGET_ART, 'i'));
    return m ? normArticleNumber(m[1]) : null;
  }
  // Same match, but returning the number EXACTLY as written (spec #7) so the
  // operation can carry rawTargetArticle alongside its normalized form.
  function findTargetArticleRaw(body) {
    const m =
      body.match(new RegExp('[Чч]ленот\\s+' + TARGET_ART)) ||
      body.match(new RegExp('во\\s+член(?:от)?\\s+' + TARGET_ART, 'i')) ||
      body.match(new RegExp('по\\s+член(?:от)?\\s+' + TARGET_ART, 'i'));
    return m ? m[1].replace(/\s*[-–—‐‒−]\s*/, '-').trim() : null;
  }
  function findParagraph(body) {
    const m = body.match(/став(?:от|овите|ови|а)?\s*\(?\s*(\d+)\s*\)?/i);
    return m ? m[1] : null;
  }
  // Macedonian ordinals -> position (1-based).
  const MK_ORDINALS = {
    'прв': 1, 'втор': 2, 'трет': 3, 'четврт': 4, 'петт': 5, 'пет': 5,
    'шест': 6, 'седм': 7, 'осм': 8, 'деветт': 9, 'девет': 9, 'десетт': 10, 'десет': 10
  };
  // Resolve which alinea an instruction targets.
  //   "алинејата 1" / "алинеја 2" / "алинеја број 3" -> "1"/"2"/"3"
  //   "првата алинеја" / "втората алинеја"           -> "1"/"2"
  //   "алинеите" (plural)                            -> "plural" (ambiguous)
  //   bare "алинеја"                                 -> "unspec" (ambiguous)
  // Ambiguous results must NEVER silently delete the last alinea — callers send
  // them to needs_review instead.
  function findAlinea(body) {
    const b = String(body || '');
    const ord = b.match(/(деветт|десетт|четврт|седм|втор|трет|петт|шест|осм|прв|пет|девет|десет)[а-ш]*\s+алине(?:ја|јата)/i);
    if (ord) { const n = MK_ORDINALS[ord[1].toLowerCase()]; return n ? String(n) : 'unspec'; }
    const num = b.match(/алине(?:ја|јата)\s*(?:број\s*)?(\d+)/i);
    if (num) return num[1];
    if (/алине(?:ите|и)(?![а-шѓѕјљњќџ])/i.test(b)) return 'plural';
    if (/алине(?:ја|јата)/i.test(b)) return 'unspec';
    return null;
  }
  function alineaIsAmbiguous(a) { return !a || a === 'unspec' || a === 'plural'; }

  // Normalise a paragraph replacement payload so it never produces "(1) (1)…".
  // If the payload already opens with a "(n)" marker we strip it; the engine
  // re-applies the canonical paragraph number exactly once.
  function normalizeParagraphPayload(text /*, expectedParagraphNumber */) {
    let t = String(text == null ? '' : text).trim();
    const m = t.match(/^\(\d+\)\s*/);
    if (m) t = t.slice(m[0].length).trim();
    return t;
  }

  // Parse a whole-article replacement payload.
  // Recognises an embedded "Член N" header, a title line and paragraphs so the
  // engine can replace title + paragraphs + raw (never leaving a stale title).
  function parseArticlePayload(newText) {
    const t = String(newText == null ? '' : newText).trim();
    let number = null, rest = t, hadHeader = false;
    const m = t.match(/^Член\s+(\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?)\s*\n([\s\S]*)$/i);
    if (m) { number = normArticleNumber(m[1]); rest = m[2]; hadHeader = true; }
    const st = splitTitleAndBody(rest);
    const paragraphs = parseParagraphs(st.body);
    const numbered = paragraphs.some(p => p.number != null);
    // Real article prose: a paragraph long enough and ending in sentence
    // punctuation. Lets unnumbered-paragraph laws (e.g. ЗС) replace cleanly,
    // while a short unstructured fragment still falls through to needs_review.
    const hasProse = paragraphs.some(p => {
      const tx = (p.text || '').trim();
      return tx.length >= 40 && /[.;:!?]$/.test(tx);
    });
    // "sure" = explicit header, OR a title with body, OR a numbered paragraph, OR real prose.
    const sure = hadHeader || (!!st.title && paragraphs.length > 0) || numbered || hasProse;
    return { number: number, title: st.title, paragraphs: paragraphs, raw: t, hadHeader: hadHeader, sure: sure };
  }

  // Parse a "heading + article" payload: an optional pre-article heading line(s),
  // then an embedded "Член N" header, then the article body. Used by
  // replace_article_with_heading (e.g. „Стекнување…\nЧлен 243\n(текст)…“).
  function parseHeadingArticlePayload(payload) {
    const t = String(payload == null ? '' : payload).trim();
    const lines = t.split('\n');
    const hdrIdx = lines.findIndex(l => /^\s*Член\s+\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?\s*$/i.test(l));
    let preArticleHeading = null, number = null, rest = t;
    if (hdrIdx >= 0) {
      const before = lines.slice(0, hdrIdx).join('\n').trim();
      if (before) preArticleHeading = before;
      const hm = lines[hdrIdx].match(/Член\s+(\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?)/i);
      if (hm) number = normArticleNumber(hm[1]);
      rest = lines.slice(hdrIdx + 1).join('\n').trim();
    }
    const art = parseArticlePayload(rest);
    return {
      preArticleHeading: preArticleHeading,
      number: number,
      title: art.title,
      paragraphs: art.paragraphs,
      raw: t,
      sure: art.sure
    };
  }

  // Parse a Constitutional Court decision: each "СЕ УКИНУВА(АТ) … член X став Y
  // [алинеја Z] … во делот „…“" clause becomes a constitutional_delete_words op.
  function parseConstitutionalDecision(rawText) {
    const t = normalizeText(rawText);
    const ops = [];
    if (!/СЕ\s+УКИНУВА(?:АТ)?/i.test(t)) return ops;
    const re = /член\s+(\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?)\s+став\s+(\d+)(?:\s+алинеја\s+(\d+))?[\s\S]{0,120}?во\s+делот\s+„([\s\S]*?)\u201C/gi;
    let m;
    while ((m = re.exec(t)) !== null) {
      ops.push(makeOp({
        operation: 'constitutional_delete_words',
        legalSource: 'Constitutional Court Decision',
        targetBaseLaw: true,
        targetArticle: normArticleNumber(m[1]),
        targetParagraph: m[2],
        targetAlinea: m[3] || null,
        oldText: m[4].trim(),
        newText: null,
        effectiveRule: 'from publication in Official Gazette',
        confidence: 0.9,
        status: 'parsed',
        sourceAmendmentArticle: 'УС',
        evidence: m[0].slice(0, 280)
      }));
    }
    return ops;
  }

  // Classify a single administrative-article body into one Operation.
  function classify(adminNumber, body) {
    const b = body.replace(/\s+/g, ' ').trim();
    const target = findTargetArticle(body);
    const para = findParagraph(body);
    const alinea = findAlinea(body);
    const base = { sourceAmendmentArticle: adminNumber, targetArticle: target, rawInstruction: body, evidence: b.slice(0, 280) };

    // ---- DELETE a provision of a PREVIOUS amending act (NOT the base law):
    //      "Членот N од Законот за изменување ... (бр. 92/2008) се брише."
    const amendDel = body.match(new RegExp('[Чч]лен(?:от)?\\s+' + TARGET_ART + '\\s+од\\s+Закон[\\s\\S]*?се\\s+брише', 'i'));
    if (amendDel) {
      const refNum = normArticleNumber(amendDel[1]);
      const gz = (body.match(/бр\.?\s*(\d+\/\d{4})/) || [])[1] || null;
      const actName = (body.match(/од\s+(Закон[^.„]*?)(?:\s*\(|\s+се\s+брише)/i) || [])[1];
      return makeOp(Object.assign(base, {
        operation: 'delete_amending_act_provision',
        targetArticle: null,             // never the base law
        targetBaseLaw: false,
        referencedProvision: 'член ' + refNum,
        referencedAct: (actName ? actName.trim() : 'претходен изменувачки закон') + (gz ? (' (бр. ' + gz + ')') : ''),
        status: 'metadata_only',
        confidence: 0.9,
        reason: 'Бришење на одредба од претходен изменувачки закон — не се однесува на основниот закон (само евиденција).'
      }));
    }

    // ---- REPLACE ARTICLE WITH HEADING: "Насловот/Називот [на насловот] пред
    //      членот N и членот N се менуваат и гласат:"
    const headRepl = body.match(new RegExp(
      '(?:насловот|називот)(?:\\s+на\\s+насловот)?\\s+пред\\s+член(?:от)?\\s+' + TARGET_ART +
      '\\s+и\\s+член(?:от)?\\s+' + TARGET_ART + '\\s+се\\s+менуваат\\s+и\\s+гласат', 'i'));
    if (headRepl) {
      const n1 = normArticleNumber(headRepl[1]);
      const n2 = normArticleNumber(headRepl[2]);
      const payload = extractPayload(body);
      return makeOp(Object.assign(base, {
        operation: 'replace_article_with_heading',
        targetArticle: n2 || n1,
        newText: payload,
        confidence: (n1 === n2 && payload) ? 0.95 : 0.7,
        warnings: (n1 !== n2) ? ['Бројот пред насловот и бројот на членот не се совпаѓаат.'] : []
      }));
    }

    // ---- DELETE article: "Членот N се брише"
    if (/[Чч]ленот\s+\S+\s+се\s+брише/.test(b) && !para && !alinea && !/збор/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'delete_article', confidence: score({ target, noPayloadOk: true, unambiguous: true })
      }));
    }
    // ---- ADD article: "По членот N се додава нов член N-а ... гласи:"
    const addArt = body.match(new RegExp('по\\s+член(?:от)?\\s+' + TARGET_ART + '[\\s\\S]*?нов\\s+член\\s+' + TARGET_ART, 'i'));
    if (addArt) {
      const after = normArticleNumber(addArt[1]);
      const newNum = normArticleNumber(addArt[2]);
      return makeOp(Object.assign(base, {
        operation: 'add_article',
        targetArticle: newNum,
        oldText: null,
        newText: extractPayload(body),
        targetParagraph: after,           // store the "after" anchor here
        confidence: score({ target: true, payload: extractPayload(body), unambiguous: true })
      }));
    }
    // ---- REPLACE TITLE: "Насловот на членот N се менува и гласи:"
    if (/Насловот\s+на\s+член(?:от)?/i.test(b) && /(се\s+мен(?:ува|уваат)|гласи)/i.test(b) && !/и\s+членот/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'replace_title', targetParagraph: null,
        newText: extractPayload(body),
        confidence: score({ target, payload: extractPayload(body), unambiguous: true })
      }));
    }
    // ---- REPLACE / ADD / DELETE WORDS:
    //      "зборовите[:] „X“ се заменуваат со зборовите[:] „Y“"  (colon optional;
    //       straight/typographic quotes are normalised to „ … “ upstream).
    const wordsRepl = body.match(/збор(?:овите|от)\s*:?\s*„([\s\S]*?)["“]\s*се\s+заменува(?:ат)?\s+со\s+(?:збор(?:овите|от)\s*:?\s*)?„([\s\S]*?)["“]/i);
    if (wordsRepl) {
      return makeOp(Object.assign(base, {
        operation: 'replace_words', targetParagraph: para, targetAlinea: alinea,
        oldText: wordsRepl[1].trim(), newText: wordsRepl[2].trim(),
        confidence: score({ target, payload: true, unambiguous: true })
      }));
    }
    const wordsDel = body.match(/збор(?:овите|от)\s*:?\s*„([\s\S]*?)["“]\s*се\s+бриш(?:ат|е)/i);
    if (wordsDel) {
      return makeOp(Object.assign(base, {
        operation: 'delete_words', targetParagraph: para, targetAlinea: alinea,
        oldText: wordsDel[1].trim(), newText: null,
        confidence: score({ target, payload: true, unambiguous: true })
      }));
    }
    const wordsAdd = body.match(/(?:по\s+збор(?:овите|от)\s*:?\s*„([\s\S]*?)["“]\s*)?се\s+додава(?:ат)?\s+збор(?:овите|от)\s*:?\s*„([\s\S]*?)["“]/i);
    if (wordsAdd) {
      return makeOp(Object.assign(base, {
        operation: 'add_words', targetParagraph: para, targetAlinea: alinea,
        oldText: wordsAdd[1] ? wordsAdd[1].trim() : null, newText: wordsAdd[2].trim(),
        confidence: score({ target, payload: true, unambiguous: !!wordsAdd[1] })
      }));
    }
    // ---- ALINEA add / delete
    if (/алине/i.test(b) && /се\s+додава/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'add_alinea', targetParagraph: para, targetAlinea: alinea,
        newText: extractPayload(body),
        reason: 'Додавање алинеја со цитиран текст.',
        confidence: score({ target, payload: extractPayload(body) })
      }));
    }
    if (/алине/i.test(b) && /се\s+бриш/i.test(b)) {
      const ambiguous = alineaIsAmbiguous(alinea);
      return makeOp(Object.assign(base, {
        operation: 'delete_alinea', targetParagraph: para, targetAlinea: alinea,
        status: ambiguous ? 'needs_review' : 'parsed',
        reason: ambiguous
          ? 'Алинејата не е еднозначно определена — не се брише автоматски.'
          : 'Бришење на определена алинеја (' + alinea + ').',
        warnings: ambiguous ? ['Неопределена алинеја — потребна е рачна проверка.'] : [],
        confidence: ambiguous ? 0.5 : score({ target, noPayloadOk: true, unambiguous: true })
      }));
    }
    // ---- PARAGRAPH add / replace / delete
    if (para && /се\s+бриш/i.test(b) && !/збор/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'delete_paragraph', targetParagraph: para,
        confidence: score({ target, noPayloadOk: true, unambiguous: true })
      }));
    }
    if (/нов\s+став/i.test(b) && /се\s+додава/i.test(b)) {
      const newPara = (b.match(/нов\s+став\s*\((\d+)\)/i) || [])[1] || null;
      return makeOp(Object.assign(base, {
        operation: 'add_paragraph', targetParagraph: newPara,
        newText: extractPayload(body),
        confidence: score({ target, payload: extractPayload(body) })
      }));
    }
    if (para && /(се\s+мен(?:ува|уваат)|гласи)/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'replace_paragraph', targetParagraph: para,
        newText: extractPayload(body),
        confidence: score({ target, payload: extractPayload(body), unambiguous: true })
      }));
    }
    // ---- WHOLE-ARTICLE replace: "Членот N се менува и гласи:"
    if (/[Чч]ленот\s+\S+\s+се\s+менува\s+и\s+гласи/i.test(b) ||
        (target && /се\s+менува\s+и\s+гласи/i.test(b) && !para)) {
      return makeOp(Object.assign(base, {
        operation: 'replace_article', newText: extractPayload(body),
        confidence: score({ target, payload: extractPayload(body), unambiguous: true })
      }));
    }
    // ---- Transitional / final provisions of the amending act (no base-law target):
    //      EIF clauses, sub-law mandates, repeals of prior acts, etc.
    if (!target && /(влегува\s+во\s+сила|стапува\s+на\s+сила|отпочнува\s+да\s+се\s+применува|ќе\s+се\s+применува|ќе\s+се\s+донесе|подзаконск|преодн|завршн|престан(?:ува|уваат)\s+да\s+важи)/i.test(b)) {
      return makeOp(Object.assign(base, {
        operation: 'transitional_provision',
        status: 'metadata_only',
        confidence: 0.9,
        reason: 'Преодна или завршна одредба на изменувачкиот закон — не се применува на основниот закон (само евиденција).'
      }));
    }
    // ---- Generic modify (recognised target but ambiguous instruction)
    if (target) {
      return makeOp(Object.assign(base, {
        operation: 'modify_article', newText: extractPayload(body),
        warnings: ['Нееднозначна инструкција — потребна е рачна правна проверка.'],
        confidence: score({ target })
      }));
    }
    // ---- Unrecognised
    return makeOp(Object.assign(base, {
      operation: 'modify_article',
      warnings: ['Не е препознаена операцијата ниту целниот член.'],
      confidence: 0.2
    }));
  }

  function parseAmendments(rawText) {
    const constitutional = parseConstitutionalDecision(rawText);
    const admins = splitAdminArticles(rawText);
    const ops = constitutional.concat(admins.map(a => classify(a.adminNumber, a.body)));
    // Spec #7: propagate article-number normalization metadata into every op.
    // A homoglyph (e.g. Latin „I"/„l") in the target number forces needs_review
    // and caps confidence at 0.65 — such an op is NEVER auto-applied.
    ops.forEach(op => {
      if (op.status === 'metadata_only') return;
      const rawTarget = findTargetArticleRaw(op.rawInstruction || '') || (op.targetArticle != null ? String(op.targetArticle) : null);
      op.rawTargetArticle = rawTarget;
      op.normalizedTargetArticle = op.targetArticle != null ? op.targetArticle : (rawTarget ? normArticleNumber(rawTarget) : null);
      const ex = normalizeArticleNumberEx(rawTarget != null ? rawTarget : (op.targetArticle != null ? op.targetArticle : ''));
      op.normalizationWarnings = ex.warnings.slice();
      op.normalizationRisk = ex.warnings.length ? 'high' : 'none';
      if (ex.warnings.indexOf('article_number_homoglyph_needs_review') >= 0) {
        op.status = 'needs_review';
        op.applied = false;
        op.confidence = Math.min(op.confidence != null ? op.confidence : 1, 0.65);
        if (op.warnings.indexOf('article_number_homoglyph_needs_review') < 0) op.warnings.push('article_number_homoglyph_needs_review');
        if (!op.reason || /Применето/.test(op.reason)) op.reason = 'Хомоглиф во бројот на членот (на пр. латинично „I"/„l") — потребна е рачна проверка; не се применува автоматски.';
      } else if (!op.reason) {
        op.reason = 'Препознаена операција: ' + (op.operation || 'непознато') + '.';
      }
    });
    // Mark low-confidence ops for review up front (metadata_only stays as-is).
    ops.forEach(op => {
      if (op.status === 'metadata_only') return;
      if (op.confidence < 0.7 && op.status === 'parsed') {
        op.status = 'needs_review';
        if (!op.warnings.length) op.warnings.push('Ниска сигурност на препознавање (<70%).');
      }
    });
    return ops;
  }

  /* ----------------------------------------------------------------------
   *  3. CONSOLIDATION ENGINE  (operates on the structured model)
   * --------------------------------------------------------------------*/
  function cloneLaw(law) { return JSON.parse(JSON.stringify(law)); }

  function findArticle(law, number) {
    const n = normArticleNumber(number);
    return law.articles.find(a => normArticleNumber(a.number) === n) || null;
  }
  function findPara(article, num) {
    if (!article) return null;
    if (num == null) return article.paragraphs[0] || null;
    return article.paragraphs.find(p => String(p.number) === String(num)) || null;
  }

  // Resolve where a word operation (replace_words / delete_words / add_words /
  // constitutional_delete_words) should apply, with alinea-awareness and strict
  // anti-ambiguity guards. Returns one of:
  //   { para }            → mutate para.text
  //   { para, alinea }    → mutate alinea.text (specific alinea)
  //   { review: reason }  → do NOT apply; caller sets needs_review
  // Principle: better needs_review than a change on the wrong paragraph/alinea.
  function resolveWordTarget(a, op) {
    if (!a) return { review: 'нема целен член' };
    const isAdd = op.operation === 'add_words';
    const ta = op.targetAlinea;

    // (1) Explicit alinea requested.
    if (ta != null) {
      if (ta === 'plural' || ta === 'unspec') return { review: 'неопределена алинеја (повеќе/неспецифична) — потребна рачна проверка' };
      const idx = parseInt(ta, 10);
      if (!(idx >= 1)) return { review: 'неважечки индекс на алинеја' };
      let para = op.targetParagraph != null ? findPara(a, op.targetParagraph) : null;
      if (!para) {
        const cands = a.paragraphs.filter(p => p.alineas && p.alineas.length >= idx);
        if (cands.length === 1) para = cands[0];
        else if (cands.length > 1 && op.oldText) {
          const wt = cands.filter(p => (p.alineas[idx - 1].text || '').indexOf(op.oldText) >= 0);
          if (wt.length === 1) para = wt[0];
        }
      }
      if (!para) return { review: 'не може еднозначно да се одреди ставот за алинеја ' + idx };
      if (!para.alineas || idx < 1 || idx > para.alineas.length) return { review: 'алинеја ' + idx + ' е надвор од опсег' };
      const al = para.alineas[idx - 1];
      if (op.oldText && (al.text || '').indexOf(op.oldText) < 0)
        return { review: (isAdd ? 'сидрениот текст' : 'стариот текст') + ' не е најден во алинеја ' + idx };
      return { para: para, alinea: al };
    }

    // (2) Explicit paragraph, no alinea.
    if (op.targetParagraph != null) {
      let para = findPara(a, op.targetParagraph);
      // Unnumbered ставови (e.g. after a full article replacement): „став N" means
      // the N-th paragraph by position. Only when ALL ставови are unnumbered.
      if (!para) {
        const n = parseInt(op.targetParagraph, 10);
        if (n >= 1 && n <= a.paragraphs.length && a.paragraphs.every(p => p.number == null)) para = a.paragraphs[n - 1];
      }
      if (para) {
        if (op.oldText) {
          if ((para.text || '').indexOf(op.oldText) >= 0) return { para: para };
          const am = (para.alineas || []).filter(al => (al.text || '').indexOf(op.oldText) >= 0);
          if (am.length === 1) return { para: para, alinea: am[0] };
          if (am.length > 1) return { review: 'текстот се појавува во повеќе алинеи на ставот — нееднозначно сидро', dup: true };
          return { para: para }; // not found → caller's not-found check handles it
        }
        return { para: para };
      }
    }

    // (3) Locate by oldText across the article, guarding cross-place ambiguity.
    if (op.oldText) {
      const countOcc = (hay, needle) => { if (!needle) return 0; let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; } return n; };
      const pm = a.paragraphs.filter(p => (p.text || '').indexOf(op.oldText) >= 0);
      const am = [];
      a.paragraphs.forEach(p => (p.alineas || []).forEach(al => { if ((al.text || '').indexOf(op.oldText) >= 0) am.push({ para: p, alinea: al }); }));
      // total OCCURRENCES (multiplicity), not just containers — two hits in one
      // paragraph are still ambiguous and must not be silently replaced.
      const totalOcc = a.paragraphs.reduce((s, p) => s + countOcc(p.text || '', op.oldText)
        + (p.alineas || []).reduce((t, al) => t + countOcc(al.text || '', op.oldText), 0), 0);
      if (totalOcc > 1) return { review: 'стариот текст се појавува ' + totalOcc + ' пати во членот без означена алинеја/став — нееднозначно сидро', dup: true };
      if (totalOcc === 1) return am.length === 1 ? { para: am[0].para, alinea: am[0].alinea } : { para: pm[0] };
      return { para: a.paragraphs[0] }; // not found → caller's not-found check handles it
    }

    // (4) add_words append with no anchor.
    return { para: findPara(a, op.targetParagraph) || a.paragraphs[0] };
  }

  function applyOperation(law, op, audit) {
    const log = (action, detail, extra) => audit.push(Object.assign({
      ts: Date.now(), opId: op.id, sourceAmendmentArticle: op.sourceAmendmentArticle,
      operation: op.operation, targetArticle: op.targetArticle,
      targetParagraph: (op.targetParagraph != null ? op.targetParagraph : null),
      targetAlinea: (op.targetAlinea != null ? op.targetAlinea : null),
      oldText: op.oldText || null, newText: op.newText || null,
      confidence: (op.confidence != null ? op.confidence : null),
      duplicateAnchorRisk: !!op.duplicateAnchorRisk,
      reason: op.reason || null, rawInstruction: op.rawInstruction || null,
      action, detail
    }, extra || {}));

    // Anything explicitly flagged for review is NOT auto-applied. Better no
    // change than a wrongly placed change. (mirrors the RATIO principle).
    if (op.status === 'needs_review' || op.confidence < 0.7) {
      op.status = 'needs_review';
      if (!op.reason) op.reason = 'Прескокнато автоматски — ниска сигурност или означено за рачна проверка.';
      log('skipped', op.reason);
      return false;
    }

    try {
      switch (op.operation) {
        case 'delete_article': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.warnings.push('Целниот член не е пронајден.'); op.status = 'failed'; op.reason = 'Целниот член не постои.'; log('failed', 'no target'); return false; }
          a.status = 'deleted';
          op.reason = 'Членот ' + a.number + ' означен како избришан.';
          log('applied', 'Членот означен како избришан.');
          break;
        }
        case 'add_article': {
          if (findArticle(law, op.targetArticle)) { op.warnings.push('Членот веќе постои.'); op.status = 'needs_review'; op.reason = 'Член со тој број веќе постои.'; log('needs_review', 'duplicate'); return false; }
          if (!op.newText) { op.warnings.push('Нема текст за новиот член.'); op.status = 'needs_review'; op.reason = 'Недостасува текст за новиот член.'; log('needs_review', 'no payload'); return false; }
          const art = parseArticlePayload(op.newText);
          // If the payload repeats a "Член N" header, its number must match the target.
          if (art.hadHeader && art.number && op.targetArticle &&
              normArticleNumber(art.number) !== normArticleNumber(op.targetArticle)) {
            op.status = 'needs_review';
            op.warnings.push('Бројот во новиот член („' + art.number + '“) не одговара на целниот број („' + op.targetArticle + '“).');
            op.reason = 'Несовпаѓање на број на нов член — потребна рачна проверка.';
            log('needs_review', 'add article number mismatch'); return false;
          }
          if (!art.sure || (!art.paragraphs.length && !art.title)) {
            op.status = 'needs_review';
            op.warnings.push('Структурата на новиот член (наслов/ставови) не е сигурна.');
            op.reason = 'Неструктуриран нов член — потребна рачна проверка.';
            log('needs_review', 'add article unstructured'); return false;
          }
          const after = op.targetParagraph; // "after" anchor stored here
          // The header (if any) is consumed by parseArticlePayload, so "Член N" is
          // never duplicated into the body.
          const newArticle = {
            number: normArticleNumber(op.targetArticle),
            preArticleHeading: null,
            title: art.title,
            paragraphs: art.paragraphs,
            status: 'added',
            raw: art.raw
          };
          const idx = law.articles.findIndex(a => normArticleNumber(a.number) === normArticleNumber(after));
          if (idx >= 0) law.articles.splice(idx + 1, 0, newArticle);
          else law.articles.push(newArticle);
          op.reason = 'Додаден нов член ' + newArticle.number + (after ? (' по член ' + after) : '') + '.';
          log('applied', 'Додаден нов член ' + newArticle.number + '.');
          break;
        }
        case 'replace_article': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.warnings.push('Целниот член не е пронајден.'); op.status = 'failed'; op.reason = 'Целниот член не постои во основниот закон.'; log('failed', 'no target'); return false; }
          if (!op.newText) { op.status = 'needs_review'; op.warnings.push('Нема нов текст.'); op.reason = 'Недостасува текст за замена.'; log('needs_review', 'no payload'); return false; }
          const art = parseArticlePayload(op.newText);
          if (art.hadHeader && art.number && op.targetArticle &&
              normArticleNumber(art.number) !== normArticleNumber(op.targetArticle)) {
            op.status = 'needs_review';
            op.warnings.push('Бројот на членот во новиот текст („' + art.number + '“) не одговара на целниот член („' + op.targetArticle + '“).');
            op.reason = 'Несовпаѓање на број на член — потребна рачна проверка.';
            log('needs_review', 'article number mismatch'); return false;
          }
          if (!art.sure || !art.paragraphs.length) {
            op.status = 'needs_review';
            op.warnings.push('Структурата на новиот член (наслов/ставови) не е сигурна.');
            op.reason = 'Неструктуриран нов текст — за да не остане стар наслов со ново тело, потребна е рачна проверка.';
            log('needs_review', 'unstructured payload'); return false;
          }
          op.oldText = (a.title ? a.title + '\n' : '') + a.paragraphs.map(p => (p.number != null ? '(' + p.number + ') ' : '') + p.text).join('\n');
          if (art.title != null) a.title = art.title;   // replace title (no stale title left behind)
          a.paragraphs = art.paragraphs;                 // replace paragraphs
          a.raw = art.raw;                               // replace raw
          a.status = 'replaced';
          op.reason = 'Целосна замена на член ' + a.number + ' (наслов + ставови + raw).';
          log('applied', 'Целосно заменет член ' + a.number + '.');
          break;
        }
        case 'replace_article_with_heading': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.warnings.push('Целниот член не е пронајден.'); op.status = 'failed'; op.reason = 'Целниот член не постои во основниот закон.'; log('failed', 'no target'); return false; }
          if (!op.newText) { op.status = 'needs_review'; op.warnings.push('Нема нов текст.'); op.reason = 'Недостасува текст за замена.'; log('needs_review', 'no payload'); return false; }
          const ha = parseHeadingArticlePayload(op.newText);
          if (ha.number && op.targetArticle && normArticleNumber(ha.number) !== normArticleNumber(op.targetArticle)) {
            op.status = 'needs_review';
            op.warnings.push('Бројот на членот во цитатот („' + ha.number + '“) не одговара на целниот член („' + op.targetArticle + '“).');
            op.reason = 'Несовпаѓање на број на член — потребна рачна проверка.';
            log('needs_review', 'heading article number mismatch'); return false;
          }
          if (!ha.sure || !ha.paragraphs.length) {
            op.status = 'needs_review';
            op.warnings.push('Структурата на новиот член (наслов/ставови) не е сигурна.');
            op.reason = 'Неструктуриран нов текст — потребна е рачна проверка.';
            log('needs_review', 'unstructured heading payload'); return false;
          }
          op.oldText = (a.preArticleHeading ? '[' + a.preArticleHeading + '] ' : '') +
            (a.title ? a.title + '\n' : '') + a.paragraphs.map(p => p.text).join('\n');
          if (ha.preArticleHeading != null) a.preArticleHeading = ha.preArticleHeading; // heading as metadata, NOT a paragraph
          a.title = (ha.title != null) ? ha.title : null;   // never leave a stale inline title
          a.paragraphs = ha.paragraphs;                      // "Член N" header was consumed -> not in body
          a.raw = ha.raw;
          a.status = 'replaced';
          op.preArticleHeading = ha.preArticleHeading || null;
          op.reason = 'Замена на наслов пред член + член ' + a.number + (ha.preArticleHeading ? (' (наслов: „' + ha.preArticleHeading + '“)') : '') + '.';
          log('applied', 'Заменет наслов+член ' + a.number + '.');
          break;
        }
        case 'constitutional_delete_words': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.status = 'needs_review'; op.warnings.push('Целниот член не е пронајден во основниот закон.'); op.reason = 'Уставната одлука се однесува на член што не е во овој закон — рачна проверка.'; log('needs_review', 'no target (constitutional)'); return false; }
          // Alinea-aware targeting (same safety rules as the word operations).
          if (op.targetAlinea != null) {
            const rt = resolveWordTarget(a, op);
            if (rt.review) { op.status = 'needs_review'; op.alineaWordOpUnapplied = true; op.warnings.push(rt.review); op.reason = 'Безбедна проверка (уставна одлука): ' + rt.review + ' — без бришење.'; log('needs_review', rt.review); return false; }
            const tgt = rt.alinea || rt.para;
            if (!op.oldText || (tgt.text || '').indexOf(op.oldText) < 0) { op.status = 'needs_review'; op.warnings.push('Укинатиот дел не е дословно пронајден во ' + (rt.alinea ? 'алинејата' : 'ставот') + '.'); op.reason = 'Текстот од уставната одлука не е дословно пронајден — не се брише автоматски.'; log('needs_review', 'constitutional text not found'); return false; }
            tgt.text = tgt.text.replace(op.oldText, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
            a.status = (a.status === 'original') ? 'modified' : a.status;
            op.reason = 'Укинат дел по одлука на Уставен суд во член ' + a.number + ' (' + (rt.alinea ? 'алинеја ' + op.targetAlinea : 'став ' + op.targetParagraph) + '): „' + op.oldText + '“.';
            log('applied', 'Уставна одлука: укинат дел (алинеја/став) во член ' + a.number + '.'); break;
          }
          const p = op.targetParagraph ? a.paragraphs.find(x => String(x.number) === String(op.targetParagraph)) : a.paragraphs[0];
          if (!p) { op.status = 'needs_review'; op.warnings.push('Целниот став не е пронајден.'); op.reason = 'Ставот од уставната одлука не е пронајден — рачна проверка.'; log('needs_review', 'no paragraph (constitutional)'); return false; }
          if (!op.oldText || p.text.indexOf(op.oldText) < 0) {
            op.status = 'needs_review';
            op.warnings.push('Укинатиот дел („' + (op.oldText || '') + '“) не е дословно пронајден во ставот.');
            op.reason = 'Текстот од уставната одлука не е дословно пронајден — не се брише автоматски.';
            log('needs_review', 'constitutional text not found'); return false;
          }
          p.text = p.text.replace(op.oldText, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
          a.status = (a.status === 'original') ? 'modified' : a.status;
          op.reason = 'Укинат дел по одлука на Уставен суд во член ' + a.number + ' став ' + op.targetParagraph + ': „' + op.oldText + '“.';
          log('applied', 'Уставна одлука: укинат дел во член ' + a.number + '.');
          break;
        }
        case 'delete_amending_act_provision': {
          // This NEVER touches the base law. Recorded as metadata for the audit trail.
          op.status = 'metadata_only';
          op.reason = op.reason || 'Бришење на одредба од претходен изменувачки закон — не се применува на основниот закон.';
          log('metadata_only', 'Евидентирано: ' + (op.referencedProvision || 'одредба') + ' од ' + (op.referencedAct || 'претходен изменувачки закон') + ' се брише (не е базен член).');
          return false;
        }
        case 'transitional_provision': {
          op.status = 'metadata_only';
          op.reason = op.reason || 'Преодна/завршна одредба — не се применува на основниот закон.';
          log('metadata_only', 'Преодна/завршна одредба евидентирана (адм.чл. ' + op.sourceAmendmentArticle + ').');
          return false;
        }
        case 'replace_title': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.status = 'failed'; op.warnings.push('Целниот член не е пронајден.'); op.reason = 'Целниот член не постои.'; log('failed', 'no target'); return false; }
          op.oldText = a.title;
          a.title = op.newText; a.status = a.status === 'original' ? 'modified' : a.status;
          op.reason = 'Изменет наслов на член ' + a.number + '.';
          log('applied', 'Изменет наслов на член ' + a.number + '.');
          break;
        }
        case 'replace_paragraph': {
          const a = findArticle(law, op.targetArticle);
          const p = findPara(a, op.targetParagraph);
          if (!p) { op.status = 'failed'; op.warnings.push('Ставот не е пронајден.'); op.reason = 'Целниот став не постои во членот.'; log('failed', 'no para'); return false; }
          op.oldText = p.text;
          const num = (op.targetParagraph != null ? op.targetParagraph : (p.number != null ? p.number : 1));
          const payload = normalizeParagraphPayload(op.newText, num);
          const pa = parseAlineas(payload);
          const pp = withPoints({ number: num, text: pa.lead, alineas: pa.alineas });
          p.text = pp.text; p.alineas = pp.alineas; p.points = pp.points;
          a.status = a.status === 'original' ? 'modified' : a.status;
          op.reason = 'Заменет став (' + num + ') во член ' + a.number + '.';
          log('applied', 'Заменет став (' + num + ') во член ' + a.number + '.');
          break;
        }
        case 'add_paragraph': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.status = 'failed'; op.warnings.push('Целниот член не е пронајден.'); op.reason = 'Целниот член не постои.'; log('failed', 'no target'); return false; }
          const num = (op.targetParagraph != null ? op.targetParagraph : (a.paragraphs.length + 1));
          const payload = normalizeParagraphPayload(op.newText, num);
          const parsed = parseParagraphs('(' + num + ') ' + payload);
          a.paragraphs.push(parsed[0]);
          a.status = a.status === 'original' ? 'modified' : a.status;
          op.reason = 'Додаден нов став (' + num + ') во член ' + a.number + '.';
          log('applied', 'Додаден нов став во член ' + a.number + '.');
          break;
        }
        case 'delete_paragraph': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.status = 'failed'; op.warnings.push('Целниот член не е пронајден.'); log('failed', 'no target'); return false; }
          const before = a.paragraphs.length;
          a.paragraphs = a.paragraphs.filter(p => String(p.number) !== String(op.targetParagraph));
          if (a.paragraphs.length === before) { op.status = 'needs_review'; op.warnings.push('Ставот за бришење не е пронајден.'); op.reason = 'Ставот за бришење не постои.'; log('needs_review', 'no para'); return false; }
          a.status = a.status === 'original' ? 'modified' : a.status;
          op.reason = 'Избришан став (' + op.targetParagraph + ') од член ' + a.number + '.';
          log('applied', 'Избришан став (' + op.targetParagraph + ') од член ' + a.number + '.');
          break;
        }
        case 'replace_words':
        case 'delete_words':
        case 'add_words': {
          const a = findArticle(law, op.targetArticle);
          if (!a) { op.status = 'failed'; op.warnings.push('Целниот член не е пронајден.'); op.reason = 'Целниот член не постои.'; log('failed', 'no target article'); return false; }
          const rt = resolveWordTarget(a, op);
          if (rt.review) {
            op.status = 'needs_review';
            if (op.targetAlinea != null) op.alineaWordOpUnapplied = true;
            if (rt.dup) op.duplicateAnchorRisk = true;
            op.warnings.push(rt.review);
            op.reason = 'Безбедна проверка: ' + rt.review + ' — без автоматска промена.';
            log('needs_review', rt.review, { duplicateAnchorRisk: !!op.duplicateAnchorRisk }); return false;
          }
          const target = rt.alinea || rt.para;       // object whose .text we mutate
          const where = rt.alinea ? 'алинеја' : ('став ' + (rt.para.number != null ? rt.para.number : 1));
          const paraId = rt.para ? (rt.para.number != null ? rt.para.number : (a.paragraphs.indexOf(rt.para) + 1)) : null;
          const alineaId = rt.alinea ? (rt.para.alineas.indexOf(rt.alinea) + 1) : null;
          const targetPath = 'article:' + a.number + (paraId != null ? '.paragraph:' + paraId : '') + (alineaId != null ? '.alinea:' + alineaId : '');
          const beforeText = target.text;
          if (op.operation === 'replace_words') {
            if ((target.text || '').indexOf(op.oldText) === -1) { op.status = 'needs_review'; op.warnings.push('Стариот текст не е најден дословно.'); op.reason = 'Целниот текст не е најден дословно — без замена.'; log('needs_review', 'old text not found', { targetPath: targetPath, beforeText: beforeText }); return false; }
            target.text = target.text.split(op.oldText).join(op.newText);
            op.reason = 'Заменети зборови во член ' + a.number + ' (' + where + ').';
          } else if (op.operation === 'delete_words') {
            if ((target.text || '').indexOf(op.oldText) === -1) { op.status = 'needs_review'; op.warnings.push('Текстот за бришење не е најден.'); op.reason = 'Текстот за бришење не е најден дословно — без бришење.'; log('needs_review', 'not found', { targetPath: targetPath, beforeText: beforeText }); return false; }
            target.text = target.text.split(op.oldText).join('').replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
            op.reason = 'Избришани зборови во член ' + a.number + ' (' + where + ').';
          } else { // add_words
            if (op.oldText && (target.text || '').indexOf(op.oldText) === -1) { op.status = 'needs_review'; op.warnings.push('Сидрениот текст („по зборовите“) не е најден.'); op.reason = 'Местото на вметнување не е најдено дословно — без додавање.'; log('needs_review', 'anchor not found', { targetPath: targetPath, beforeText: beforeText }); return false; }
            if (op.oldText) target.text = target.text.replace(op.oldText, op.oldText + ' ' + op.newText);
            else target.text = (target.text + ' ' + op.newText).trim();
            op.reason = 'Додадени зборови во член ' + a.number + ' (' + where + ').';
          }
          op.appliedTo = rt.alinea ? 'alinea' : 'paragraph';
          a.status = a.status === 'original' ? 'modified' : a.status;
          log('applied', op.operation + ' во член ' + a.number + ' (' + where + ').', { targetPath: targetPath, beforeText: beforeText, afterText: target.text });
          break;
        }
        case 'add_alinea': {
          const a = findArticle(law, op.targetArticle);
          const p = findPara(a, op.targetParagraph);
          const target = p || (a ? a.paragraphs[0] : null);
          if (!target) { op.status = 'failed'; op.warnings.push('Целниот став не е пронајден.'); op.reason = 'Целниот член/став не постои.'; log('failed', 'no target'); return false; }
          if (!op.newText) { op.status = 'needs_review'; op.warnings.push('Нема текст за алинејата.'); op.reason = 'Недостасува текст за новата алинеја.'; log('needs_review', 'no payload'); return false; }
          const newAl = { marker: '-', text: (op.newText || '').trim() };
          if (op.targetAlinea && !alineaIsAmbiguous(op.targetAlinea)) {
            const at = parseInt(op.targetAlinea, 10);           // insert AFTER this 1-based position
            if (!isNaN(at) && at >= 1 && at <= target.alineas.length) target.alineas.splice(at, 0, newAl);
            else target.alineas.push(newAl);
            op.reason = 'Додадена алинеја по позиција ' + at + ' во член ' + a.number + '.';
          } else {
            target.alineas.push(newAl);
            op.reason = 'Додадена алинеја на крај во член ' + a.number + '.';
          }
          a.status = a.status === 'original' ? 'modified' : a.status;
          log('applied', 'Додадена алинеја во член ' + a.number + '.');
          break;
        }
        case 'delete_alinea': {
          const a = findArticle(law, op.targetArticle);
          const p = findPara(a, op.targetParagraph);
          const target = p || (a ? a.paragraphs[0] : null);
          if (!target || !target.alineas.length) { op.status = 'needs_review'; op.warnings.push('Нема алинеи за бришење.'); op.reason = 'Целниот став нема алинеи.'; log('needs_review', 'no alineas'); return false; }
          // Never silently delete the last alinea when the target is not explicit.
          if (alineaIsAmbiguous(op.targetAlinea)) {
            op.status = 'needs_review';
            op.warnings.push('Алинејата не е еднозначно определена — бришењето не е автоматско.');
            op.reason = 'Неопределена алинеја — за да не се избрише погрешна алинеја, потребна е рачна проверка.';
            log('needs_review', 'ambiguous alinea'); return false;
          }
          const i = parseInt(op.targetAlinea, 10) - 1;
          if (isNaN(i) || i < 0 || i >= target.alineas.length) { op.status = 'needs_review'; op.warnings.push('Алинејата „' + op.targetAlinea + '“ не е пронајдена.'); op.reason = 'Алинејата надвор од опсег.'; log('needs_review', 'index'); return false; }
          target.alineas.splice(i, 1);
          a.status = a.status === 'original' ? 'modified' : a.status;
          op.reason = 'Избришана алинеја ' + op.targetAlinea + ' во член ' + a.number + '.';
          log('applied', 'Избришана алинеја во член ' + a.number + '.');
          break;
        }
        default: {
          op.status = 'needs_review';
          op.warnings.push('Операцијата не е автоматски применлива.');
          log('skipped', 'unsupported op');
          return false;
        }
      }
      op.status = 'applied';
      op.applied = true;
      if (!op.reason) op.reason = 'Применето автоматски (висока сигурност).';
      return true;
    } catch (err) {
      op.status = 'failed';
      op.warnings.push('Грешка при примена: ' + err.message);
      op.reason = 'Грешка при примена: ' + err.message;
      log('failed', err.message);
      return false;
    }
  }

  function consolidate(baseLaw, operations) {
    resetIds();
    const law = cloneLaw(baseLaw);
    const audit = [];
    const snapshots = [cloneLaw(law)]; // rollback support: index 0 = before any op
    let applied = 0, review = 0, failed = 0, metadataOnly = 0;
    operations.forEach(op => {
      applyOperation(law, op, audit);
      snapshots.push(cloneLaw(law));
      if (op.status === 'applied') applied++;
      else if (op.status === 'failed') failed++;
      else if (op.status === 'metadata_only') metadataOnly++;
      else review++;
    });
    // keep articles in legal order
    law.articles.sort((a, b) => cmpArticle(a.number, b.number));
    const total = operations.length || 1;
    const applicable = Math.max(1, operations.length - metadataOnly);
    return {
      law, operations, audit, snapshots,
      stats: {
        total: operations.length, applied, needsReview: review, failed, metadataOnly,
        accuracy: Math.round((applied / applicable) * 1000) / 10  // % of applicable ops
      }
    };
  }

  // Rollback to the state *before* operation at given index (0-based).
  function rollbackTo(consolidation, opIndex) {
    const snap = consolidation.snapshots[opIndex];
    return snap ? cloneLaw(snap) : null;
  }

  /* ----------------------------------------------------------------------
   *  4. RULE-BASED LEGAL VALIDATOR
   * --------------------------------------------------------------------*/
  // v10.0.5: leftover markers are TECHNICAL residue ONLY — never normal words.
  // Each entry is an anchored RegExp so "измена/измени/изменување/изменет" and
  // "Законот за изменување и дополнување" are NEVER flagged.
  const LEFTOVER_MARKERS = [
    { re: /\[\s*ИЗМЕНА\s*\]/, label: '[ИЗМЕНА]' },
    { re: /\{\{\s*ИЗМЕНА\s*\}\}/, label: '{{ИЗМЕНА}}' },
    { re: /<<\s*ИЗМЕНА\s*>>/, label: '<<ИЗМЕНА>>' },
    { re: /===\s*ИЗМЕНА\s*===/, label: '=== ИЗМЕНА ===' },
    { re: /TODO\s*:\s*ИЗМЕНА/, label: 'TODO: ИЗМЕНА' },
    { re: /__\s*ИЗМЕНА\s*__/, label: '__ИЗМЕНА__' },
    { re: /\[\s*TODO\s*\]/i, label: '[TODO]' },
    { re: /\{\{\s*TODO\s*\}\}/i, label: '{{TODO}}' },
    { re: /\bundefined\b/, label: 'undefined' },
    { re: /\bnull\b/, label: 'null' },
    { re: /\bNaN\b/, label: 'NaN' },
    { re: /\[object Object\]/, label: '[object Object]' }
  ];
  const VALIDATOR_VERSION = 'Rule-Based Legal Validator v10.4.0';

  function articleText(a) {
    const parts = [a.title || ''];
    a.paragraphs.forEach(p => {
      parts.push(p.text);
      p.alineas.forEach(al => parts.push(al.text));
    });
    return parts.join('\n');
  }

  function validate(law, operations, opts) {
    const issues = [];
    const add = (sev, code, msg, where) => issues.push({ severity: sev, code, message: msg, where: where || null });
    const live = law.articles.filter(a => a.status !== 'deleted');

    // v10.0.8: law title must be a real title, not gazette/source-note noise.
    if (law.titleNeedsReview || law.title === 'Потребна проверка на наслов') {
      add('error', 'law_title_needs_review', 'Насловот на законот не може со сигурност да се извлече (можно „Редакциски пречистен текст“/изворна белешка). Потребна е рачна проверка на наслов.', null);
    }

    // а) sequence of articles + в) suffix awareness + б) duplicates
    const seen = new Map();
    const deletedBases = new Set(
      law.articles.filter(a => a.status === 'deleted').map(a => articleSortKey(a.number)[0])
    );
    let prevBase = 0;
    live.forEach(a => {
      const key = normArticleNumber(a.number);
      if (seen.has(key)) {
        if (opts && opts.officialConsolidated)
          add('warning', 'duplicate_article_in_source', 'Ист број „Член ' + a.number + '“ се појавува повеќепати во официјалниот извор — потребна рачна проверка против Службен весник (не е автоматски споено).', a.number);
        else
          add('error', 'duplicate_article', 'Дупликат член ' + a.number + '.', a.number);
      }
      seen.set(key, true);
      const [base] = articleSortKey(a.number);
      if (base > prevBase + 1 && !String(a.number).includes('-')) {
        // A gap is only a problem if some missing number is NOT explained by a deleted article.
        let allDeleted = true;
        for (let n = prevBase + 1; n < base; n++) { if (!deletedBases.has(n)) { allDeleted = false; break; } }
        if (!allDeleted) add('info', 'sequence_gap', 'Нагласка: членовите не се строго последователни (' + prevBase + ' → ' + a.number + ') — вообичаено кај извадоци или по бришења/додавања.', a.number);
      }
      if (base >= prevBase) prevBase = base;
    });

    live.forEach(a => {
      const txt = articleText(a);
      // possible (low-confidence) title — flag for manual QA, do not treat as confirmed
      if (a.possibleTitle && a.title) {
        add('warning', 'possible_title_low_confidence', 'Член ' + a.number + ': „' + a.title + '“ е препознаен како наслов со ниска сигурност (titleConfidence ' + (a.titleConfidence != null ? a.titleConfidence : '?') + '). Проверете дали е навистина наслов или почеток на став.', a.number);
      }
      // д) empty article
      if (!txt.trim()) add('error', 'empty_article', 'Празен член ' + a.number + '.', a.number);
      // ѓ) broken paragraph numbering
      const nums = a.paragraphs.map(p => p.number).filter(n => n != null).map(Number);
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] !== nums[i - 1] + 1) add('warning', 'paragraph_gap', 'Прекинати ставови во член ' + a.number + ' (' + nums.join(',') + ').', a.number);
      }
      // double paragraph marking, e.g. "(1) (1) ..." left by a bad replace
      a.paragraphs.forEach(p => {
        const rendered = (p.number != null ? '(' + p.number + ') ' : '') + (p.text || '');
        if (/^\(\d+\)\s*\(\d+\)/.test(rendered) || /^\(\d+\)/.test((p.text || '').trim())) {
          add('error', 'double_paragraph_marker', 'Дупло означување на став во член ' + a.number + '.', a.number);
        }
        // "Член N" leaking into a paragraph body -> likely a mis-parsed replace_article
        if (/Член\s+\d+/.test(p.text || '')) {
          add('warning', 'article_in_paragraph', 'Текст „Член N“ во став на член ' + a.number + ' — можна грешка при замена на член.', a.number);
        }
      });
      // probable mis-parsed article payload: header text duplicated/leaked into the article
      const headerHits = (txt.match(/Член\s+\d+(?:\s*[-–—]\s*[а-шѓѕјљњќџ])?/g) || []).length;
      const firstPara = a.paragraphs[0];
      if (headerHits >= 2 || (a.title == null && firstPara && /^\s*Член\s+\d+/.test(firstPara.text || ''))) {
        add('error', 'probable_misparsed_article_payload', 'Веројатно погрешно парсиран нов/заменет член ' + a.number + ' — „Член N“ се појавува во телото.', a.number);
      }
      // ѕ + и) leftover УКАЗ / failure markers (technical residue only)
      LEFTOVER_MARKERS.forEach(mk => {
        if (mk.re.test(txt)) add('error', 'leftover_marker', 'Остаток „' + mk.label + '“ во член ' + a.number + ' — неуспешна консолидација.', a.number);
      });
      if (/(^|\n)\s*У\s*К\s*А\s*З(?:\s|\n|$)/i.test(txt)) add('error', 'ukaz_leftover', 'Остаток од УКАЗ во член ' + a.number + '.', a.number);
      // ж) inconsistent quote balance
      const opens = (txt.match(/„/g) || []).length;
      const closes = (txt.match(/[“"]/g) || []).length;
      if (Math.abs(opens - closes) > 1) add('warning', 'quote_imbalance', 'Небалансирани наводници во член ' + a.number + '.', a.number);
    });

    // г) references to non-existing articles — distinguish INTERNAL vs EXTERNAL.
    // External references ("…од Законот за трговските друштва", "од ЗКП", …) are
    // NOT dangling. Only an internal "…од овој закон" pointing to a missing
    // article is an error; a bare "согласно член N" is info only.
    const liveSet = new Set(live.map(a => normArticleNumber(a.number)));
    const RE_EXTERNAL = /^[\s,.;:)]*(?:став[\sа-шѓѕјљњќџ\d()]*?)?(?:точк[аи][\sа-шѓѕјљњќџ\d()]*?)?\s*од\s+(?:Законот|законот|Кривичниот\s+законик|друг\s+закон|посебен\s+закон|ЗОО|ЗКП|ЗПП|ЗОУП|ЗУС|Уставот)/;
    const RE_EXTERNAL2 = /^[\s,.;:)]*(?:став[\sа-шѓѕјљњќџ\d()]*?)?\s*(?:согласно\s+посебен\s+пропис|од\s+посебен\s+пропис)/;
    const RE_INTERNAL = /^[\s,.;:)]*(?:став[\sа-шѓѕјљњќџ\d()]*?)?(?:точк[аи][\sа-шѓѕјљњќџ\d()]*?)?\s*(?:од|на)\s+овој\s+закон/;
    live.forEach(a => {
      const txt = articleText(a);
      let m; const ref = /член(?:от|овите)?\s+(\d+(?:-[а-шѓѕјљњќџ])?)/gi;
      while ((m = ref.exec(txt)) !== null) {
        const n = normArticleNumber(m[1]);
        if (liveSet.has(n)) continue;                 // points to a live article — fine
        const after = txt.slice(m.index + m[0].length, m.index + m[0].length + 80);
        if (RE_EXTERNAL.test(after) || RE_EXTERNAL2.test(after)) continue; // external law — not dangling
        if (RE_INTERNAL.test(after)) {
          add('error', 'dangling_reference', 'Член ' + a.number + ' упатува на непостоечки член ' + m[1] + ' од овој закон.', a.number);
        } else {
          add('info', 'dangling_reference', 'Член ' + a.number + ' упатува на член ' + m[1] + ' што не е пронајден во активното тело (можно надворешно упатување).', a.number);
        }
      }
    });

    // з) date of entry into force present? Severity depends on documentMode:
    // a full-law document MUST not silently ignore a missing final provision
    // (warning), while an excerpt legitimately may omit it (info).
    const allTxt = live.map(articleText).join('\n');
    const EIF_RE = /(стапува|влегува)\s+во\s+сила|отпочнува\s+да\s+се\s+применува|ќе\s+се\s+применува/i;
    if (!EIF_RE.test(allTxt) && !law.meta.eif) {
      const docMode = (opts && opts.documentMode) || 'excerpt';
      if (docMode === 'full-law') add('warning', 'missing_final_provision', 'Документот е деклариран како цел закон, но не е пронајдена завршна одредба (стапување/влегување во сила).', null);
      else add('info', 'no_eif', 'Не е пронајдена одредба за стапување/влегување во сила (excerpt mode).', null);
    }

    // ж/з) terminology consistency — Latin contamination in Cyrillic text
    live.forEach(a => {
      const txt = articleText(a);
      // Latin letters that masquerade as Cyrillic (common OCR/typing error)
      const latinInWord = txt.match(/[А-Ша-ш]+[a-zA-Z]+[А-Ша-ш]*|[a-zA-Z]+[А-Ша-ш]+/g);
      if (latinInWord && latinInWord.length) {
        add('warning', 'latin_contamination', 'Можна латинична контаминација во член ' + a.number + ' (пр. „' + latinInWord[0] + '“).', a.number);
      }
    });

    // wrong_payload_quote: a replaced/added article body that wrongly captured
    // the "Службен весник" boilerplate instead of the real article text.
    live.forEach(a => {
      if ((a.status === 'replaced' || a.status === 'added' || a.status === 'modified') &&
          /Службен\s+весник/i.test(articleText(a))) {
        add('error', 'wrong_payload_quote', 'Член ' + a.number + ' содржи „Службен весник“ — веројатно погрешно извлечен цитат.', a.number);
      }
    });

    // operation-level checks (when the operation list is supplied)
    if (Array.isArray(operations)) {
      operations.forEach(op => {
        const raw = op.rawInstruction || '';
        if (op.operation === 'modify_article' &&
            /(се\s+менува(?:ат)?\s+и\s+гласа?т?|се\s+додава(?:ат)?\s+зборовите|се\s+менуваат\s+и\s+гласат)/i.test(raw) &&
            op.status !== 'applied') {
          add('warning', 'unapplied_real_amendment', 'Реална измена остана како „modify_article“ и не е применета (адм.чл. ' + op.sourceAmendmentArticle + ').', op.targetArticle);
        }
        if (op.operation === 'constitutional_delete_words' && op.status !== 'applied') {
          add('warning', 'constitutional_decision_unapplied', 'Одлука на Уставен суд не е применета (член ' + op.targetArticle + ' став ' + op.targetParagraph + ').', op.targetArticle);
        }
        if (op.operation === 'delete_amending_act_provision' && op.targetBaseLaw !== false) {
          add('error', 'amending_act_provision_risk', 'Бришење на одредба од изменувачки закон погрешно мапирано на основниот закон.', op.targetArticle);
        }
        // alinea_word_operation_unapplied: op carried a concrete targetAlinea but did not apply
        const isWordOp = /_words$/.test(op.operation) || op.operation === 'constitutional_delete_words';
        if (isWordOp && op.targetAlinea != null && op.targetAlinea !== 'plural' && op.targetAlinea !== 'unspec' && op.status !== 'applied') {
          add('warning', 'alinea_word_operation_unapplied', 'Операција со targetAlinea ' + op.targetAlinea + ' (член ' + op.targetArticle + ') не е применета (' + op.status + '): ' + (op.reason || '') , op.targetArticle);
        }
        // duplicate_anchor_risk: oldText/anchor occurred multiple times without enough anchoring
        if (op.duplicateAnchorRisk) {
          add('warning', 'duplicate_anchor_risk', 'Сидрото/стариот текст се појавува повеќе пати во член ' + op.targetArticle + ' без доволно сидро — „' + op.operation + '“ оставена на рачна проверка.', op.targetArticle);
        }
      });
      // constitutional_decision_unapplied: source mentions СЕ УКИНУВА but no constitutional op exists at all
      const hasConstSrc = operations.some(op => /СЕ\s+УКИНУВА/i.test(op.rawInstruction || op.evidence || ''));
      const hasConstOp = operations.some(op => op.operation === 'constitutional_delete_words');
      if (hasConstSrc && !hasConstOp) {
        add('warning', 'constitutional_decision_unapplied', 'Текст содржи „СЕ УКИНУВА“, но нема препознаена уставна операција.', null);
      }
    }

    // Cross-cutting checks the UI layer computes (renderers, APP_CONFIG, snapshots)
    // are surfaced here so every issue lives in one place.
    if (opts && typeof opts === 'object') {
      if (opts.rendererOrderMismatch) add('error', 'renderer_order_mismatch', typeof opts.rendererOrderMismatch === 'string' ? opts.rendererOrderMismatch : 'Редоследот на елементите не е идентичен меѓу plain-text/HTML/DOM/DOCX рендерите.', null);
      if (opts.exportMetadataMismatch) add('error', 'export_metadata_mismatch', typeof opts.exportMetadataMismatch === 'string' ? opts.exportMetadataMismatch : 'Верзијата/build не е иста низ HTML, JSON, DOCX, UI и APP_CONFIG.', null);
      (opts.countViolations || []).forEach(function (v) {
        if (v.kind === 'paragraph') add('error', 'paragraph_count_changed_unexpectedly', 'Word-операција го промени бројот на ставови во член ' + v.article + ' (' + v.before + ' → ' + v.after + ').', v.article);
        else if (v.kind === 'alinea') add('error', 'alinea_count_changed_unexpectedly', 'Word-операција го промени бројот на алинеи во член ' + v.article + ' (' + v.before + ' → ' + v.after + ').', v.article);
      });
      if (opts.cdnWithoutSri) add('info', 'cdn_without_sri', 'Hosted режим со CDN библиотеки без SRI integrity — за продукција препорачано е SRI или локален vendor bundle.', null);
      if (opts.hostedUnsafeInlineCsp) add('warning', 'hosted_unsafe_inline_csp', 'Hosted режим со CSP што содржи „unsafe-inline“ без nonce/hash — за продукција отстранете „unsafe-inline“ и користете nonce или sha-hash.', null);
      if (opts.missingVendorBundle) add('warning', 'missing_vendor_bundle', 'Hosted режим со недостапна vendor библиотека (mammoth/JSZip/pdf.js) — DOCX/PDF функции нема да работат; обезбедете локален vendor bundle.', null);
      if (opts.pdfWorkerNotLocalInHosted) add('info', 'pdf_worker_not_local_in_hosted', 'Hosted режим: pdf.worker се вчитува од CDN — за продукција користете локален pdf.worker.min.js.', null);
    }

    // Structural QA (spec #7): per-article paragraph/heading/title/source-note
    // checks + deleted-article notes detected.
    law.articles.forEach(function (a) {
      if (a.status === 'deleted') {
        add('info', 'deleted_article_note_detected', 'Член ' + a.number + ' е означен како избришан во изворот (белешка зачувана во deleted_reference_notes).', a.number);
        return;
      }
      const fl = (typeof computeQaFlags === 'function') ? computeQaFlags(a) : [];
      const seen = {};
      fl.forEach(function (code) {
        if (seen[code]) return; seen[code] = true;
        const sev = (code === 'structural_heading_leak' || code === 'next_article_heading_leak' || code === 'numbered_section_heading_leak' || code === 'paragraph_number_regression' || code === 'deleted_note_leak_in_active_article') ? 'error'
                  : (code === 'duplicate_article_needs_verification') ? 'warning' : 'warning';
        const msg = {
          paragraph_number_regression: 'Нелогичен/повторен број на став во член ' + a.number + '.',
          structural_heading_leak: 'Структурен наслов (Глава/Дел/ПРЕОДНИ…) протечен во телото на член ' + a.number + '.',
          numbered_section_heading_leak: 'Нумериран поднаслов (пр. „1. Општи одредби“) во телото на член ' + a.number + '.',
          next_article_heading_leak: 'Наслов на следен член во телото на член ' + a.number + '.',
          title_false_positive: 'Реченица-тело е препозната како наслов во член ' + a.number + '.',
          deleted_note_leak_in_active_article: 'Белешка за избришан/укинат член во телото на активен член ' + a.number + '.',
          latin_contamination: 'OCR латинична контаминација во член ' + a.number + '.',
          duplicate_article_needs_verification: 'Дупликат член ' + a.number + ' — потребна правна проверка.'
        }[code] || code;
        add(sev, code, msg, a.number);
      });
    });

    const counts = issues.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {});
    const score = Math.max(0, 10 - (counts.error || 0) * 1.2 - (counts.warning || 0) * 0.4 - (counts.info || 0) * 0.1);
    return { issues, counts, score: Math.round(score * 10) / 10, articleCount: live.length, validatorVersion: VALIDATOR_VERSION };
  }

  // Word operations must never change paragraph/alinea counts. Using the
  // consolidation snapshots, compare the targeted article before/after each
  // word op and report any count drift (for the validator).
  function verifyWordOpCounts(consolidation) {
    const viol = [];
    if (!consolidation || !consolidation.snapshots || !consolidation.operations) return viol;
    const alCount = a => a.paragraphs.reduce((s, p) => s + (p.alineas ? p.alineas.length : 0), 0);
    consolidation.operations.forEach(function (op, idx) {
      if (!/_words$/.test(op.operation)) return;          // only word ops
      if (op.status !== 'applied') return;
      const before = consolidation.snapshots[idx], after = consolidation.snapshots[idx + 1];
      if (!before || !after) return;
      const ba = findArticle(before, op.targetArticle), aa = findArticle(after, op.targetArticle);
      if (!ba || !aa) return;
      if (ba.paragraphs.length !== aa.paragraphs.length) viol.push({ kind: 'paragraph', article: op.targetArticle, before: ba.paragraphs.length, after: aa.paragraphs.length });
      const b = alCount(ba), a2 = alCount(aa);
      if (b !== a2) viol.push({ kind: 'alinea', article: op.targetArticle, before: b, after: a2 });
    });
    return viol;
  }

  // Legal risk level for the whole consolidation, combining how many operations
  // need manual review/failed with how many validator errors remain.
  function legalRisk(stats, validation) {
    const review = (stats && stats.needsReview) || 0;
    const failed = (stats && stats.failed) || 0;
    const errors = (validation && validation.counts && validation.counts.error) || 0;
    const warnings = (validation && validation.counts && validation.counts.warning) || 0;
    if (failed > 0 || errors > 0 || review > 2) return 'high';
    if (review > 0 || warnings > 2) return 'medium';
    return 'low';
  }

  /* ----------------------------------------------------------------------
   *  5. RENDERING — structured model -> clean text / HTML
   * --------------------------------------------------------------------*/
  function articleToText(a) {
    const lines = [];
    if (a.precedingStructure && a.precedingStructure.length) {
      a.precedingStructure.forEach(function (s) { lines.push(s.text); });
    }
    if (a.preArticleHeading) lines.push(a.preArticleHeading);
    lines.push('Член ' + a.number + (a.status === 'deleted' ? ' (избришан)' : ''));
    if (a.title) lines.push(a.title);
    if (a.status === 'deleted') { lines.push(a.sourceNote ? a.sourceNote : '(Бришан)'); return lines.join('\n'); }
    a.paragraphs.forEach(p => {
      const pref = p.number != null ? '(' + p.number + ') ' : '';
      lines.push(pref + p.text);
      (p.points || []).forEach(pt => lines.push(pt.marker + ') ' + pt.text));
      p.alineas.forEach(al => lines.push('- ' + al.text));
    });
    return lines.join('\n');
  }

  function lawToText(law) {
    const out = [];
    if (law.title) out.push(law.title, '');
    const seenNote = Object.create(null);
    law.articles.forEach(a => {
      // Render a shared deletion note (e.g. a "од 70 до 96" range) only once so
      // it is neither lost nor multiplied in the fidelity multiset.
      if (a.status === 'deleted' && a.sourceNote) {
        if (seenNote[a.sourceNote]) { out.push('Член ' + a.number, ''); return; }
        seenNote[a.sourceNote] = true;
      }
      out.push(articleToText(a), '');
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  // Publication-readiness gate (spec #9): the model is NOT publication-ready if
  // any blocker is present.
  function publicationReadiness(law, sourceText) {
    const recs = buildArticleRecords(law);
    const blockers = [];
    let hasLegalVerification = false, hasDuplicate = false;
    recs.forEach(function (r) {
      if (r.status === 'deleted') {
        // deleted records still must not be mis-parsed
        ['deleted_suffix_article_misparsed', 'deleted_note_wrong_article_number', 'article_number_homoglyph_needs_review'].forEach(function (f) {
          if (r.qa_flags.indexOf(f) >= 0) { blockers.push({ article: r.article_number, blocker: f }); hasLegalVerification = true; }
        });
        return;
      }
      r.qa_flags.forEach(function (f) {
        if (f === 'duplicate_article_needs_verification') { hasDuplicate = true; hasLegalVerification = true; return; }
        blockers.push({ article: r.article_number, blocker: f, severity: 'error' });
      });
      if (r.duplicate_in_source) { hasDuplicate = true; hasLegalVerification = true; }
      if (r.needs_legal_verification) hasLegalVerification = true;
    });
    // Spec #2: a duplicate ACTIVE article number is a hard error blocker, not a
    // mere "needs legal verification". Emit one blocker per duplicated number.
    const dupGroups = findDuplicateArticles(law);
    dupGroups.forEach(function (d) {
      blockers.push({ article: d.number, blocker: 'duplicate_active_article_blocker', code: 'duplicate_active_article_blocker', severity: 'error', count: d.count });
    });
    if (dupGroups.length) { hasDuplicate = true; hasLegalVerification = true; }
    // Blocking fidelity gate (spec #7): any lost legal word blocks publication.
    let fidelity = null;
    if (sourceText != null) {
      fidelity = verifyFidelity(sourceText, law);
      if (fidelity.globalLostTokens > 0 || fidelity.fidelityScore < 100) {
        blockers.push({ article: null, blocker: 'fidelity_loss', lost: fidelity.globalLostTokens, score: fidelity.fidelityScore });
      }
    }
    const ready = blockers.length === 0 && !hasLegalVerification && !hasDuplicate;
    let status = 'publication_ready';
    if (!ready) status = (blockers.filter(function (b) { return b.blocker !== 'fidelity_loss'; }).length === 0 && hasLegalVerification && !hasDuplicate) ? 'needs_legal_verification'
              : (blockers.length === 0 && hasLegalVerification) ? 'needs_legal_verification' : 'qa_blocked';
    return { publicationReady: ready, publicationStatus: status, blockers: blockers, needsLegalVerification: hasLegalVerification, hasDuplicate: hasDuplicate, fidelity: fidelity, articlesChecked: recs.length };
  }

  // ── v10.0.3 structural-leak scan (spec #3,#4,#5,#6) ─────────────────────
  // Counts, per ACTIVE article body, every kind of structural contamination
  // that must NEVER survive in a publication-ready consolidated text, and
  // returns both the totals and the offending article numbers.
  function structuralLeakScan(law) {
    const recs = buildArticleRecords(law);
    const res = {
      footerLeaks: 0, transitionalLeaksInArticles: 0, constitutionalDecisionLeaksInArticles: 0,
      sourceFootnoteLeaksInArticles: 0, nextArticleHeadingLeaks: 0, structuralHeadingLeaks: 0,
      offenders: { footer: [], transitional: [], constitutional: [], sourceFootnote: [] }
    };
    recs.forEach(function (r) {
      if (r.status === 'deleted') return;
      const f = r.qa_flags || [];
      if (f.indexOf('gazette_footer_leak') >= 0) { res.footerLeaks++; res.offenders.footer.push(r.article_number); }
      if (f.indexOf('transitional_provision_leak') >= 0) { res.transitionalLeaksInArticles++; res.offenders.transitional.push(r.article_number); }
      if (f.indexOf('constitutional_decision_leak') >= 0) { res.constitutionalDecisionLeaksInArticles++; res.offenders.constitutional.push(r.article_number); }
      if (f.indexOf('source_footnote_leak') >= 0) { res.sourceFootnoteLeaksInArticles++; res.offenders.sourceFootnote.push(r.article_number); }
      if (f.indexOf('next_article_heading_leak') >= 0) res.nextArticleHeadingLeaks++;
      if (f.indexOf('structural_heading_leak') >= 0) res.structuralHeadingLeaks++;
    });
    res.totalStructuralLeaks = res.footerLeaks + res.transitionalLeaksInArticles + res.constitutionalDecisionLeaksInArticles + res.sourceFootnoteLeaksInArticles;
    return res;
  }

  // ── v10.0.3 authoritative Publication Gate (spec #2,#9,#11) ─────────────
  // Single source of truth for the QA block embedded in EVERY export. Combines
  // duplicate detection, the structural-leak scan and the readiness gate into
  // the canonical, machine-checkable verdict.
  function publicationGate(law, opts) {
    opts = opts || {};
    const appendices = opts.appendices || (law && law.appendices) || { transitionalProvisions: [], constitutionalCourtDecisions: [], sourceNotes: [] };
    const dupGroups = findDuplicateArticles(law);
    const leaks = structuralLeakScan(law);
    const pr = publicationReadiness(law, opts.sourceText != null ? opts.sourceText : null);
    const activeArticles = (law.articles || []).filter(function (a) { return a.status !== 'deleted'; }).length;
    const uniqueNumbers = (function () { const s = {}; (law.articles || []).forEach(function (a) { if (a.status !== 'deleted') s[a.number] = 1; }); return Object.keys(s).length; })();
    const duplicateActiveArticles = dupGroups.length;
    const footerLeaks = leaks.footerLeaks;
    const transitionalLeaks = leaks.transitionalLeaksInArticles;
    const constitutionalDecisionLeaks = leaks.constitutionalDecisionLeaksInArticles;
    const sourceFootnoteLeaks = leaks.sourceFootnoteLeaksInArticles;
    const structurallyClean = (duplicateActiveArticles === 0 && footerLeaks === 0 && transitionalLeaks === 0 && constitutionalDecisionLeaks === 0 && sourceFootnoteLeaks === 0);
    // ── v10.0.4 publication-quality scans ──────────────────────────────────
    const typo = typographyScan(law);
    const hg = homoglyphScan(law);
    const spacesBeforePunctuation = typo.spacesBeforePunctuation;
    const latinHomoglyphsInBody = hg.latinHomoglyphsInBody;
    // collect needs-review homoglyph flags from records
    let homoglyphNeedsReview = 0;
    (buildArticleRecords(law) || []).forEach(function (r) { if (r.status !== 'deleted' && (r.qa_flags || []).indexOf('latin_homoglyph_needs_review') >= 0) homoglyphNeedsReview++; });
    const unlabeledContinuationPages = (opts.layout && opts.layout.unlabeledContinuationPages != null) ? opts.layout.unlabeledContinuationPages : 0;
    const renderReproducibility = (opts.render && opts.render.reproducible === false) ? 'failed' : 'passed';
    const renderMismatch = !!(opts.render && opts.render.pageCountMismatch);
    const metadataIncomplete = !!(opts.metadataIncomplete);
    // ── blockers (any one forbids 9.5+ and publicationReady) ───────────────
    const typographyLeak = spacesBeforePunctuation > 0;
    const homoglyphBlocker = homoglyphNeedsReview > 0 || latinHomoglyphsInBody > 0;
    const layoutBlocker = unlabeledContinuationPages > 0;
    const renderBlocker = renderReproducibility === 'failed' || renderMismatch;
    const hasBlocker = !structurallyClean || typographyLeak || homoglyphBlocker || layoutBlocker || renderBlocker || metadataIncomplete;
    // ── dimensional scores (10 = clean) ───────────────────────────────────
    const structuralScore = structurallyClean ? 9.7 : Math.max(7.0, +(8.9 - 0.3 * ((duplicateActiveArticles?1:0)+(footerLeaks?1:0)+(transitionalLeaks?1:0)+(constitutionalDecisionLeaks?1:0)+(sourceFootnoteLeaks?1:0) - 1)).toFixed(2));
    const typographyScore = spacesBeforePunctuation === 0 ? 9.7 : Math.max(6.5, +(9.5 - Math.min(3, spacesBeforePunctuation * 0.15)).toFixed(2));
    const ocrFidelityScore = (latinHomoglyphsInBody === 0 && homoglyphNeedsReview === 0) ? 9.7 : Math.max(6.5, +(9.4 - Math.min(3, (latinHomoglyphsInBody + homoglyphNeedsReview) * 0.4)).toFixed(2));
    const layoutScore = unlabeledContinuationPages === 0 ? 9.6 : Math.max(7.0, +(9.0 - unlabeledContinuationPages * 0.5).toFixed(2));
    const exportScore = (renderReproducibility === 'passed' && !renderMismatch && !metadataIncomplete) ? 9.6 : 8.2;
    const dims = [structuralScore, typographyScore, ocrFidelityScore, layoutScore, exportScore];
    const lo = Math.min.apply(null, dims);
    const avg = dims.reduce(function (a, b) { return a + b; }, 0) / dims.length;
    // finalScore is governed by the WEAKEST dimension — never optimistic (spec #5).
    let finalScore = Math.min(avg, lo + 0.4);
    if (hasBlocker) finalScore = Math.min(finalScore, 8.9);
    finalScore = +finalScore.toFixed(2);
    const publicationReady = structurallyClean && pr.publicationReady && !typographyLeak && !homoglyphBlocker && !layoutBlocker && !renderBlocker && !metadataIncomplete;
    const validatorScore = finalScore;
    const reasons = [];
    if (duplicateActiveArticles) reasons.push({ code: 'duplicate_active_article_blocker', severity: 'error', detail: dupGroups.map(function (d) { return 'Член ' + d.number + ' ×' + d.count; }).join(', ') });
    if (footerLeaks) reasons.push({ code: 'gazette_footer_leak', severity: 'error', detail: 'Членови: ' + leaks.offenders.footer.join(', ') });
    if (transitionalLeaks) reasons.push({ code: 'transitional_provision_leak', severity: 'error', detail: 'Членови: ' + leaks.offenders.transitional.join(', ') });
    if (constitutionalDecisionLeaks) reasons.push({ code: 'constitutional_decision_leak', severity: 'error', detail: 'Членови: ' + leaks.offenders.constitutional.join(', ') });
    if (sourceFootnoteLeaks) reasons.push({ code: 'source_footnote_leak', severity: 'error', detail: 'Членови: ' + leaks.offenders.sourceFootnote.join(', ') });
    if (typographyLeak) reasons.push({ code: 'typography_spacing_leak', severity: 'error', detail: spacesBeforePunctuation + ' празни места пред интерпункција' });
    if (homoglyphNeedsReview) reasons.push({ code: 'latin_homoglyph_needs_review', severity: 'error', detail: homoglyphNeedsReview + ' членови со неразрешен латиничен хомоглиф' });
    if (latinHomoglyphsInBody) reasons.push({ code: 'latin_homoglyph_in_body', severity: 'error', detail: latinHomoglyphsInBody + ' латинични токени во тела' });
    if (layoutBlocker) reasons.push({ code: 'unlabeled_continuation_page', severity: 'error', detail: unlabeledContinuationPages + ' страници' });
    if (renderBlocker) reasons.push({ code: 'render_reproducibility_warning', severity: 'error', detail: renderMismatch ? 'DOCX/PDF page-count mismatch' : 'render not reproducible' });
    if (metadataIncomplete) reasons.push({ code: 'metadata_incomplete', severity: 'error', detail: 'недостасуваат метаподатоци' });
    return {
      toolVersion: '10.0.4',
      publicationReady: publicationReady,
      publicationStatus: publicationReady ? 'publication_ready' : 'qa_blocked',
      validatorScore: validatorScore,
      structuralScore: structuralScore,
      typographyScore: typographyScore,
      ocrFidelityScore: ocrFidelityScore,
      layoutScore: layoutScore,
      exportScore: exportScore,
      finalScore: finalScore,
      activeArticles: activeArticles,
      uniqueArticleNumbers: uniqueNumbers,
      duplicateArticles: duplicateActiveArticles,
      duplicateActiveArticles: duplicateActiveArticles,
      missingArticles: (opts.missingArticles != null ? opts.missingArticles : 0),
      footerLeaks: footerLeaks,
      transitionalLeaks: transitionalLeaks,
      constitutionalLeaks: constitutionalDecisionLeaks,
      constitutionalDecisionLeaks: constitutionalDecisionLeaks,
      sourceFootnoteLeaks: sourceFootnoteLeaks,
      latinHomoglyphs: latinHomoglyphsInBody,
      latinHomoglyphsInBody: latinHomoglyphsInBody,
      latinHomoglyphsNeedsReview: homoglyphNeedsReview,
      typographySpacingLeaks: spacesBeforePunctuation,
      spacesBeforePunctuation: spacesBeforePunctuation,
      unlabeledContinuationPages: unlabeledContinuationPages,
      renderReproducibility: renderReproducibility,
      structurallyClean: structurallyClean,
      reasons: reasons,
      appendixCounts: {
        transitionalProvisions: (appendices.transitionalProvisions || []).length,
        constitutionalCourtDecisions: (appendices.constitutionalCourtDecisions || []).length,
        sourceNotes: (appendices.sourceNotes || []).length
      },
      readiness: pr,
      generatedAt: (opts.now || new Date()).toISOString(),
      processingMode: opts.processingMode || 'offline',  // offline | hosted-local | server-assisted
      version: '10.1'
    };
  }

  // ── v10.0.5 SINGLE QA VERDICT (Verdict Lock) ────────────────────────────
  // The ONE authority every export must use. Merges publicationGate with the
  // rule-based validator (and optional csp/offline signals). HARD RULE: if the
  // validator reports ANY severity="error", then publicationReady=false,
  // finalScore<=8.9 and the error code appears in reasons. It is impossible for
  // publicationReady=true while validate() holds an error.
  function finalQaVerdict(law, opts) {
    opts = opts || {};
    const documentMode = opts.documentMode || 'excerpt';
    const gate = publicationGate(law, opts);
    let issues = [];
    try { var vres = validate(law, null, { officialConsolidated: !!opts.officialConsolidated, documentMode: documentMode }); issues = (vres && vres.issues) ? vres.issues : []; } catch (_) { issues = []; }
    const errors = issues.filter(function (i) { return i.severity === 'error'; });
    const warnings = issues.filter(function (i) { return i.severity === 'warning'; });
    const validateErrors = errors.length;
    const validateWarnings = warnings.length;
    const cspErrors = (opts.cspFlags ? Object.keys(opts.cspFlags).filter(function (k) { return opts.cspFlags[k] === true; }).length : (opts.cspErrors || 0));
    const offlineReady = (opts.vendorStatus ? !!opts.vendorStatus.offlineReady : (opts.offlineReady != null ? !!opts.offlineReady : null));
    // merge reasons (dedup by code)
    const reasons = gate.reasons.slice();
    const seenCodes = {}; reasons.forEach(function (r) { seenCodes[r.code] = true; });
    errors.forEach(function (e) { if (!seenCodes[e.code]) { reasons.push({ code: e.code, severity: 'error', detail: e.message + (e.where ? ' (член ' + e.where + ')' : '') }); seenCodes[e.code] = true; } });
    // full-law mode: a missing final provision is a real defect — it must not be
    // silently ignored; it caps the score below the publication threshold.
    const missingFinalProvision = (documentMode === 'full-law') && warnings.some(function (w) { return w.code === 'missing_final_provision'; });
    if (missingFinalProvision && !seenCodes['missing_final_provision']) { reasons.push({ code: 'missing_final_provision', severity: 'warning', detail: 'Цел закон без завршна одредба.' }); seenCodes['missing_final_provision'] = true; }
    // v10.0.8 legal-resolution data (no auto-resolution of duplicates/refs).
    const duplicateResolution = manualDuplicateResolution(law);
    const referenceResolutions = referenceResolver(law);
    const typographyLeakLocations = typographyLeakLocator(law);
    const danglingReferences = referenceResolutions.filter(function (r) { return r.code === 'dangling_reference'; }).length;
    // v10.0.9 residual OCR / hyphenation gate.
    const residualOcrList = scanResidualOcrArtifacts(law);
    const residualOcrArtifacts = residualOcrList.filter(function (x) { return !x.autoFixed; }).length;
    if (residualOcrArtifacts > 0 && !seenCodes['residual_ocr_artifact_needs_review']) { reasons.push({ code: 'residual_ocr_artifact_needs_review', severity: 'warning', detail: residualOcrArtifacts + ' резидуален OCR/hyphenation артефакт(и) — потребна рачна проверка.' }); seenCodes['residual_ocr_artifact_needs_review'] = true; }
    if (law.titleNeedsReview && !seenCodes['incomplete_law_title'] && !seenCodes['law_title_needs_review']) { reasons.push({ code: 'incomplete_law_title', severity: 'warning', detail: 'Насловот изгледа скратен/нецелосен — потребна проверка.' }); seenCodes['incomplete_law_title'] = true; }

    // ── v10.0.9 SPLIT READINESS ──
    const hasDuplicateUnresolved = duplicateResolution.some(function (d) { return !d.resolved; });
    const contentClean = (gate.duplicateArticles === 0) && !hasDuplicateUnresolved
      && (gate.footerLeaks === 0) && (gate.transitionalLeaks === 0) && (gate.constitutionalDecisionLeaks === 0)
      && (gate.sourceFootnoteLeaks === 0) && (validateErrors === 0) && (gate.spacesBeforePunctuation === 0)
      && (gate.latinHomoglyphsNeedsReview === 0) && (danglingReferences === 0) && (law.titleNeedsReview === false)
      && (residualOcrArtifacts === 0) && !missingFinalProvision;
    const contentPublicationReady = !!contentClean;
    const environmentReady = (offlineReady === true) || (gate.processingMode !== 'offline' && offlineReady !== false);
    const finalPublicationReady = contentPublicationReady && environmentReady;

    // ── score caps ──
    let finalScore = gate.finalScore;
    if (validateErrors > 0) finalScore = Math.min(finalScore, 8.9);
    if (cspErrors > 0) finalScore = Math.min(finalScore, 8.9);
    if (missingFinalProvision) finalScore = Math.min(finalScore, 9.2);
    if (hasDuplicateUnresolved) finalScore = Math.min(finalScore, 8.9);
    if (residualOcrArtifacts > 0) finalScore = Math.min(finalScore, 8.9);
    if (!contentPublicationReady) finalScore = Math.min(finalScore, 8.9);
    else if (!environmentReady) finalScore = Math.min(finalScore, 9.2); // content clean, env not proven
    if (offlineReady === false && !seenCodes['offline_not_ready']) {
      reasons.push({ code: 'offline_not_ready', severity: 'warning', detail: 'Offline vendor дијагностиката не е потврдена за оваа сесија.' }); seenCodes['offline_not_ready'] = true;
    }
    finalScore = +finalScore.toFixed(2);
    const publicationReady = finalPublicationReady;  // back-compat

    // ── environment detail (spec #6): WHY offlineReady is false ──
    const vs = opts.vendorStatus || {};
    const environmentDetail = {
      processingMode: gate.processingMode,
      offlineReady: offlineReady,
      pdfjs: vs.pdfjs != null ? !!vs.pdfjs : null,
      mammoth: vs.mammoth != null ? !!vs.mammoth : null,
      jszip: vs.jszip != null ? !!vs.jszip : null,
      pdfWorkerLocal: vs.pdfWorkerLocal != null ? !!vs.pdfWorkerLocal : null,
      openedFromTempArchive: opts.openedFromTempArchive != null ? !!opts.openedFromTempArchive : null,
      diagnosticsExecuted: opts.diagnosticsExecuted != null ? !!opts.diagnosticsExecuted : (vs.offlineReady != null),
      missing: (vs.missing || [])
    };
    // ── message: technical vs legal (spec #4) ──
    const contentDefect = !contentPublicationReady;
    let readinessMessage;
    if (finalPublicationReady) readinessMessage = null;
    else if (contentPublicationReady && !environmentReady) readinessMessage = 'Содржината е структурно спремна, но export не е финален затоа што offline/vendor средината не е потврдена. Потребна техничка проверка на offline инсталацијата.';
    else readinessMessage = 'Содржината не е публикациски спремна — потребна правна/техничка проверка.';
    return {
      toolVersion: '10.4.0',
      version: '10.4.0',
      documentMode: documentMode,
      generatedAt: gate.generatedAt,
      processingMode: gate.processingMode,
      publicationReady: publicationReady,
      publicationStatus: publicationReady ? 'publication_ready' : 'qa_blocked',
      contentPublicationReady: contentPublicationReady,
      environmentReady: environmentReady,
      finalPublicationReady: finalPublicationReady,
      finalStatus: finalPublicationReady ? 'final_publication_ready' : (contentPublicationReady ? 'content_ready_env_pending' : 'content_blocked'),
      readinessMessage: readinessMessage,
      environmentDetail: environmentDetail,
      residualOcrArtifacts: residualOcrArtifacts,
      residualOcrList: residualOcrList,
      finalScore: finalScore,
      validatorScore: finalScore,
      structuralScore: gate.structuralScore,
      typographyScore: gate.typographyScore,
      ocrFidelityScore: gate.ocrFidelityScore,
      layoutScore: gate.layoutScore,
      exportScore: gate.exportScore,
      validateErrors: validateErrors,
      validateWarnings: validateWarnings,
      activeArticles: gate.activeArticles,
      uniqueArticles: gate.uniqueArticleNumbers,
      duplicateArticles: gate.duplicateArticles,
      footerLeaks: gate.footerLeaks,
      transitionalLeaks: gate.transitionalLeaks,
      constitutionalLeaks: gate.constitutionalDecisionLeaks,
      sourceFootnoteLeaks: gate.sourceFootnoteLeaks,
      latinHomoglyphs: gate.latinHomoglyphsInBody,
      latinHomoglyphsNeedsReview: gate.latinHomoglyphsNeedsReview,
      typographySpacingLeaks: gate.spacesBeforePunctuation,
      unlabeledContinuationPages: gate.unlabeledContinuationPages,
      renderReproducibility: gate.renderReproducibility,
      cspErrors: cspErrors,
      offlineReady: offlineReady,
      lawTitle: law.title,
      lawTitleNeedsReview: !!law.titleNeedsReview,
      danglingReferences: danglingReferences,
      duplicateResolution: duplicateResolution,
      referenceResolutions: referenceResolutions,
      typographyLeakLocations: typographyLeakLocations,
      reasons: reasons,
      validatorIssues: issues,
      appendixCounts: gate.appendixCounts,
      warning: readinessMessage
    };
  }
  // restart after Член 100+, a suffix article 252-а, three amending-act
  // transitional blocks and one constitutional-court decision) so the gate can
  // be asserted deterministically inside the tool. Official law texts are
  // excluded from copyright (чл.10 ЗАКСП), so embedding is permitted.
  const GOLDEN_SOPSTVENOST_TEXT = [
      "ЗАКОН",
      "ЗА СОПСТВЕНОСТ И ДРУГИ СТВАРНИ ПРАВА",
      "Службен весник на РМ\" бр.18/01",
      "Редакциски пречистен текст1",
      "ОСНОВНИ ОДРЕДБИ",
      "Член 1",
      "Со овој закон се уредуваат правото на сопственост и другите стварни права во согласност со Уставот.",
      "Член 2",
      "Право на сопственост можат да стекнуваат сите домашни и странски физички и правни лица, вклучувајќи ја и државата.",
      "Член 3",
      "Сопственоста создава права и обврски и треба да служи за добро на сопственикот и на заедницата.",
      "Член 4",
      "На ствар на која постои право на сопственост можат да се засноваат ограничени стварни права.",
      "Член 5",
      "Правото на сопственост и другите стварни права се остваруваат врз основа на слободна диспозиција.",
      "Член 6",
      "Стварните права се апсолутни права кои дејствуваат спрема сите.",
      "Член 7",
      "Стекнувањето, заштитата и престанокот на правото на сопственост се уредуваат со закон. 1 Редакциски пречистениот текст на Законот за сопственост и други стварни права го опфаќа: основниот текст на Законот, објавен во \"Службен весник на РМ\" бр.18/01, Одлуката на Уставниот суд на РМ У.бр.173/07, како и трите измени.",
      "Службен весник на Република Македонија Редакциски пречистени текстови",
      "8 од 22",
      "ДЕЛ ПРВИ",
      "ПРАВО НА СОПСТВЕНОСТ",
      "Член 101",
      "Сопственикот има право да ја држи стварта, да ја употребува и да располага со неа.",
      "Член 150",
      "Етажна сопственост е сопственост на посебен дел од зграда.",
      "Член 200",
      "Владението се штити од самовласно нарушување.",
      "Службен весник на Република Северна Македонија Редакциски пречистени текстови",
      "15 од 22",
      "Член 251",
      "Странски физички и правни лица можат со правни дела да го пренесат правото на сопственост.",
      "Член 252",
      "Во однос на другите стварни права на странците соодветно се применуваат одредбите од овој закон.",
      "Член 252-а",
      "Агенцијата за катастар е должна во рок од пет дена податоците да ги достави до Министерството за финансии.",
      "Член 257",
      "Со денот на отпочнување на примената на овој закон престануваат да важат претходните прописи.",
      "Член 258",
      "До донесувањето на подзаконскиот акт од член 136 став 4, работите ќе ги вршат надлежните органи.",
      "Член 259",
      "Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија\", а почнува да се применува по истекот на шест месеци.",
      "1 Редакциски пречистениот текст на Законот за сопственост и други стварни права ги опфаќа основниот текст и сите измени и дополнувања до бр.35/10.",
      "ПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ ОД ЗАКОНОТ ЗА ИЗМЕНУВАЊЕ И ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА СОПСТВЕНОСТ И ДРУГИ СТВАРНИ ПРАВА",
      "(\"Службен весник на РМ\" бр.139/09)",
      "Член 1",
      "Подзаконскиот пропис чие донесување е утврдено со овој закон ќе се донесе во рок од 60 дена.",
      "Член 2",
      "Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија\".",
      "ЗАВРШНА ОДРЕДБА ОД ЗАКОНОТ ЗА ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА СОПСТВЕНОСТ И ДРУГИ СТВАРНИ ПРАВА",
      "(\"Службен весник на РМ\" бр.35/10)",
      "Член 4",
      "Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија\".",
      "ОДРЕДБИ ОД ЗАКОНОТ ЗА ИЗМЕНУВАЊЕ И ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА СОПСТВЕНОСТ И ДРУГИ СТВАРНИ ПРАВА",
      "(\"Службен весник на РМ\" бр.92/2008)",
      "Член 3",
      "Членот 6 од Законот за изменување и дополнување на Законот за сопственост („Службен весник на РМ\" бр. 92/2008) се брише.",
      "Член 6",
      "Подзаконскиот пропис ќе се донесе во рок од 60 дена од денот на влегувањето во сила.",
      "Член 7",
      "Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Македонија\".",
      "СО ОДЛУКА на Уставниот суд на Република Македонија У.бр.173/07 (\"Службен весник на РМ\" бр.31/08 од 05.03.2008)",
      "1. СЕ УКИНУВААТ: – член 101 став 1 во делот „односно на деловните простории\" од Законот за сопственост и други стварни права.",
      "2. Оваа одлука произведува правно дејство од денот на објавувањето во „Службен весник на Република Македонија."
  ].join("\n");
  // v10.0.5: compact mirror (fast dev test) — now asserts via finalQaVerdict.
  function compactGoldenSopstvenost() {
    const split = normalizeOfficialConsolidated(GOLDEN_SOPSTVENOST_TEXT);
    const law = parseBaseLaw(split.baseText);
    law.appendices = split.appendices;
    const gate = finalQaVerdict(law, { appendices: split.appendices, now: new Date(0), offlineReady: true });
    const recs = buildArticleRecords(law);
    const activeNums = recs.filter(function (r) { return r.status !== "deleted"; }).map(function (r) { return r.article_number; });
    const lastArticle = activeNums.length ? activeNums[activeNums.length - 1] : null;
    const checks = [
      { name: "activeArticles == 16 (компактен мирор)", pass: gate.activeArticles === 16, got: gate.activeArticles },
      { name: "duplicateArticles == 0", pass: gate.duplicateArticles === 0, got: gate.duplicateArticles },
      { name: "footerLeaks == 0", pass: gate.footerLeaks === 0, got: gate.footerLeaks },
      { name: "transitionalLeaks == 0", pass: gate.transitionalLeaks === 0, got: gate.transitionalLeaks },
      { name: "constitutionalLeaks == 0", pass: gate.constitutionalLeaks === 0, got: gate.constitutionalLeaks },
      { name: "sourceFootnoteLeaks == 0", pass: gate.sourceFootnoteLeaks === 0, got: gate.sourceFootnoteLeaks },
      { name: "последен член == 259", pass: lastArticle === "259", got: lastArticle },
      { name: "член 252-а присутен", pass: activeNums.indexOf("252-а") >= 0, got: activeNums.indexOf("252-а") >= 0 },
      { name: "validateErrors == 0", pass: gate.validateErrors === 0, got: gate.validateErrors },
      { name: "spacesBeforePunctuation == 0", pass: gate.typographySpacingLeaks === 0, got: gate.typographySpacingLeaks },
      { name: "latinHomoglyphs == 0", pass: gate.latinHomoglyphs === 0, got: gate.latinHomoglyphs },
      { name: "finalScore >= 9.5", pass: gate.finalScore >= 9.5, got: gate.finalScore },
      { name: "publicationReady == true", pass: gate.publicationReady === true, got: gate.publicationReady }
    ];
    const passed = checks.every(function (c) { return c.pass; });
    return { passed: passed, checks: checks, gate: gate, activeArticles: gate.activeArticles, lastArticle: lastArticle, appendices: split.appendices };
  }
  // v10.0.5: FULL golden test — runs on the complete consolidated text passed in
  // (the in-browser button uses the compact mirror; Node/test harness passes the
  // whole golden_sopstvenost.txt). Asserts the real 260-record invariants.
  function fullGoldenSopstvenost(fullText) {
    if (!fullText || !String(fullText).trim()) return { passed: false, error: 'missing_full_text', checks: [] };
    const split = normalizeOfficialConsolidated(fullText);
    const law = parseBaseLaw(split.baseText);
    law.appendices = split.appendices;
    const gate = finalQaVerdict(law, { appendices: split.appendices, documentMode: 'full-law', officialConsolidated: true, offlineReady: true });
    const recs = buildArticleRecords(law);
    const activeNums = recs.filter(function (r) { return r.status !== "deleted"; }).map(function (r) { return r.article_number; });
    const lastArticle = activeNums.length ? activeNums[activeNums.length - 1] : null;
    const uniq = {}; activeNums.forEach(function (n) { uniq[n] = 1; });
    const checks = [
      { name: "activeArticles == 260", pass: gate.activeArticles === 260, got: gate.activeArticles },
      { name: "uniqueArticles == 260", pass: Object.keys(uniq).length === 260, got: Object.keys(uniq).length },
      { name: "duplicateArticles == 0", pass: gate.duplicateArticles === 0, got: gate.duplicateArticles },
      { name: "lastArticle == 259", pass: lastArticle === "259", got: lastArticle },
      { name: "contains252a == true", pass: activeNums.indexOf("252-а") >= 0, got: activeNums.indexOf("252-а") >= 0 },
      { name: "footerLeaks == 0", pass: gate.footerLeaks === 0, got: gate.footerLeaks },
      { name: "transitionalLeaks == 0", pass: gate.transitionalLeaks === 0, got: gate.transitionalLeaks },
      { name: "constitutionalDecisionLeaks == 0", pass: gate.constitutionalLeaks === 0, got: gate.constitutionalLeaks },
      { name: "sourceFootnoteLeaks == 0", pass: gate.sourceFootnoteLeaks === 0, got: gate.sourceFootnoteLeaks },
      { name: "typographySpacingLeaks == 0", pass: gate.typographySpacingLeaks === 0, got: gate.typographySpacingLeaks },
      { name: "latinHomoglyphs == 0", pass: gate.latinHomoglyphs === 0, got: gate.latinHomoglyphs },
      { name: "validateErrors == 0", pass: gate.validateErrors === 0, got: gate.validateErrors },
      { name: "finalScore >= 9.5", pass: gate.finalScore >= 9.5, got: gate.finalScore },
      { name: "publicationReady == true", pass: gate.publicationReady === true, got: gate.publicationReady }
    ];
    const passed = checks.every(function (c) { return c.pass; });
    return { passed: passed, checks: checks, gate: gate, activeArticles: gate.activeArticles, lastArticle: lastArticle, appendices: { transitionalProvisions: split.appendices.transitionalProvisions.length, constitutionalCourtDecisions: split.appendices.constitutionalCourtDecisions.length, sourceNotes: split.appendices.sourceNotes.length } };
  }
  // Back-compat alias (the in-app golden button calls goldenSopstvenost()).
  function goldenSopstvenost() { return compactGoldenSopstvenost(); }


  // Regression assertion helpers (spec #8) — operate on a parsed law.
  function regressionAsserts(law) {
    if (!law || !law.articles) {
      return { ok: false, code: 'missing_law_for_regression', severity: 'error' };
    }
    const recs = buildArticleRecords(law);
    const byNum = {}; recs.forEach(function (r) { byNum[r.article_number] = r; });
    const delNums = (law.deletedArticles || []).map(function (d) { return d.number; });
    return {
      assertNoStructuralLeak: function (n) { const r = byNum[n]; return !!r && r.qa_flags.indexOf('structural_heading_leak') < 0 && r.qa_flags.indexOf('numbered_section_heading_leak') < 0 && r.qa_flags.indexOf('next_article_heading_leak') < 0; },
      assertStructuralPath: function (n, expected) { const r = byNum[n]; return !!r && JSON.stringify(r.structural_path) === JSON.stringify(expected); },
      assertStructuralPathContains: function (n, needle) { const r = byNum[n]; return !!r && r.structural_path.some(function (s) { return s.indexOf(needle) >= 0; }); },
      assertNoDeletedNoteInActiveArticle: function (n) { const r = byNum[n]; return !!r && (r.status === 'deleted' || r.qa_flags.indexOf('deleted_note_leak_in_active_article') < 0); },
      assertNoLatinContamination: function (n) { const r = byNum[n]; return !!r && r.qa_flags.indexOf('latin_contamination') < 0; },
      assertDeletedArticleExists: function (n) { return delNums.indexOf(n) >= 0; },
      assertArticleIsActive: function (n) { const r = byNum[n]; return !!r && r.status !== 'deleted'; },
      assertDeletedArticleDoesNotExistAs: function (n) { return delNums.indexOf(n) < 0; },
      assertPublicationBlockedWhenNeedsLegalVerification: function () { const pr = publicationReadiness(law); return pr.needsLegalVerification ? pr.publicationReady === false : true; }
    };
  }

  // Regression battery (spec #8): assert key articles parse with monotonic
  // ставови, no heading leak, no false title, and report duplicates.
  function regressionBattery(law, numbers) {
    if (!law || !law.articles) {
      return { ok: false, code: 'missing_law_for_regression', severity: 'error' };
    }
    const recs = buildArticleRecords(law);
    const byNum = {}; recs.forEach(function (r) { byNum[r.article_number] = r; });
    return (numbers || []).map(function (n) {
      const r = byNum[n];
      if (!r) return { article: n, present: false, ok: false, note: 'не е пронајден' };
      const nums = r.paragraphs.filter(function (p) { return p.number != null; }).map(function (p) { return parseInt(p.number, 10); });
      let mono = true; for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) mono = false;
      const ok = r.status === 'deleted' ? true : (mono && r.qa_flags.length === 0);
      return { article: n, present: true, status: r.status, paragraphs: nums.length, monotonic: mono, qa_flags: r.qa_flags, duplicate: r.duplicate_in_source, ok: ok };
    });
  }

  // Normalise soft (PDF-wrap) line breaks into running sentences (spec #6).
  function normalizeSoftBreaks(t) {
    return String(t || '').replace(/\s*\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  }

  // Structural-hierarchy classifier for structural_path (spec #3): ONLY
  // Дел / Глава / Оддел / Отсек / Секција — never an article title.
  const STRUCT_LEVEL = { 'дел': 0, 'глава': 1, 'оддел': 2, 'отсек': 3, 'секција': 4, 'поднаслов': 5 };
  function structTypeOf(s) {
    const tx = (s && s.text ? s.text : '').trim();
    const ty = (s && s.type ? s.type : '').toLowerCase();
    if (ty && STRUCT_LEVEL[ty] != null) return ty;
    if (/^дел\b/i.test(tx) || /^[IVXLC]+\.?\s+ДЕЛ/i.test(tx)) return 'дел';
    if (/^глава\b/i.test(tx)) return 'глава';
    if (/^оддел\b/i.test(tx)) return 'оддел';
    if (/^отсек\b/i.test(tx)) return 'отсек';
    if (/^\d{1,2}\.\s+[А-ШЃЅЈЉЊЌЏ]/.test(tx)) return 'поднаслов';
    return null; // all-caps descriptive section headers are kept as 'секција' only if typed so
  }

  // OCR Latin-in-Cyrillic homoglyph handling (spec #7). Detect a Latin letter
  // adjacent to a Cyrillic letter inside a word, and correct ONLY such letters.
  const LATIN_HOMOGLYPH = { 'A': 'А', 'B': 'В', 'E': 'Е', 'K': 'К', 'M': 'М', 'H': 'Н', 'O': 'О', 'P': 'Р', 'C': 'С', 'T': 'Т', 'X': 'Х', 'a': 'а', 'e': 'е', 'o': 'о', 'p': 'р', 'c': 'с', 'y': 'у', 'x': 'х' };
  const RE_LATIN_IN_CYR = /(?:[а-шѓѕјљњќџА-ШЃЅЈЉЊЌЏ][ABEKMHOPCTXaeopcyx])|(?:[ABEKMHOPCTXaeopcyx][а-шѓѕјљњќџА-ШЃЅЈЉЊЌЏ])/;
  const RE_CYR = /[а-шѓѕјљњќџА-ШЃЅЈЉЊЌЏ]/;
  function normalizeMixedCyrillicLatin(text) {
    const fixes = [];
    const fixed = String(text || '').replace(/[^\s]+/g, function (word) {
      if (!RE_CYR.test(word)) return word;                 // pure-Latin token (e.g. "EU") left alone
      if (!/[ABEKMHOPCTXaeopcyx]/.test(word)) return word; // no Latin homoglyph present
      let changed = false;
      const nw = word.replace(/[ABEKMHOPCTXaeopcyx]/g, function (ch) { changed = true; return LATIN_HOMOGLYPH[ch] || ch; });
      if (changed && nw !== word) fixes.push({ from: word, to: nw });
      return nw;
    });
    return { text: fixed, fixes: fixes };
  }

  // ── v10.0.4 SAFE CYRILLIC HOMOGLYPH CLEANER (Publication Quality) ────────
  // Auto-fixes WHOLE Latin tokens that are unambiguous OCR renderings of common
  // Macedonian Cyrillic function words, ONLY in a Cyrillic context. Never touches
  // protected Latin (EU, OECD, URLs, emails, brands, intentional Latin acronyms).
  // Every fix is audited; confidence < 0.90 → no change + latin_homoglyph_needs_review.
  const RE_CYR_WORD = /[а-шѓѕјљњќџА-ШЃЅЈЉЊЌЏ]/;
  const RE_PROTECTED_LATIN = /^[A-Za-z][A-Za-z.&'’-]*$/; // pure-Latin token
  // map of safe whole-token OCR fixes → {to, conf, needsCyrNext|needsCyrCtx|sentenceStart}
  const HOMOGLYPH_WORD_MAP = {
    'Co': { to: 'Со', conf: 0.95, rule: 'sentenceStartOrPreCyr' },
    'Bo': { to: 'Во', conf: 0.95, rule: 'preCyr' },
    'He': { to: 'Не', conf: 0.95, rule: 'preCyr' },
    'co': { to: 'со', conf: 0.93, rule: 'cyrContext' },
    'ce': { to: 'се', conf: 0.93, rule: 'cyrContext' },
    'a':  { to: 'а', conf: 0.92, rule: 'standaloneConj' },
    'o':  { to: 'о', conf: 0.90, rule: 'standaloneOrSplit' }
  };
  function isProtectedLatinToken(core) {
    if (!core) return true;
    if (/[@/]/.test(core)) return true;                       // email / URL fragment
    if (/^(https?:|www\.)/i.test(core)) return true;          // URL
    if (/\d/.test(core)) return true;                         // codes, version numbers
    if (/^[A-Z]{2,}$/.test(core)) return true;                // ALL-CAPS acronym (EU, OECD)
    if (core.length >= 4 && /^[A-Za-z]+$/.test(core)) return true; // longer Latin word/brand
    return false;
  }
  function normalizeCyrillicHomoglyphsSafe(text, context) {
    context = context || {};
    const allFixes = [], allFlags = [];
    let cur = String(text || '');
    // Iterate: a fix can unlock an adjacent token (e.g. "a ce" → after "ce"→"се",
    // the conjunction "a" → "а"). Stable within a few passes.
    for (let pass = 0; pass < 4; pass++) {
      const r = _homoglyphPass(cur, context);
      cur = r.text;
      r.fixes.forEach(function (f) { allFixes.push(f); });
      r.flags.forEach(function (f) { if (allFlags.indexOf(f) < 0) allFlags.push(f); });
      if (r.fixes.length === 0) break;
    }
    return { text: cur, fixes: allFixes, flags: allFlags };
  }
  function _homoglyphPass(text, context) {
    context = context || {};
    const fixes = [], flags = [];
    const hasCyrContext = RE_CYR_WORD.test(String(text || ''));
    if (!String(text || '').trim()) return { text: String(text || ''), fixes: fixes, flags: flags };
    // split into tokens with their surrounding whitespace preserved
    const parts = String(text).split(/(\s+)/); // even idx = tokens, odd = spaces
    const tokenIdx = [];
    for (let i = 0; i < parts.length; i += 2) if (parts[i] !== '') tokenIdx.push(i);
    const coreOf = s => (s.match(/^[\(\[„«"'.,;:]*([^\s\)\]”»"'.,;:]*)/) || [, ''])[1];
    const cyr = s => RE_CYR_WORD.test(s || '');
    for (let k = 0; k < tokenIdx.length; k++) {
      const idx = tokenIdx[k];
      const tok = parts[idx];
      const core = coreOf(tok);
      if (!core || !RE_PROTECTED_LATIN.test(core)) continue;   // not a bare Latin token
      const map = HOMOGLYPH_WORD_MAP[core];
      if (!map) {
        // a bare Latin token that is NOT a known safe fix: protect or flag.
        if (cyr(text) && !isProtectedLatinToken(core) && core.length <= 3 && /[a-z]/i.test(core)) {
          // short ambiguous Latin token amid Cyrillic — flag for human review, do not change.
          flags.push('latin_homoglyph_needs_review');
        }
        continue;
      }
      if (isProtectedLatinToken(core)) continue;               // never touch EU/OECD/URL/...
      const prevCore = k > 0 ? coreOf(parts[tokenIdx[k - 1]]) : '';
      const nextCore = k < tokenIdx.length - 1 ? coreOf(parts[tokenIdx[k + 1]]) : '';
      const atSentenceStart = (k === 0) || /[.!?…]$/.test(parts[tokenIdx[k - 1]]);
      let allow = false;
      switch (map.rule) {
        case 'sentenceStartOrPreCyr': allow = atSentenceStart || cyr(nextCore); break;
        case 'preCyr': allow = cyr(nextCore); break;
        case 'cyrContext': allow = hasCyrContext && (cyr(nextCore) || cyr(prevCore)); break;
        case 'standaloneConj': allow = cyr(prevCore) && cyr(nextCore); break;
        case 'standaloneOrSplit': allow = (cyr(prevCore) && cyr(nextCore)); break;
      }
      if (allow && map.conf >= 0.90) {
        const fixedTok = tok.replace(core, map.to);
        fixes.push({ type: 'homoglyph_fix', article: context.article || null, from: core, to: map.to, confidence: map.conf, reason: 'latin_homoglyph_in_cyrillic_sentence' });
        parts[idx] = fixedTok;
      } else if (allow && map.conf < 0.90) {
        flags.push('latin_homoglyph_needs_review');
      }
    }
    return { text: parts.join(''), fixes: fixes, flags: flags };
  }

  // ── v10.0.4 SAFE TYPOGRAPHIC NORMALIZER ─────────────────────────────────
  // Fixes spacing/punctuation typography WITHOUT changing legal content.
  function normalizeTypography(text) {
    let t = String(text || '');
    const fixes = { spaceBeforePunct: 0, openBracketSpace: 0, closeBracketSpace: 0, openQuoteSpace: 0, closeQuoteSpace: 0, multiSpace: 0 };
    t = t.replace(/[ \t]+([,.;:!?…])/g, function (m, p) { fixes.spaceBeforePunct++; return p; });
    t = t.replace(/([(\[„«]) +/g, function (m, p) { fixes.openBracketSpace++; return p; });
    t = t.replace(/ +([)\]”»])/g, function (m, p) { fixes.closeBracketSpace++; return p; });
    // collapse runs of spaces to one (single line; preserves newlines)
    t = t.replace(/ {2,}/g, function () { fixes.multiSpace++; return ' '; });
    const total = fixes.spaceBeforePunct + fixes.openBracketSpace + fixes.closeBracketSpace + fixes.multiSpace;
    return { text: t, fixes: fixes, fixCount: total };
  }

  // Count residual typography defects (spec #2 QA gate) and body homoglyphs.
  function typographyScan(law) {
    let spacesBeforePunctuation = 0;
    (law.articles || []).forEach(function (a) {
      if (a.status === 'deleted') return;
      const body = (a.paragraphs || []).map(function (p) { return p.text + ' ' + (p.alineas || []).map(function (x) { return x.text; }).join(' '); }).join(' ');
      spacesBeforePunctuation += (body.match(/\s+[,.;:!?]/g) || []).length;
    });
    return { spacesBeforePunctuation: spacesBeforePunctuation };
  }
  // Count UNFLAGGED Latin homoglyph tokens still sitting in active bodies.
  function homoglyphScan(law) {
    let latinHomoglyphsInBody = 0, flagged = 0;
    (law.articles || []).forEach(function (a) {
      if (a.status === 'deleted') return;
      const body = (a.paragraphs || []).map(function (p) { return p.text + ' ' + (p.alineas || []).map(function (x) { return x.text; }).join(' '); }).join(' ');
      if (!RE_CYR_WORD.test(body)) return;
      // bare short Latin tokens amid Cyrillic that are NOT protected
      (body.match(/(?:^|\s)([A-Za-z]{1,3})(?=\s|[.,;:!?)]|$)/g) || []).forEach(function (m) {
        const core = m.trim();
        if (!isProtectedLatinToken(core)) { latinHomoglyphsInBody++; }
      });
    });
    return { latinHomoglyphsInBody: latinHomoglyphsInBody, flagged: flagged };
  }

  // Per-article QA flags (spec #7) computed structurally.
  function computeQaFlags(a) {
    const flags = [];
    if (normalizeArticleNumberEx(a.number).warnings.indexOf('article_number_homoglyph_needs_review') >= 0) flags.push('article_number_homoglyph_needs_review');
    const nums = a.paragraphs.filter(function (p) { return p.number != null; }).map(function (p) { return parseInt(p.number, 10); });
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] <= nums[i - 1]) { flags.push('paragraph_number_regression'); break; }
      if (nums[i] > nums[i - 1] + 1) { flags.push('paragraph_number_regression'); break; }
    }
    const bodyStr = a.paragraphs.map(function (p) { return p.text; }).join(' ');
    if (/(^|\s)(Глава|ГЛАВА|ДЕЛ|Оддел|Отсек)\s+(прв|втор|трет|четврт|петт|шест|седм|осм|девет|десет|единаес|дванаес|тринаес|четрнаес|петнаес|шеснаес|седумнаес|осумнаес|деветнаес|дваесет|триесет|четириесет|педесет|[IVXLC]+)/.test(bodyStr)) flags.push('structural_heading_leak');
    if (/(^|\s)(ПРЕОДНИ|ЗАВРШНИ)\b/.test(bodyStr)) { if (flags.indexOf('structural_heading_leak') < 0) flags.push('structural_heading_leak'); }
    // numbered section heading glued to the very end of the body (spec #3/#7)
    if (RE_INLINE_TAIL.test(bodyStr.replace(/\s+$/, '')) && !/\b(член|членот|став|ставот|точка|алинеја)\s+\d{1,2}\.\s*$/i.test(bodyStr)) flags.push('numbered_section_heading_leak');
    if (/\bЧлен\s+\d+\b/.test(bodyStr)) flags.push('next_article_heading_leak');
    if (RE_LATIN_IN_CYR.test(bodyStr)) flags.push('latin_contamination');
    // v10.0.4: a bare short Latin token amid Cyrillic that the safe cleaner did
    // NOT auto-fix (and is not a protected acronym/URL/email) → needs human review.
    if (RE_CYR_WORD.test(bodyStr)) {
      const bare = bodyStr.match(/(?:^|\s)([A-Za-z]{1,3})(?=\s|[.,;:!?)]|$)/g) || [];
      const hasUnprotected = bare.some(function (m) { return !isProtectedLatinToken(m.trim()); });
      if (hasUnprotected) flags.push('latin_homoglyph_needs_review');
    }
    // ── v10.0.3 structural-leak blockers (spec #3,#4,#5,#6) ──────────────────
    // A footer line from Службен весник must never survive in an active body.
    if (/Службен\s+весник\s+на\s+Република(?:\s+Северна)?\s+Македонија\s+Редакциски\s+пречистени\s+текстови/i.test(bodyStr)
        || /(?:^|\s)Редакциски\s+пречистени\s+текстови(?:\s|$)/i.test(bodyStr)
        || /(?:^|\s)\d{1,3}\s+од\s+\d{1,3}(?:\s|$)/.test(bodyStr) && /Службен\s+весник/i.test(bodyStr)) {
      flags.push('gazette_footer_leak');
    }
    // A constitutional-court decision must never stay inside an article.
    if (/СО\s+ОДЛУКА\s+на\s+Уставниот\s+суд/i.test(bodyStr)) flags.push('constitutional_decision_leak');
    // The source footnote ("Редакциски пречистениот текст на Закон…") must move
    // to metadata.sourceNote / appendices.sourceNotes, never live in a body.
    if (/Редакциски\s+пречистениот\s+текст\s+на\s+Закон/i.test(bodyStr)) flags.push('source_footnote_leak');
    // A transitional/final-provisions HEADER of an amending act inside a body.
    if (/(?:ПРЕОДНИ\s+И\s+ЗАВРШНИ|ПРЕОДНИ|ЗАВРШНИ)\s+ОДРЕДБ[АИ]\s+ОД\s+ЗАКОН|ЗАВРШНА\s+ОДРЕДБА\s+ОД\s+ЗАКОН/i.test(bodyStr)) flags.push('transitional_provision_leak');
    if (/(Насловот\s+на\s+членот\s+\d+[\s\S]{0,80}(избришан|се\s+бриша|укинат))|(Членот\s+\d+(?:[-–—‐−]\s*[а-шѓѕјљњќџ])?\s+е\s+(избришан|укинат))|(Членовите\s+[\d,\s и]+\s+се\s+избришани)/i.test(bodyStr) && a.status !== 'deleted') flags.push('deleted_note_leak_in_active_article');
    if (a.title && /^(Тој\s+што|Тој\s+кој|Судот\s+може|Судот\s+ќе|Граѓанин|Странец|Кој\s|Со\s+казната|Со\s+затвор|Со\s+парична|Ако\s)/.test(a.title)) flags.push('title_false_positive');
    // wrong_structural_path_after_heading_leak: if a structural heading still
    // leaked into the body, the article's structural_path cannot be trusted.
    if (flags.indexOf('structural_heading_leak') >= 0 || flags.indexOf('numbered_section_heading_leak') >= 0) flags.push('wrong_structural_path_after_heading_leak');
    // deleted-note integrity (for deleted records): the parsed number must match
    // the number actually named in the note (suffix included).
    if (a.status === 'deleted' && a.sourceNote) {
      const mm = a.sourceNote.match(/членот?\s+(\d+(?:[-–—‐−]\s*[а-шѓѕјљњќџ])?)/i);
      if (mm) {
        const noteNum = mm[1].replace(/\s*[-–—‐−]\s*/, '-');
        if (noteNum !== a.number) {
          flags.push(/[-–—‐−]/.test(noteNum) && !/[-–—‐−]/.test(a.number) ? 'deleted_suffix_article_misparsed' : 'deleted_note_wrong_article_number');
        }
      }
    }
    return flags;
  }

  // Structured, machine-addressable record per article (spec #3) — for a vector
  // store / RAG pipeline and for publication-grade JSON/DOCX.
  function buildArticleRecords(law) {
    const dupCounts = {};
    (law.articles || []).forEach(function (a) { if (a.status !== 'deleted') dupCounts[a.number] = (dupCounts[a.number] || 0) + 1; });
    const occ = {};
    const levels = [null, null, null, null, null]; // дел,глава,оддел,отсек,секција
    return (law.articles || []).map(function (a) {
      // update running hierarchy from this article's structural headings
      (a.precedingStructure || []).forEach(function (s) {
        const ty = structTypeOf(s);
        if (ty != null) { const lv = STRUCT_LEVEL[ty]; levels[lv] = s.text.trim(); for (let k = lv + 1; k < levels.length; k++) levels[k] = null; }
        else if ((s.type || '').toLowerCase() === 'секција') { levels[4] = s.text.trim(); }
      });
      const structural_path = levels.filter(Boolean).slice();
      if (a.status !== 'deleted') occ[a.number] = (occ[a.number] || 0) + 1;
      const article_heading = a.preArticleHeading || a.title || null;
      const paragraphs = (a.paragraphs || []).map(function (p) {
        return {
          number: p.number != null ? String(p.number) : null,
          text: p.text || '',
          text_normalized: normalizeSoftBreaks(p.text),
          points: (p.points || []).map(function (pt) { return { marker: pt.marker, text: normalizeSoftBreaks(pt.text) }; }),
          alineas: (p.alineas || []).map(function (al) { return { marker: al.marker, text: normalizeSoftBreaks(al.text) }; })
        };
      });
      const qa_flags = a.status === 'deleted' ? computeQaFlags(a) : computeQaFlags(a);
      // incomplete_multiline_structural_title: a секција that begins with a lone
      // conjunction ("И …", "ИЛИ …") signals its first wrapped line was lost.
      if (structural_path.some(function (s) { return /^(И|ИЛИ)\s+[А-ШЃЅЈЉЊЌЏ]/.test(s) && isAllCapsCyrillic(s); })) {
        if (qa_flags.indexOf('incomplete_multiline_structural_title') < 0) qa_flags.push('incomplete_multiline_structural_title');
      }
      const isDup = !!dupCounts[a.number] && dupCounts[a.number] > 1;
      if (isDup && qa_flags.indexOf('duplicate_article_needs_verification') < 0) qa_flags.push('duplicate_article_needs_verification');
      const body_text = normalizeSoftBreaks(paragraphs.map(function (p) { return (p.number ? '(' + p.number + ') ' : '') + p.text_normalized
        + (p.points.length ? ' ' + p.points.map(function (pt) { return pt.marker + ') ' + pt.text; }).join(' ') : '')
        + (p.alineas.length ? ' ' + p.alineas.map(function (al) { return (al.marker ? al.marker + ' ' : '') + al.text; }).join(' ') : ''); }).join(' '));
      const heading_prefix = article_heading ? article_heading + ' — Член ' + a.number + '. ' : 'Член ' + a.number + '. ';
      const context_prefix = (structural_path.length ? structural_path.join(' › ') + ' › ' : '') + heading_prefix;
      return {
        article_number: a.number,
        article_heading: article_heading,
        structural_path: structural_path,
        status: a.status || 'original',
        possible_title: !!a.possibleTitle,
        duplicate_in_source: isDup,
        source_occurrence: (dupCounts[a.number] > 1) ? (occ[a.number] || null) : 1,
        duplicate_resolution_required: isDup ? true : undefined,
        legal_verification_note: isDup ? 'Потребна правна проверка со целосниот официјален текст.' : undefined,
        needs_legal_verification: isDup || qa_flags.length > 0,
        paragraphs: paragraphs,
        points: [].concat.apply([], paragraphs.map(function (p) { return p.points; })),
        alineas: [].concat.apply([], paragraphs.map(function (p) { return p.alineas; })),
        source_notes: a.status === 'deleted' && a.sourceNote ? [a.sourceNote] : [],
        deleted_reference_notes: a.status === 'deleted' && a.sourceNote ? [a.sourceNote] : [],
        qa_flags: qa_flags,
        body_text: a.status === 'deleted' ? '' : body_text,            // NEVER structural headings
        full_text_with_heading: a.status === 'deleted' ? (a.sourceNote || '') : (heading_prefix + body_text),
        full_text_with_context: a.status === 'deleted' ? (a.sourceNote || '') : (context_prefix + body_text),
        text_normalized: body_text,
        full_text: articleToText(a)
      };
    });
  }

  /* ----------------------------------------------------------------------
   *  6. ROUND-TRIP FIDELITY — proof that parsing preserved every legal word.
   *     Parse → render → compare against the source token-by-token, anchored
   *     on "Член N" headers so discrepancies localise to a specific article.
   *     Non-substantive furniture (page numbers, running headers/footers,
   *     gazette refs, ЗАКОН/УКАЗ banner) is removed from BOTH sides so it is
   *     never miscounted as lost/added.
   * --------------------------------------------------------------------*/
  function stripFurniture(text) {
    return stripUkaz(text).split('\n').filter(function (raw) {
      const s = raw.trim();
      if (!s) return false;
      if (/^Службен\s+весник/i.test(s)) return false;                          // gazette ref / running header
      if (/^\d+\s+од\s+\d+$/.test(s)) return false;                            // footer "N од M"
      if (/^[-–—]?\s*\d{1,4}\s*[-–—]?$/.test(s) && s.replace(/[-–—\s]/g, '').length <= 4) return false; // page number
      if (/^\d{7,}$/.test(s)) return false;                                    // gazette code
      if (/^(У\s*К\s*А\s*З|З\s*А\s*К\s*О\s*Н)(?:\s|$)/i.test(s)) return false;  // banner word
      if (/^(Бр\.?\s*\d|Претседател|Се\s+прогласува|што\s+Собранието|с\.р\.)/i.test(s)) return false; // УКАЗ residue
      return true;
    }).join('\n');
  }

  function tokenizeFidelity(text) {
    const t = normalizeText(stripFurniture(text));
    return t.match(/[0-9A-Za-zА-Ша-шЃЅЈЉЊЌЏѓѕјљњќџ]+(?:[-–—][0-9A-Za-zА-Ша-шЃЅЈЉЊЌЏѓѕјљњќџ]+)?|[„""»«().,;:!?\/№%]/g) || [];
  }

  // LCS-based token diff → {lost:[from a], added:[from b]}.
  function diffTokens(a, b) {
    const n = a.length, m = b.length;
    if (n === 0 && m === 0) return { lost: [], added: [] };
    const dp = [];
    for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const lost = [], added = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { lost.push(a[i]); i++; }
      else { added.push(b[j]); j++; }
    }
    while (i < n) lost.push(a[i++]);
    while (j < m) added.push(b[j++]);
    return { lost: lost, added: added };
  }

  // Anchor indices where a "Член N" header occurs in a token stream:
  // a token "Член" immediately followed by a number (optionally a -suffix).
  function articleAnchors(tokens) {
    const anchors = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] === 'Член' && /^\d+([-–—][а-шѓѕјљњќџ]+)?$/.test(tokens[i + 1])) {
        anchors.push({ number: normArticleNumber(tokens[i + 1]), idx: i });
      }
    }
    return anchors;
  }

  function verifyFidelity(sourceText, law) {
    const srcTok = tokenizeFidelity(sourceText);
    const renTok = tokenizeFidelity(lawToText(law));
    // GLOBAL multiset integrity — immune to per-article re-anchoring (deletion
    // notes / structural headings legitimately move blocks). This is the honest
    // "no legal word lost" measure; per-article blocks below only localise.
    // Measured from the first "Член" onward so the law's preamble / EU-harmon.
    // footnote (not part of any article body) is not miscounted as lost.
    const ms = function (toks) { const map = Object.create(null); toks.forEach(function (t) { map[t] = (map[t] || 0) + 1; }); return map; };
    const firstChlen = function (toks) { for (let i = 0; i < toks.length - 1; i++) if (toks[i] === 'Член' && /^\d/.test(toks[i + 1])) return i; return 0; };
    const sBody = srcTok.slice(firstChlen(srcTok)), rBody = renTok.slice(firstChlen(renTok));
    const sMap = ms(sBody), rMap = ms(rBody);
    let globalLost = 0, globalAdded = 0;
    Object.keys(sMap).forEach(function (t) { const d = sMap[t] - (rMap[t] || 0); if (d > 0) globalLost += d; });
    Object.keys(rMap).forEach(function (t) { const d = rMap[t] - (sMap[t] || 0); if (d > 0) globalAdded += d; });
    const srcA = articleAnchors(srcTok);
    const renA = articleAnchors(renTok);
    const blocks = [];
    // Preamble block (before the first "Член").
    blocks.push({
      label: 'преамбула',
      a: srcTok.slice(0, srcA.length ? srcA[0].idx : srcTok.length),
      b: renTok.slice(0, renA.length ? renA[0].idx : renTok.length)
    });
    // Per-article blocks: [Член_i .. Член_{i+1}) on both sides, matched by article number.
    const renByNum = {};
    renA.forEach(function (x, k) { renByNum[x.number] = k; });
    for (let k = 0; k < srcA.length; k++) {
      const num = srcA[k].number;
      const sStart = srcA[k].idx, sEnd = k + 1 < srcA.length ? srcA[k + 1].idx : srcTok.length;
      let bTok = [];
      if (renByNum[num] != null) {
        const rk = renByNum[num];
        const rStart = renA[rk].idx, rEnd = rk + 1 < renA.length ? renA[rk + 1].idx : renTok.length;
        bTok = renTok.slice(rStart, rEnd);
      }
      blocks.push({ label: 'Член ' + num, number: num, a: srcTok.slice(sStart, sEnd), b: bTok, missingArticle: renByNum[num] == null });
    }
    // Articles that exist in the render but not the source (should never happen).
    renA.forEach(function (x) {
      if (!srcA.some(function (s) { return s.number === x.number; })) {
        blocks.push({ label: 'Член ' + x.number, number: x.number, a: [], b: [x.number], extraArticle: true });
      }
    });

    const flagged = [];
    let lostTotal = 0, addedTotal = 0, perfect = 0;
    blocks.forEach(function (blk) {
      const d = diffTokens(blk.a, blk.b);
      if (d.lost.length === 0 && d.added.length === 0) { perfect++; return; }
      lostTotal += d.lost.length; addedTotal += d.added.length;
      flagged.push({
        where: blk.label,
        number: blk.number || null,
        lost: d.lost,
        added: d.added,
        missingArticle: !!blk.missingArticle,
        extraArticle: !!blk.extraArticle
      });
    });

    const totalArticles = srcA.length;
    const perfectArticles = totalArticles - flagged.filter(function (f) { return f.number != null; }).length;
    // Headline score uses the GLOBAL multiset (true word-loss), not per-article
    // anchoring which over-flags legitimately relocated headings/notes.
    const totalSrc = sBody.length || 1;
    const globalScore = Math.round((1 - globalLost / totalSrc) * 1000) / 10;
    return {
      sourceArticles: totalArticles,
      renderedArticles: renA.length,
      blocks: blocks.length,
      perfectBlocks: perfect,
      perfectArticles: perfectArticles,
      lostTokens: lostTotal,
      addedTokens: addedTotal,
      globalLostTokens: globalLost,
      globalAddedTokens: globalAdded,
      identical: globalLost === 0 && globalAdded === 0,
      fidelityScore: globalScore,        // % of source words preserved (global)
      perArticleScore: totalArticles ? Math.round((perfectArticles / totalArticles) * 1000) / 10 : 100,
      flagged: flagged
    };
  }

  /* ----------------------------------------------------------------------
   *  6b. CONSOLIDATION FIDELITY — proof that consolidation changed ONLY the
   *      articles the amendments targeted. Every untargeted article must stay
   *      token-identical between the base and the consolidated law; any drift
   *      there is unintended loss and is flagged. Targeted articles are
   *      expected to differ and are reported as expected changes.
   * --------------------------------------------------------------------*/
  function verifyConsolidationFidelity(baseLaw, consolidatedLaw, touched) {
    const touchedSet = {};
    (touched || []).forEach(function (n) { if (n != null) touchedSet[normArticleNumber(n)] = true; });
    const baseMap = {}, conMap = {};
    baseLaw.articles.forEach(function (a) { baseMap[a.number] = a; });
    consolidatedLaw.articles.forEach(function (a) { conMap[a.number] = a; });

    const unexpected = [];   // untargeted articles that changed/disappeared — drift
    const expected = [];     // targeted articles that changed — intended
    let preserved = 0, untouched = 0;

    Object.keys(baseMap).forEach(function (num) {
      const ba = baseMap[num], ca = conMap[num];
      if (!touchedSet[num]) {
        untouched++;
        if (!ca) { unexpected.push({ number: num, kind: 'исчезнат', lost: tokenizeFidelity(articleToText(ba)), added: [] }); return; }
        const d = diffTokens(tokenizeFidelity(articleToText(ba)), tokenizeFidelity(articleToText(ca)));
        if (d.lost.length || d.added.length) unexpected.push({ number: num, kind: 'изменет', lost: d.lost, added: d.added });
        else preserved++;
      } else {
        if (!ca) { expected.push({ number: num, kind: 'избришан' }); return; }
        const d = diffTokens(tokenizeFidelity(articleToText(ba)), tokenizeFidelity(articleToText(ca)));
        if (d.lost.length || d.added.length) expected.push({ number: num, kind: 'изменет (измена)' });
      }
    });
    Object.keys(conMap).forEach(function (num) {
      if (baseMap[num]) return;
      if (touchedSet[num]) expected.push({ number: num, kind: 'додаден' });
      else unexpected.push({ number: num, kind: 'се појавил', lost: [], added: tokenizeFidelity(articleToText(conMap[num])) });
    });

    const score = untouched ? Math.round((preserved / untouched) * 1000) / 10 : 100;
    return {
      baseArticles: baseLaw.articles.length,
      consolidatedArticles: consolidatedLaw.articles.length,
      touchedArticles: Object.keys(touchedSet).length,
      untouchedArticles: untouched,
      preservedExactly: preserved,
      expectedChanges: expected,
      unexpectedChanges: unexpected,
      clean: unexpected.length === 0,
      preservationScore: score   // % of untargeted articles preserved word-for-word
    };
  }

  // Corpus regression: a fixed battery of representative MK law/amendment
  // samples. For each it reports structural metrics so a regression run can
  // detect drift in parsing, consolidation or validation. Pure core.
  function runCorpusRegression() {
    const N = '\n';
    const pre = 'ЗАКОН' + N + 'ЗА ТЕСТ' + N;
    const samples = [
      { name: 'numbered_paragraphs', base: pre + 'Член 1' + N + '(1) Прв став.' + N + '(2) Втор став.' + N + '(3) Трет став.' },
      { name: 'unnumbered_paragraphs', base: pre + 'Член 1' + N + 'Прв ненумериран став.' + N + 'Втор ненумериран став.' },
      { name: 'alineas', base: pre + 'Член 1' + N + 'Имаат право:' + N + '- првата алинеја,' + N + '- втората алинеја,' + N + '- третата алинеја.' },
      { name: 'numeric_suffixes', base: pre + 'Член 12' + N + 'Текст дванаесет.' + N + 'Член 12-а' + N + 'Текст дванаесет-а.' + N + 'Член 12-б' + N + 'Текст дванаесет-б.' },
      { name: 'structural_parts', base: 'ЗАКОН' + N + 'ЗА Х' + N + 'ДЕЛ ПРВИ' + N + 'ОСНОВНИ ОДРЕДБИ' + N + 'ГЛАВА I' + N + 'Општи начела' + N + 'Член 1' + N + 'Прв став под структура.' + N + 'Оддел 1' + N + 'Посебни' + N + 'Член 2' + N + 'Втор став.' },
      { name: 'amend_replace_words', base: pre + 'Член 5' + N + 'Старите зборови во овој член се менуваат.', amd: 'Член 1' + N + 'Во членот 5 зборовите: „Старите зборови“ се заменуваат со зборовите: „Новите зборови“.' },
      { name: 'amend_add_words', base: pre + 'Член 6' + N + 'Лицата имаат право.', amd: 'Член 1' + N + 'Во членот 6 по зборовите: „Лицата“ се додаваат зборовите: „и правните лица“.' },
      { name: 'amend_delete_words', base: pre + 'Член 7' + N + 'Текст со непотребни зборови во ставот.', amd: 'Член 1' + N + 'Во членот 7 зборовите: „непотребни “ се бришат.' },
      { name: 'amend_replace_article', base: pre + 'Член 8' + N + 'Стар текст на членот осум.', amd: 'Член 1' + N + 'Членот 8 се менува и гласи：' + N + '„Член 8' + N + '(1) Нов текст на членот осум.“' },
      { name: 'constitutional_repeal', base: pre + 'Член 9' + N + '(1) Текст со укинат дел кој се брише по одлука.', amd: 'СЕ УКИНУВА член 9 став 1 во делот „укинат дел “ од Законот за тест.' },
      { name: 'singular_replace', base: pre + 'Член 10' + N + 'Стариот збор во овој член.', amd: 'Член 1' + N + 'Во членот 10 зборот: „Стариот“ се заменува со зборот: „Новиот“.' },
      { name: 'singular_delete', base: pre + 'Член 11' + N + 'Текст со непотребен збор внатре.', amd: 'Член 1' + N + 'Во членот 11 зборот: „непотребен “ се брише.' },
      { name: 'singular_add', base: pre + 'Член 13' + N + 'Лицето има право.', amd: 'Член 1' + N + 'Во членот 13 по зборот: „Лицето“ се додава зборот: „овластеното“.' },
      { name: 'long_title_possible', base: pre + 'Член 14' + N + 'Заштита на личните податоци при обработка во електронските системи' + N + 'Оваа одредба важи за сите субјекти.' },
      { name: 'tabular_enumeration', base: pre + 'Член 15' + N + 'Документите се следниве:' + N + '- лична карта,' + N + '- извод од матична книга,' + N + '- потврда за живеалиште.' }
    ];
    return samples.map(function (s) {
      const base = parseBaseLaw(s.base);
      const beforeArticles = base.articles.length;
      let ops = [], con = null, val = null;
      if (s.amd) {
        try { ops = /СЕ\s+УКИНУВА/i.test(s.amd) ? parseConstitutionalDecision(s.amd) : parseAmendments(s.amd); } catch (e) { ops = []; }
      }
      con = consolidate(base, ops);
      val = validate(con.law, con.operations);
      const live = con.law.articles.filter(function (a) { return a.status !== 'deleted'; });
      const paragraphs = live.reduce(function (n, a) { return n + a.paragraphs.length; }, 0);
      const alineas = live.reduce(function (n, a) { return n + a.paragraphs.reduce(function (m, p) { return m + (p.alineas ? p.alineas.length : 0); }, 0); }, 0);
      const possibleTitles = live.filter(function (a) { return a.possibleTitle; }).length;
      return {
        name: s.name,
        articlesBefore: beforeArticles,
        articlesAfter: live.length,
        paragraphs: paragraphs,
        alineas: alineas,
        possibleTitles: possibleTitles,
        applied: con.stats.applied,
        needsReview: con.stats.needsReview,
        failed: con.stats.failed,
        metadataOnly: con.stats.metadataOnly,
        validatorScore: val.score,
        validatorErrors: (val.counts.error || 0)
      };
    });
  }

  /* ===================== v10.0.8 Legal-resolution helpers ===================== */
  // Strict law-title extraction (spec #4). Never returns gazette/source-note noise
  // like "Редакциски пречистен текст1". Falls back to a needs-review marker.
  function extractLawTitleStrict(rawText) {
    const text = String(rawText || '');
    const lines = text.split('\n').slice(0, 80).map(function (l) { return l.trim(); });
    const IGNORE = /(Редакциски\s+пречистен\s+текст|Службен\s+весник|пречистен\s+текст|^\d+\s*Редакциски|^\d+\s*$|^\(?\d+\)?\s+Службен)/i;
    function collapseSpacedCaps(s) {
      const parts = String(s || '').split(/\s+/); const out = []; let buf = [];
      parts.forEach(function (p) { if (/^[А-ШЃЅЈЉЊЌЏа-шѓѕјљњќџ]$/.test(p)) buf.push(p); else { if (buf.length) { out.push(buf.join('')); buf = []; } out.push(p); } });
      if (buf.length) out.push(buf.join(''));
      return out.join(' ').trim();
    }
    const looksKZ = /Кривичн(иот\s+законик|иот|и)\b/i.test(text) && (text.match(/Член\s+\d+/g) || []).length > 40 && /(казн|сторител|кривичното\s+дело|кривичн)/i.test(text);
    for (let i = 0; i < lines.length; i++) {
      const L = collapseSpacedCaps(lines[i]);
      if (!L || IGNORE.test(L)) continue;
      if (/^КРИВИЧЕН\s+ЗАКОНИК$/i.test(L)) return { title: 'КРИВИЧЕН ЗАКОНИК', needsReview: false, source: 'direct' };
      if (/^ЗАКОН$/i.test(L)) {
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          const N = collapseSpacedCaps(lines[j]); if (!N || IGNORE.test(N)) continue;
          if (/^ЗА\s+.+/i.test(N) || /^[А-ШЃЅЈЉЊЌЏ][А-ШЃЅЈЉЊЌЏ \-]+$/.test(N)) return { title: ('ЗАКОН ' + N).slice(0, 240).trim(), needsReview: false, source: 'ЗАКОН+next' };
          break;
        }
      }
      if (/^ЗАКОН\s+ЗА\s+.+/i.test(L)) return { title: L.slice(0, 240), needsReview: false, source: 'direct' };
      if (/^(ЗАКОНИК|.+\s+ЗАКОНИК)$/i.test(L) && !IGNORE.test(L)) return { title: L.slice(0, 240), needsReview: false, source: 'direct' };
    }
    // KZ heuristic from a source note when no clean heading line exists
    if (looksKZ && /Кривичниот\s+законик/i.test(text)) return { title: 'КРИВИЧЕН ЗАКОНИК', needsReview: false, source: 'kz-note' };
    return { title: 'Потребна проверка на наслов', needsReview: true, source: 'unresolved' };
  }
  // v10.0.9: a title must not be truncated ("…И ДРУГИ", "ЗАКОН ЗА" w/o object).
  // Tries to recover the full title from a source note / body before flagging.
  function lawTitleCompletenessCheck(title, fullText) {
    const t = String(title || '').trim();
    const incomplete = /(?:^|\s)(И\s+ДРУГИ|ЗА|НА|ОД|ВО|ЗА\s+ИЗМЕНУВАЊЕ)\s*$/i.test(t) || /^ЗАКОН\s+ЗА\s*$/i.test(t) || t === 'Потребна проверка на наслов';
    if (!incomplete && t.length >= 8) return { title: t, needsReview: false, recovered: false };
    // attempt recovery: find a fuller "Закон за … " phrase in the text
    const txt = String(fullText || '');
    const m = txt.match(/Закон\s+за\s+[А-Шшѓѕјљњќџа-я][^\n.;)]{6,120}/i);
    if (m) {
      let full = m[0].replace(/\s+/g, ' ').trim();
      full = full.replace(/\s*(Службен\s+весник.*|бр\.?\s*\d.*|,\s*донес.*|,\s*објавен.*)$/i, '').trim();
      if (full.length >= (t.length) && /(права|закон|законик|постапка|однос|дело|друштва|работни|данок|сопственост|стварни)/i.test(full)) {
        return { title: full.toUpperCase().slice(0, 240), needsReview: false, recovered: true, source: 'recovered_from_text' };
      }
    }
    return { title: t || 'Потребна проверка на наслов', needsReview: true, recovered: false, reasonCode: 'incomplete_law_title' };
  }
  // v10.0.9: safe OCR de-hyphenation. Joins "X-Y" → "XY" only when "XY" appears
  // elsewhere in the same text as a whole word (high confidence it's a line-break
  // split, not a real dash). Audited; never touches digit-suffix article numbers.
  function normalizeOcrHyphenation(text) {
    const t = String(text || '');
    const words = {};
    (t.match(/[А-Шшѓѕјљњќџа-я]{3,}/g) || []).forEach(function (w) { words[w.toLowerCase()] = true; });
    const fixes = [];
    const out = t.replace(/([а-шѓѕјљњќџ]{2,})[-‐]([а-шѓѕјљњќџ]{2,})/g, function (whole, a, b) {
      const joined = a + b;
      if (words[joined.toLowerCase()]) { fixes.push({ type: 'ocr_hyphenation_fix', from: whole, to: joined, confidence: 0.92, reason: 'joined form occurs as whole word elsewhere' }); return joined; }
      return whole; // legitimate dash between distinct words — leave as-is
    });
    return { text: out, fixes: fixes };
  }
  // v10.0.9: residual OCR / hyphenation gate. Detects mid-word dots, UNFIXED
  // corpus-confirmed hyphenation splits, leftover mixed Cyrillic+Latin tokens.
  const RE_ABBR_OK = /^(т\.е|н\.е|и\.т\.н|т\.н|чл|бр|ст|стр|в\.д|сл|изм|доп)$/i;
  function scanResidualOcrArtifacts(law) {
    const arts = [];
    const list = (law && law.articles) ? law.articles : [];
    // corpus word-set (whole text) to judge whether a hyphen split SHOULD be joined
    const corpus = {};
    list.forEach(function (a) { if (a.status === 'deleted') return; (a.paragraphs || []).forEach(function (p) { ((p.text || '') + ' ' + (p.alineas || []).map(function (al) { return al.text || ''; }).join(' ')).split(/[^А-Шшѓѕјљњќџа-я]+/).forEach(function (w) { if (w.length >= 3) corpus[w.toLowerCase()] = true; }); }); });
    function scanText(txt, articleNumber) {
      if (!txt) return;
      let m; const RE_DOT = /([А-Шшѓѕјљњќџа-я]{3,})\.([А-Шшѓѕјљњќџа-я]{1,})/g;
      while ((m = RE_DOT.exec(txt)) !== null) {
        if (RE_ABBR_OK.test(m[1])) continue;
        arts.push({ articleNumber: articleNumber, type: 'mid_word_dot', snippet: m[0], suggestedAction: 'веројатно OCR — раздели/спој рачно („' + m[1] + ' ' + m[2] + '“?)', confidence: 0.55, autoFixed: false });
      }
      // hyphenation: flag ONLY if the joined form is a real corpus word (an unfixed
      // split). Legitimate dashes between distinct words are NOT flagged.
      const RE_HYP = /([а-шѓѕјљњќџ]{2,})[-‐]([а-шѓѕјљњќџ]{2,})/g;
      while ((m = RE_HYP.exec(txt)) !== null) {
        if (corpus[(m[1] + m[2]).toLowerCase()]) {
          arts.push({ articleNumber: articleNumber, type: 'mid_word_hyphenation', snippet: m[0], suggestedAction: 'OCR прелом — спој во „' + (m[1] + m[2]) + '“', confidence: 0.9, autoFixed: false });
        }
      }
      const RE_MIX = /\b(?=[^\s]*[А-Шшѓѕјљњќџа-я])(?=[^\s]*[A-Za-z])[A-Za-zА-Шшѓѕјљњќџа-я]{2,}\b/g;
      while ((m = RE_MIX.exec(txt)) !== null) {
        const tok = m[0];
        if (typeof isProtectedLatinToken === 'function' && isProtectedLatinToken(tok)) continue;
        arts.push({ articleNumber: articleNumber, type: 'mixed_cyrillic_latin', snippet: tok, suggestedAction: 'мешани кирилични+латинични букви — провери OCR', confidence: 0.6, autoFixed: false });
      }
    }
    list.forEach(function (a) {
      if (a.status === 'deleted') return;
      (a.paragraphs || []).forEach(function (p) {
        scanText(p.text || '', a.number);
        (p.alineas || []).forEach(function (al) { scanText(al.text || '', a.number); });
      });
    });
    return arts;
  }
  // Duplicate active articles → manual legal resolution model (spec #5). NEVER
  // auto-picks one; publicationReady stays false until a human decision.
  function manualDuplicateResolution(law) {
    const dups = findDuplicateArticles(law);
    return dups.map(function (d) {
      return {
        articleNumber: d.number, count: d.count, status: 'requires_legal_verification',
        options: ['keep_both_as_source_duplicate', 'mark_second_as_probable_' + d.number + 'extended', 'move_to_appendix', 'manual_renumber_after_verification'],
        default: 'keep_both_as_source_duplicate', resolved: false, publicationReady: false
      };
    });
  }
  // Reference resolver (spec #6): classify "член N … од овој закон" references against
  // active / deleted / renumbered indexes. Never invents a defect without context.
  function buildArticleIndexes(law) {
    const active = {}, deleted = {};
    (law.articles || []).forEach(function (a) { if (a.status === 'deleted') deleted[normArticleNumber(a.number)] = true; else active[normArticleNumber(a.number)] = true; });
    (law.deletedArticles || []).forEach(function (d) { if (d && d.number != null) deleted[normArticleNumber(d.number)] = true; });
    return { active: active, deleted: deleted };
  }
  function referenceResolver(law) {
    const idx = buildArticleIndexes(law);
    const out = [];
    const RE_INT = /^[\s,.;:)]*(?:став[\sа-шѓѕјљњќџ\d()]*?)?(?:точк[аи][\sа-шѓѕјљњќџ\d()]*?)?\s*(?:од|на)\s+овој\s+закон(?:ик)?/i;
    (law.articles || []).forEach(function (a) {
      if (a.status === 'deleted') return;
      const txt = articleText(a);
      let m; const ref = /член(?:от|овите)?\s+(\d+(?:-[а-шѓѕјљњќџ])?)/gi;
      while ((m = ref.exec(txt)) !== null) {
        const target = normArticleNumber(m[1]);
        const after = txt.slice(m.index + m[0].length, m.index + m[0].length + 80);
        if (!RE_INT.test(after)) continue;             // only internal "од овој закон(ик)"
        if (idx.active[target]) continue;               // resolves to a live article — fine
        if (idx.deleted[target]) {
          out.push({ from: a.number, to: m[1], code: 'reference_to_deleted_article', severity: 'warning', status: 'resolved_deleted', detail: 'Член ' + m[1] + ' не постои како активен член; проверете дали е избришан, заменет или погрешно OCR прочитан.' });
        } else {
          out.push({ from: a.number, to: m[1], code: 'dangling_reference', severity: 'warning', status: 'needs_legal_verification', detail: 'Член ' + m[1] + ' не е пронајден како активен; потребна е правна проверка (избришан/преброен/OCR?). Без автоматско тврдење дека е дефект.' });
        }
      }
    });
    return out;
  }
  // Typography leak locator (spec #7): exact location of each space-before-punct leak.
  function typographyLeakLocator(law) {
    const out = [];
    const RE = /\s+([,.;:!?])/g;
    (law.articles || []).forEach(function (a) {
      if (a.status === 'deleted') return;
      (a.paragraphs || []).forEach(function (p, pi) {
        const segs = [p.text || ''].concat((p.alineas || []).map(function (al) { return al.text || ''; }));
        segs.forEach(function (txt) {
          let m; RE.lastIndex = 0;
          while ((m = RE.exec(txt)) !== null) {
            // ignore protected abbreviations (бр. / чл. / т.е. / в.д. / ст.)
            const pre = txt.slice(Math.max(0, m.index - 6), m.index);
            if (/(бр|чл|ст|т\.е|в\.д|стр|т)\s*$/.test(pre)) continue;
            out.push({ articleNumber: a.number, paragraphIndex: pi,
              snippetBefore: txt.slice(Math.max(0, m.index - 18), m.index + m[0].length),
              snippetAfter: (txt.slice(Math.max(0, m.index - 18), m.index) + m[1]),
              suggestedFix: 'отстрани празно место пред „' + m[1] + '“' });
          }
        });
      });
    });
    return out;
  }

  /* ===================== v10.1 Monetizable Publication Workflow ===================== */
  // Mandatory disclaimer — present in EVERY export (spec).
  var MANDATORY_DISCLAIMER = 'Овој текст претставува неофицијален редакциски пречистен текст, изработен за практична и информативна употреба. Официјален извор на правото се објавите во „Службен весник на Република Северна Македонија". За службена, судска или нотарска употреба се препорачува проверка со службено објавените текстови.';

  // Deterministic, dependency-free hash (FNV-1a, 32-bit) for source/content/qa hashes.
  function fnv1a(str) {
    var h = 0x811c9dc5; str = String(str == null ? '' : str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  // 1) SOURCE AUTHORITY TABLE — base law, amendments, КС decisions, authentic
  //    interpretations, EIF/application dates, articles changed, status. Honest:
  //    unknown amending-act metadata is flagged needs_review, never invented.
  function buildSourceAuthorityTable(law, report, meta) {
    law = law || {}; report = report || {}; meta = meta || {};
    var rows = [];
    var baseGazette = (law.meta && law.meta.gazette) || (report.metadata && report.metadata.gazette) || (meta && meta.baseGazette) || null;
    rows.push({ act: 'основен закон', title: meta.lawTitle || law.title || null, gazette: baseGazette, eifDate: (law.meta && law.meta.eif) || null, applicationDate: null, articlesAffected: 'сите', status: 'applied', needsReview: !baseGazette });
    (law.deletedArticles || []).forEach(function (d) {
      rows.push({ act: 'измена (бришење)', title: null, gazette: null, eifDate: null, applicationDate: null, articlesAffected: String(d.number), status: 'applied', note: (d.note || '').trim() || null, needsReview: true });
    });
    (law.articles || []).filter(function (a) { return a.status !== 'deleted' && /-[а-шѓѕјљњќџ]$/.test(String(a.number)); }).forEach(function (a) {
      rows.push({ act: 'измена (вметнат член)', title: null, gazette: null, eifDate: null, applicationDate: null, articlesAffected: String(a.number), status: 'applied', needsReview: true });
    });
    (meta.constitutionalDecisions || []).forEach(function (c) { rows.push({ act: 'одлука на Уставен суд', title: c.id || null, gazette: c.gazette || null, eifDate: c.date || null, applicationDate: null, articlesAffected: c.articles || null, status: c.status || 'applied', needsReview: c.needsReview !== false }); });
    (meta.authenticInterpretations || []).forEach(function (t) { rows.push({ act: 'автентично толкување', title: t.id || null, gazette: t.gazette || null, eifDate: t.date || null, applicationDate: null, articlesAffected: t.articles || null, status: 'applied', needsReview: t.needsReview !== false }); });
    var needs = rows.filter(function (r) { return r.needsReview; }).length;
    // Human sign-off: a lawyer who verified the table against Службен весник clears
    // the needs_review flags (and may supply verified amending-act metadata).
    if (meta.sourceTableHumanVerified === true) { rows.forEach(function (r) { r.needsReview = false; r.humanVerified = true; }); needs = 0; }
    return { schema: 'source-authority/1.0', law: meta.lawTitle || law.title || null, source: 'Службен весник на РСМ', baseGazette: baseGazette, rows: rows, complete: needs === 0 && !!baseGazette, needsReviewCount: needs, humanVerified: meta.sourceTableHumanVerified === true };
  }

  // 6) PARALLEL WITH OFFICIAL SOURCE — per-article parallel-check table.
  function buildParallelSourceTable(law, meta) {
    law = law || {}; meta = meta || {};
    var hv = (meta.humanVerified === true);
    var rows = (law.articles || []).filter(function (a) { return a.status !== 'deleted'; }).map(function (a) {
      return { article: String(a.number), currentText: !!articleText(a), sourceGazette: (law.meta && law.meta.gazette) || null, amendingAct: null, status: 'за паралелна проверка', confidence: hv ? 1 : 0.5, humanVerified: hv };
    });
    return { schema: 'parallel-source/1.0', rows: rows, articleCount: rows.length, humanVerified: hv };
  }

  // 5) VERSIONING — stable identifiers + hashes.
  function buildVersioning(law, report, verdict, meta) {
    law = law || {}; meta = meta || {};
    var content = (law.articles || []).map(function (a) { return a.number + '|' + articleText(a); }).join('\n');
    return {
      lawId: meta.lawId || ('mk-' + fnv1a((meta.lawTitle || law.title || 'law'))),
      version: meta.version || '1.0.0',
      statusDate: meta.statusDate || meta.consolidatedAsOf || null,   // состојба на ден
      generatedAt: new Date().toISOString(),
      checkedAt: meta.checkedAt || null,
      sourceHash: fnv1a(meta.sourceText || content),
      contentHash: fnv1a(content),
      qaHash: fnv1a(JSON.stringify((verdict && verdict.reasons) || []) + '|' + ((verdict && verdict.finalScore) || '')),
      editor: meta.editor || null,
      reviewer: meta.reviewer || null
    };
  }

  // 2) EDITORIAL CERTIFICATION + 7) DISCLAIMER MODES (draft/reviewed/certified).
  // 4) EDITORIAL CERTIFICATE HARDENING — must carry real identity + hashes, not
  //    just auto-text. date=null or placeholder reviewer ⇒ not commercial.
  function isPlaceholderName(s) { s = String(s == null ? '' : s); return !s.trim() || /\[|placeholder|____|пополни|TODO|xxxx/i.test(s); }
  function editorialCertification(verdict, meta) {
    meta = meta || {}; verdict = verdict || {};
    var machineCheck = (verdict.contentPublicationReady === true);
    var editorialCheck = (meta.editorialReview === true);
    var legalCheck = (meta.legalReview === true);
    var level = legalCheck ? 'certified' : (editorialCheck ? 'reviewed' : 'draft');
    var statusDate = meta.statusDate || meta.consolidatedAsOf || '____.__.__';
    var checkedByFullName = meta.checkedByFullName || meta.reviewer || meta.editor || null;
    var date = meta.checkedAt || null;
    var valid = legalCheck && editorialCheck && !!date && !isPlaceholderName(checkedByFullName) && statusDate !== '____.__.__';
    return {
      checkedByFullName: checkedByFullName, role: meta.role || (legalCheck ? 'адвокат/редактор' : null),
      date: date, signaturePlaceholder: '________________________  (потпис)',
      lawTitle: meta.lawTitle || (verdict && verdict.lawTitle) || null, statusDate: statusDate,
      sourceTableHash: meta.sourceTableHash || null, contentHash: meta.contentHash || null, qaHash: meta.qaHash || null,
      machineCheck: machineCheck, editorialReviewCompleted: editorialCheck, legalReviewCompleted: legalCheck,
      editorialCheck: editorialCheck, legalCheck: legalCheck, version: meta.version || '1.0.0', level: level,
      valid: !!valid,
      certificateText: (legalCheck && valid) ? ('Проверено според службено објавените текстови заклучно со ' + statusDate + '.') : null,
      sellableLabel: (legalCheck && valid) ? ('Неофицијален редакциски пречистен текст — проверено според службено објавените текстови заклучно со ' + statusDate) : null
    };
  }
  function disclaimerMode(verdict, meta) { return editorialCertification(verdict, meta).level; }

  // 2) FULL AMENDMENT REGISTER — one row per detected operation; never a single
  //    symbolic row when several acts exist. Unknown act metadata stays unverified.
  function buildFullAmendmentRegister(law, report, meta) {
    law = law || {}; report = report || {}; meta = meta || {};
    // If a human supplied a verified register, use it verbatim.
    if (Array.isArray(meta.verifiedAmendmentRows) && meta.verifiedAmendmentRows.length) {
      var vr = meta.verifiedAmendmentRows.map(function (r, i) {
        return Object.assign({ actId: r.actId || ('act-' + (i + 1)), actType: 'измена', actTitle: null, gazetteNumber: null, publicationDate: null, effectiveDate: null, applicationDate: null, changedArticles: null, operation: 'amend', appliedToArticle: null, confidence: 1, sourceSnippet: null, humanVerified: true, status: 'manual_verified' }, r);
      });
      var nv = vr.filter(function (r) { return r.humanVerified !== true; }).length;
      return { schema: 'amendment-register/2.0', rows: vr, total: vr.length, needsVerification: nv, symbolic: false, source: 'human-verified' };
    }
    var rows = [];
    (law.deletedArticles || []).forEach(function (d, i) {
      rows.push({ actId: 'auto-del-' + (i + 1), actType: 'измена (бришење)', actTitle: null, gazetteNumber: null, publicationDate: null, effectiveDate: null, applicationDate: null, changedArticles: String(d.number), operation: 'delete', appliedToArticle: String(d.number), confidence: 0.5, sourceSnippet: (d.note || '').slice(0, 160) || null, humanVerified: false, status: 'skipped_needs_review' });
    });
    (law.articles || []).filter(function (a) { return a.status !== 'deleted' && /-[а-шѓѕјљњќџ]$/.test(String(a.number)); }).forEach(function (a, i) {
      rows.push({ actId: 'auto-ins-' + (i + 1), actType: 'измена (вметнат член)', actTitle: null, gazetteNumber: null, publicationDate: null, effectiveDate: null, applicationDate: null, changedArticles: String(a.number), operation: 'insert', appliedToArticle: String(a.number), confidence: 0.5, sourceSnippet: null, humanVerified: false, status: 'skipped_needs_review' });
    });
    // detect how many distinct amending acts the text hints at (gazette refs in deleted notes)
    var hinted = {};
    (law.deletedArticles || []).forEach(function (d) { var m = (d.note || '').match(/бр\.?\s*\d+\/\d+/g) || []; m.forEach(function (x) { hinted[x] = true; }); });
    var symbolic = rows.length <= 1 && Object.keys(hinted).length > 1;
    return { schema: 'amendment-register/2.0', rows: rows, total: rows.length, needsVerification: rows.filter(function (r) { return !r.humanVerified; }).length, symbolic: symbolic, hintedActs: Object.keys(hinted).length, source: 'auto-derived' };
  }

  // 3) CHANGE MAP — every operation with status; locked unless all applied verified.
  function buildChangeMap(register) {
    register = register || { rows: [] };
    var rows = (register.rows || []).map(function (r) {
      return { appliedToArticle: r.appliedToArticle, operation: r.operation, gazetteNumber: r.gazetteNumber || null, status: r.status || (r.humanVerified ? 'applied' : 'skipped_needs_review'), humanVerified: r.humanVerified === true, explanation: r.sourceSnippet || (r.humanVerified ? null : 'нема потврден службен извор') };
    });
    var appliedAllVerified = rows.filter(function (r) { return r.status === 'applied' || r.status === 'manual_verified'; }).every(function (r) { return r.humanVerified === true; });
    var skippedWithoutReason = rows.some(function (r) { return r.status === 'skipped_needs_review' && !r.explanation; });
    var anyGazetteNull = rows.some(function (r) { return (r.status === 'applied' || r.status === 'manual_verified') && !r.gazetteNumber; });
    var complete = rows.length > 0 && appliedAllVerified && !skippedWithoutReason && !anyGazetteNull && !register.symbolic;
    return { schema: 'change-map/2.0', rows: rows, complete: complete, counts: { total: rows.length, applied: rows.filter(function (r) { return r.status === 'applied' || r.status === 'manual_verified'; }).length, skipped: rows.filter(function (r) { return r.status === 'skipped_needs_review'; }).length } };
  }

  // 5/6) PDF render + metadata checks.
  function pdfRenderCheck(extractedText) {
    var brokenDate = /20\d{2}-\s*\n\s*\d{2}-\d{2}/.test(String(extractedText || ''));
    return { brokenDatePattern: brokenDate, clean: !brokenDate };
  }
  function buildPdfMetadata(meta) {
    meta = meta || {};
    var md = {
      Title: meta.lawTitle || meta.productName || null, Author: meta.author || meta.editor || null,
      Subject: 'Неофицијален редакциски пречистен текст', Keywords: 'консолидиран, редакциски, Службен весник, ' + (meta.lawTitle || ''),
      Creator: 'Legal Formatter v10.2', Producer: 'Paragraf.mk', CreationDate: new Date().toISOString(),
      statusDate: meta.statusDate || null, toolVersion: '10.2', notOfficialText: true
    };
    md.complete = !!(md.Title && md.Author && md.Subject);
    return md;
  }
  // Non-breaking sellable label so the date can never split across a line in PDF.
  function formatSellableLabel(statusDate) {
    var nb = String(statusDate || '').replace(/-/g, '\u2011'); // non-breaking hyphen
    return 'Неофицијален редакциски пречистен текст — проверено според службено објавените текстови заклучно со \u00A0' + nb;
  }

  // 8) PUBLICATION MODE: demo | internal | commercial.
  function normalizeMode(m) { m = String(m || 'demo').toLowerCase(); return (m === 'commercial' || m === 'internal' || m === 'demo') ? m : 'demo'; }

  // PRODUCT + API LICENSE metadata.
  function buildProductMetadata(meta, monetizable) {
    meta = meta || {};
    return {
      productName: meta.productName || ((meta.lawTitle || 'Пропис') + ' — редакциско издание'),
      productType: meta.productType || 'editorial_consolidation',
      priceTier: meta.priceTier || (monetizable ? 'paid' : 'unavailable'),
      license: 'Paragraf.mk Editorial License',
      allowedUses: meta.allowedUses || ['internal legal research', 'subscription access'],
      prohibitedUses: meta.prohibitedUses || ['republication without license', 'claiming official status'],
      updateFrequency: meta.updateFrequency || 'on each Службен весник change',
      monetizable: !!monetizable
    };
  }
  function buildApiLicense() {
    return { license: 'Paragraf.mk Editorial License', notOfficialText: true, officialSource: 'Службен весник', allowedUse: ['internal legal research', 'subscription access'], prohibitedUse: ['republication without license', 'claiming official status'] };
  }

  // 7/10) MONETIZATION GATE — strict. monetizable=true only in commercial mode with
  //       complete source table, complete change map, valid certificate, clean PDF.
  // ===== v10.3 helpers =====
  // Safe typography: remove a stray newline (and surrounding spaces) immediately
  // before a comma/period/semicolon/colon. Audited. Does NOT invent letters.
  function normalizeNewlineBeforePunct(text) {
    var fixes = [];
    var out = String(text || '').replace(/([^\s])[ \t]*\n[ \t]*([,.;:])/g, function (whole, a, p) {
      fixes.push({ type: 'typography_fix', rule: 'newline_before_comma', before: whole, after: a + p });
      return a + p;
    });
    return { text: out, fixes: fixes };
  }
  // KZ duplicate manual resolution — requires a fully-filled human decision.
  function resolveDuplicates(law, resolutions) {
    resolutions = resolutions || {};
    var dups = manualDuplicateResolution(law);
    return dups.map(function (d) {
      var r = resolutions[d.articleNumber] || {};
      var complete = (r.choice && ['keep_both_as_source_duplicate', 'mark_second_as_probable', 'move_to_appendix', 'manual_renumber_after_verification'].indexOf(String(r.choice).replace(/_\d.*$/, '').replace('mark_second_as_probable_' , 'mark_second_as_probable')) >= 0)
        && !!r.resolutionBy && !!r.resolutionDate && !!r.resolutionReason && !!r.sourceReference;
      return { articleNumber: d.articleNumber, count: d.count, options: d.options,
        choice: r.choice || null, resolutionBy: r.resolutionBy || null, resolutionDate: r.resolutionDate || null,
        resolutionReason: r.resolutionReason || null, sourceReference: r.sourceReference || null,
        resolved: !!complete, status: complete ? 'manual_resolution' : 'requires_legal_verification' };
    });
  }

  // ===== v10.4 unified editorial resolution workflow =====
  var REF_CLASSES = ['reference_to_deleted_article', 'renumbered', 'editorial_footnote', 'ocr_correction_needs_verification', 'confirmed_as_in_source'];
  // Resolve dangling references (e.g. 96-к → 101-а) with the SAME 5 required fields.
  function resolveReferences(law, refResolutions) {
    refResolutions = refResolutions || {};
    var refs = (typeof referenceResolver === 'function') ? referenceResolver(law) : [];
    return refs.filter(function (r) { return r.status === 'needs_legal_verification' || r.code === 'reference_to_deleted_article'; }).map(function (r) {
      var key = r.from + '->' + r.to;
      var d = refResolutions[key] || refResolutions[r.to] || {};
      var classOk = REF_CLASSES.indexOf(d.classification) >= 0;
      var complete = classOk && !!d.resolutionBy && !!d.resolutionDate && !!d.resolutionReason && !!d.sourceReference;
      return { from: r.from, to: r.to, detected: r.code, classification: d.classification || null,
        editorialTarget: d.editorialTarget || null,    // e.g. corrected article number, if any
        resolutionBy: d.resolutionBy || null, resolutionDate: d.resolutionDate || null,
        resolutionReason: d.resolutionReason || null, sourceReference: d.sourceReference || null,
        resolved: !!complete, status: complete ? 'manual_resolution' : 'needs_legal_verification' };
    });
  }
  // Generate transparent editorial footnotes — text is NEVER changed silently.
  function buildEditorialFootnotes(dupRes, refRes) {
    var notes = [];
    (dupRes || []).filter(function (d) { return d.resolved; }).forEach(function (d) {
      var renum = /mark_second_as_probable/.test(String(d.choice));
      var target = renum ? (String(d.choice).replace('mark_second_as_probable_', '') || null) : null;
      notes.push({ kind: 'duplicate', article: d.articleNumber, sourceReference: d.sourceReference,
        text: 'Во официјалниот текст (' + d.sourceReference + ') оваа одредба е означена како член ' + d.articleNumber + ', идентично со претходен член. Според редакциска одлука на ' + d.resolutionBy + ' (' + d.resolutionDate + '): ' + d.resolutionReason + (renum && target ? (' Редакциски третиран како член ' + target + '.') : ' Двата члена се задржани верно.') + ' Текстот е пренесен без измена на содржината.' });
    });
    (refRes || []).filter(function (r) { return r.resolved; }).forEach(function (r) {
      notes.push({ kind: 'reference', from: r.from, to: r.to, sourceReference: r.sourceReference,
        text: 'Во официјалниот текст (' + r.sourceReference + ') член ' + r.from + ' упатува на член ' + r.to + '. Класификација (' + r.classification + ') од ' + r.resolutionBy + ' (' + r.resolutionDate + '): ' + r.resolutionReason + (r.editorialTarget ? (' Релевантна одредба: член ' + r.editorialTarget + '.') : '') + ' Упатувањето е пренесено верно; усогласувањето е надвор од редакцискиот опсег.' });
    });
    return notes;
  }
  // Optional editorial renumber PLAN — preserves originalNumber, never mutates source meaning.
  function buildRenumberPlan(dupRes) {
    return (dupRes || []).filter(function (d) { return d.resolved && /mark_second_as_probable/.test(String(d.choice)); }).map(function (d) {
      return { originalNumber: d.articleNumber, editorialNumber: String(d.choice).replace('mark_second_as_probable_', ''), instance: 2, basis: 'редакциска одлука + фуснота', by: d.resolutionBy, date: d.resolutionDate, sourceReference: d.sourceReference };
    });
  }
  // ORCHESTRATOR — one workflow for duplicates + references, with audit + footnotes.
  function buildResolutionWorkflow(law, report, meta) {
    meta = meta || {};
    var dupRes = resolveDuplicates(law, meta.duplicateResolutions || {});
    var refRes = resolveReferences(law, meta.referenceResolutions || {});
    var footnotes = buildEditorialFootnotes(dupRes, refRes);
    var renumberPlan = buildRenumberPlan(dupRes);
    var audit = [];
    dupRes.forEach(function (d) { audit.push({ ts: new Date().toISOString(), type: 'duplicate_resolution', article: d.articleNumber, resolved: d.resolved, by: d.resolutionBy, date: d.resolutionDate, choice: d.choice, sourceReference: d.sourceReference, silentChange: false }); });
    refRes.forEach(function (r) { audit.push({ ts: new Date().toISOString(), type: 'reference_resolution', ref: r.from + '->' + r.to, resolved: r.resolved, by: r.resolutionBy, date: r.resolutionDate, classification: r.classification, sourceReference: r.sourceReference, silentChange: false }); });
    var dupAll = dupRes.length === 0 || dupRes.every(function (d) { return d.resolved; });
    var refAll = refRes.length === 0 || refRes.every(function (r) { return r.resolved; });
    return {
      schema: 'editorial-resolution/1.0', generatedAt: new Date().toISOString(),
      duplicates: dupRes, references: refRes, footnotes: footnotes, renumberPlan: renumberPlan, audit: audit,
      duplicatesResolved: dupAll, referencesResolved: refAll, allResolved: dupAll && refAll,
      pendingDuplicates: dupRes.filter(function (d) { return !d.resolved; }).map(function (d) { return d.articleNumber; }),
      pendingReferences: refRes.filter(function (r) { return !r.resolved; }).map(function (r) { return r.from + '->' + r.to; })
    };
  }
  // Apply the workflow to a COPY of the law for export: attach footnotes + editorialNumber,
  // ALWAYS preserving the original number. Never alters paragraph text.
  function applyResolutionsToLaw(law, workflow) {
    var clone = JSON.parse(JSON.stringify(law));
    (workflow.renumberPlan || []).forEach(function (p) {
      var seen = 0;
      (clone.articles || []).forEach(function (a) {
        if (String(a.number) === p.originalNumber) { seen++; if (seen === p.instance) { a.originalNumber = a.number; a.editorialNumber = p.editorialNumber; a.editorialNote = 'Редакциски пренумериран од ' + p.originalNumber + ' во ' + p.editorialNumber + ' (' + p.sourceReference + ').'; } }
      });
    });
    (workflow.footnotes || []).forEach(function (n) {
      var target = n.article || n.from;
      (clone.articles || []).forEach(function (a) { if (String(a.number) === String(target)) { a.editorialFootnotes = (a.editorialFootnotes || []).concat([n.text]); } });
    });
    return clone;
  }

  function monetizationGate(verdict, sourceTable, cert, meta) {
    verdict = verdict || {}; sourceTable = sourceTable || {}; cert = cert || {}; meta = meta || {};
    var mode = normalizeMode(meta.publicationMode);
    var sourceMode = (meta.sourceMode === 'real') ? 'real' : (meta.sourceMode === 'synthetic-demo' ? 'synthetic-demo' : (sourceTable.synthetic ? 'synthetic-demo' : 'real'));
    var environmentReady = (verdict.environmentReady === true) && (meta.openedFromTempArchive !== true);
    var editorialReady = (cert.editorialReviewCompleted === true && cert.legalReviewCompleted === true && cert.valid === true);
    var contentReady = (verdict.contentPublicationReady === true);
    var changeMap = meta.changeMap || null;
    var register = meta.amendmentRegister || null;
    var finalPublicationReady = contentReady && environmentReady && editorialReady;
    var blockers = [];
    if (!contentReady) blockers.push('content_not_ready');
    if (!environmentReady) blockers.push('environment_not_ready');
    if (meta.openedFromTempArchive === true) blockers.push('temp_archive_open');
    if (!editorialReady) blockers.push('editorial_review_incomplete');
    if (!sourceTable.complete) blockers.push('source_authority_table_incomplete');
    if (sourceTable.anyGazetteNull) blockers.push('source_gazette_null');
    if (sourceMode === 'synthetic-demo') blockers.push('synthetic_source_not_commercial');
    if (changeMap && !changeMap.complete) blockers.push('change_map_incomplete');
    if (register && (register.total === 0 || register.symbolic)) blockers.push('amendment_register_symbolic_or_empty');
    if (register && meta.expectedSourceActs != null && register.total < meta.expectedSourceActs) blockers.push('amendment_register_incomplete');
    if (!cert.date) blockers.push('certificate_date_missing');
    if (isPlaceholderName(cert.checkedByFullName) || cert.legalReviewCompleted !== true) blockers.push('certificate_legal_reviewer_missing');
    if (meta.pdfClean === false) blockers.push('pdf_broken_date');
    if (meta.pdfMetadataVerified === false) blockers.push('pdf_metadata_missing');
    if (verdict.lawTitleNeedsReview === true) blockers.push('law_title_incomplete');
    if ((verdict.duplicateArticles || 0) > 0 && !meta.duplicatesResolved) blockers.push('duplicate_unresolved');
    if (meta.danglingUnresolved === true) blockers.push('dangling_reference_unresolved');
    if ((verdict.residualOcrArtifacts || 0) > 0) blockers.push('ocr_unresolved');
    if ((verdict.typographySpacingLeaks || 0) > 0) blockers.push('typography_leak');
    if (!sourceTable.baseGazette) blockers.push('missing_official_source_reference');
    if (meta.disclaimerIncluded === false) blockers.push('missing_disclaimer');
    var monetizable = (mode === 'commercial') && (sourceMode === 'real') && (blockers.length === 0);
    return {
      publicationMode: mode, sourceMode: sourceMode,
      commercialUseAllowed: sourceMode === 'real',
      previewOnly: sourceMode === 'synthetic-demo',
      contentPublicationReady: contentReady, environmentReady: environmentReady, editorialReady: editorialReady,
      finalPublicationReady: finalPublicationReady,
      monetizable: monetizable,
      monetizationPreview: (!monetizable) && (mode !== 'commercial' || sourceMode === 'synthetic-demo') && contentReady,
      demoMonetizationPreview: sourceMode === 'synthetic-demo',
      blockers: blockers
    };
  }

  // ORCHESTRATOR — full commercial publication package (v10.3).
  function buildPublicationPackage(law, report, verdict, meta) {
    meta = meta || {};
    var mode = normalizeMode(meta.publicationMode);
    var versioning = buildVersioning(law, report, verdict, meta);
    var register = buildFullAmendmentRegister(law, report, meta);
    var changeMap = buildChangeMap(register);
    var sourceTable = buildSourceAuthorityTable(law, report, meta);
    sourceTable.synthetic = (meta.sourceMode === 'synthetic-demo');
    // real-source lock: an amending-act row missing gazette OR sourceSnippet (when not human-verified) = incomplete
    var amendRows = (register.rows || []);
    var rowsMissingSource = amendRows.filter(function (r) { return r.humanVerified !== true && (!r.gazetteNumber || !r.sourceSnippet); }).length;
    sourceTable.anyGazetteNull = ((sourceTable.rows || []).some(function (r) { return r.act !== 'основен закон' && !r.gazette; }) || rowsMissingSource > 0) && !sourceTable.humanVerified;
    if (sourceTable.anyGazetteNull) sourceTable.complete = false;
    var cert = editorialCertification(verdict, Object.assign({ sourceTableHash: fnv1a(JSON.stringify(sourceTable.rows)), contentHash: versioning.contentHash, qaHash: versioning.qaHash }, meta));
    var pdfMeta = buildPdfMetadata(meta);
    // dangling references unresolved? (any internal reference to a non-active article)
    var refs = (typeof referenceResolver === 'function') ? referenceResolver(law) : [];
    var resolution = buildResolutionWorkflow(law, report, meta);
    var danglingUnresolved = refs.some(function (r) { return r.status === 'needs_legal_verification'; }) && (meta.referencesResolved !== true) && (resolution.referencesResolved !== true);
    var dups = resolution.duplicates;
    var duplicatesResolved = resolution.duplicatesResolved;
    var gate = monetizationGate(verdict, sourceTable, cert, Object.assign({
      disclaimerIncluded: true, changeMap: changeMap, amendmentRegister: register,
      danglingUnresolved: danglingUnresolved, duplicatesResolved: duplicatesResolved
    }, meta));
    var product = buildProductMetadata(meta, gate.monetizable);
    var exportScore = (verdict && verdict.exportScore != null) ? verdict.exportScore : 9.7;
    if (!pdfMeta.complete || meta.pdfMetadataVerified === false) exportScore = Math.min(exportScore, 9.0);
    var printReady = (meta.pdfClean !== false) && (meta.pdfMetadataVerified !== false);
    var sellableLabel = (gate.monetizable && cert.valid) ? formatSellableLabel(cert.statusDate) : null;
    return {
      schema: 'publication-package/10.3', publicationMode: mode, sourceMode: gate.sourceMode,
      commercialUseAllowed: gate.commercialUseAllowed, previewOnly: gate.previewOnly, demoMonetizationPreview: gate.demoMonetizationPreview,
      disclaimer: MANDATORY_DISCLAIMER,
      readiness: { contentPublicationReady: gate.contentPublicationReady, environmentReady: gate.environmentReady, editorialReady: gate.editorialReady, finalPublicationReady: gate.finalPublicationReady },
      monetizable: gate.monetizable, monetizationPreview: gate.monetizationPreview, blockers: gate.blockers,
      disclaimerLevel: cert.level, sellableLabel: sellableLabel, printReady: printReady,
      editorialCertificate: cert, sourceAuthorityTable: sourceTable, amendmentRegister: register, changeMap: changeMap,
      duplicateResolutions: dups, referenceResolutions: refs, danglingUnresolved: danglingUnresolved,
      resolutionWorkflow: resolution, editorialFootnotes: resolution.footnotes, resolutionAudit: resolution.audit,
      parallelSourceTable: buildParallelSourceTable(law, meta),
      versioning: versioning, productMetadata: product, apiLicense: buildApiLicense(),
      pdfMetadata: pdfMeta, exportScore: exportScore, finalScore: verdict ? verdict.finalScore : null
    };
  }
  // 11) Clear real-vs-synthetic commercial readiness report.
  function buildCommercialReadinessReport(realPkg, synthPkg) {
    return {
      schema: 'commercial-readiness/2.0', generatedAt: new Date().toISOString(),
      realLaw: { sourceMode: realPkg.sourceMode, monetizable: realPkg.monetizable, commercialUseAllowed: realPkg.commercialUseAllowed, blockers: realPkg.blockers },
      syntheticDemo: synthPkg ? { sourceMode: synthPkg.sourceMode, previewOnly: true, commercialUseAllowed: false, demoMonetizationPreview: synthPkg.demoMonetizationPreview, note: 'СИНТЕТИЧКИ — само preview, не е commercial одобрување.' } : null
    };
  }

  /* ----------------------------------------------------------------------
   *  Public API
   * --------------------------------------------------------------------*/
  return {
    version: '10.4.0',
    MANDATORY_DISCLAIMER: MANDATORY_DISCLAIMER,
    fnv1a, buildSourceAuthorityTable, buildParallelSourceTable, buildVersioning, editorialCertification, disclaimerMode, buildProductMetadata, buildApiLicense, monetizationGate, buildPublicationPackage,
    buildFullAmendmentRegister, buildChangeMap, pdfRenderCheck, buildPdfMetadata, formatSellableLabel, normalizeMode, isPlaceholderName,
    normalizeNewlineBeforePunct, resolveDuplicates, buildCommercialReadinessReport,
    resolveReferences, buildEditorialFootnotes, buildRenumberPlan, buildResolutionWorkflow, applyResolutionsToLaw,
    validatorVersion: VALIDATOR_VERSION,
    extractLawTitleStrict, lawTitleCompletenessCheck, scanResidualOcrArtifacts, normalizeOcrHyphenation, manualDuplicateResolution, referenceResolver, typographyLeakLocator, buildArticleIndexes,
    normalizeText, stripUkaz, cleanupGazetteText, classifyStructuralLine, articleSortKey, cmpArticle, normArticleNumber, normalizeArticleNumber, normalizeArticleNumberEx, extractQuoted,
    extractOuterQuotedAfterKeyword, extractPayload, quoteDepthAt,
    parseBaseLaw,
    looksOfficialConsolidated, normalizeOfficialConsolidated, findDuplicateArticles,
    parseAmendments, splitAdminArticles, classify, findTargetArticle, findTargetArticleRaw,
    parseConstitutionalDecision,
    normalizeParagraphPayload, parseArticlePayload, parseHeadingArticlePayload, findAlinea,
    consolidate, applyOperation, rollbackTo, cloneLaw,
    validate, legalRisk, verifyWordOpCounts,
    lawToText, articleToText, buildArticleRecords, normalizeSoftBreaks, normalizeMixedCyrillicLatin, normalizeCyrillicHomoglyphsSafe, normalizeTypography, typographyScan, homoglyphScan, computeQaFlags, publicationReadiness, structuralLeakScan, publicationGate, finalQaVerdict, goldenSopstvenost, compactGoldenSopstvenost, fullGoldenSopstvenost, regressionBattery, regressionAsserts, exportMarkdown, vendorStatus, cspValidate, cspFlags, rendererOrderConsistent,
    verifyFidelity, tokenizeFidelity, diffTokens, verifyConsolidationFidelity, runCorpusRegression,
    _resetIds: resetIds
  };
});
