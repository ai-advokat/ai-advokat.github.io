/*
 * AI Advokat — Legal Base public layer: pure, testable helpers.
 *
 * Every label here is a *presentation* of a value the backend already returned.
 * Nothing in this file infers legal status: a layer is shown as active only when
 * /api/capabilities reports an explicit live value, a version is called current
 * only when the backend marks it current AND its Human Gate status is approved,
 * and the citation audit never decides "supported" or "unsupported" on its own.
 *
 * Loaded by index.html as a classic script (window.LegalBase) and by the Node
 * tests as CommonJS (module.exports).
 */
(function (root) {
  "use strict";

  // Mirrors PUBLIC_WEB_SOURCES in src/index.js (test/public-layer.test.mjs keeps them in sync).
  const OFFICIAL_SOURCES = Object.freeze([
    { id: "official-gazette", url: "https://slvesnik.com.mk/", jurisdiction: "MK", category: "official_gazette",
      mk: "Службен весник на Република Северна Македонија", en: "Official Gazette of the Republic of North Macedonia",
      kindMk: "Официјално објавување на прописи", kindEn: "Official publication of legislation" },
    { id: "ldbis", url: "https://ldbis.pravda.gov.mk/", jurisdiction: "MK", category: "ministry_database",
      mk: "Министерство за правда — LDBIS", en: "Ministry of Justice — LDBIS",
      kindMk: "Државна правна база (редакциски текстови)", kindEn: "State legal database (editorial texts)" },
    { id: "constitutional-court", url: "https://ustavensud.mk/", jurisdiction: "MK", category: "court",
      mk: "Уставен суд на Република Северна Македонија", en: "Constitutional Court of the Republic of North Macedonia",
      kindMk: "Одлуки и решенија на Уставниот суд", kindEn: "Decisions of the Constitutional Court" },
    { id: "supreme-court", url: "https://www.vrhoven.sud.mk/", jurisdiction: "MK", category: "court",
      mk: "Врховен суд на Република Северна Македонија", en: "Supreme Court of the Republic of North Macedonia",
      kindMk: "Судска практика на Врховниот суд", kindEn: "Case law of the Supreme Court" },
    { id: "hudoc", url: "https://hudoc.echr.coe.int/", jurisdiction: "ECHR", category: "international_court",
      mk: "Европски суд за човекови права — HUDOC", en: "European Court of Human Rights — HUDOC",
      kindMk: "Пресуди и одлуки на ЕСПЧ (Совет на Европа)", kindEn: "ECtHR judgments and decisions (Council of Europe)" },
    { id: "eur-lex", url: "https://eur-lex.europa.eu/", jurisdiction: "EU", category: "international_organization",
      mk: "EUR-Lex", en: "EUR-Lex",
      kindMk: "Право на Европската унија и судска практика на СПЕУ", kindEn: "European Union law and CJEU case law" }
  ]);

  const JURISDICTION_LABELS = Object.freeze({
    MK: { mk: "Северна Македонија", en: "North Macedonia" },
    ECHR: { mk: "Совет на Европа · ЕСПЧ", en: "Council of Europe · ECtHR" },
    EU: { mk: "Европска унија", en: "European Union" }
  });

  // The source-first ladder. Order matters and is shown to the user.
  const LAYERS = Object.freeze([
    { n: 1, id: "source", mk: "Официјален извор", en: "Official source",
      textMk: "Службен весник, судови, HUDOC, EUR-Lex. Секогаш има предност.", textEn: "Official Gazette, courts, HUDOC, EUR-Lex. Always controls." },
    { n: 2, id: "article", mk: "Член и верзија", en: "Article and version",
      textMk: "Текст член-по-член, врзан за една верзија со статус и Human Gate.", textEn: "Article-level text bound to one version with status and Human Gate." },
    { n: 3, id: "case", mk: "Судска практика", en: "Case law",
      textMk: "Одлуки на судовите. Засега само директориум на официјални бази.", textEn: "Court decisions. Currently a directory of official databases only." },
    { n: 4, id: "analysis", mk: "Стручна анализа", en: "Professional analysis",
      textMk: "Авторски трудови со DOI. Мислење на авторот, не извор на право.", textEn: "Author papers with DOIs. The author's view, not a source of law." },
    { n: 5, id: "ai", mk: "AI синтеза", en: "AI synthesis",
      textMk: "Помош при истражување врз прикажаните членови. Под Човечка порта.", textEn: "Research assistance over the cited articles. Under the Human Gate." }
  ]);

  // Only these exact backend values mean "active". Anything else — including unknown
  // or misspelled values — stays inactive (fail-closed).
  const LIVE_VALUES = Object.freeze(["live", "live_read_only", "live_corpus"]);
  const isLive = (v) => LIVE_VALUES.includes(v);

  /**
   * Presentation state of one Legal Base card from /api/capabilities.
   * state: "live" | "directory" | "preview" | "locked" | "unknown"
   */
  function capabilityState(key, payload) {
    const caps = payload && payload.capabilities;
    if (!caps || typeof caps !== "object") return { state: "unknown", mk: "СТАТУС НЕПОЗНАТ", en: "STATUS UNKNOWN", active: false };
    const corpora = ((payload.coverage && payload.coverage.articleCorpusInstruments) || []).filter((i) => Number(i.articleCount) > 0);
    const make = (state, mk, en) => ({ state, mk, en, active: state === "live" });
    switch (key) {
      case "laws":
        if (isLive(caps.articleCorpus) && corpora.length) {
          const n = corpora.length;
          return make("live", `LIVE · ${n} ${n === 1 ? "закон" : "закони"} со текст`, `LIVE · ${n} ${n === 1 ? "law" : "laws"} with text`);
        }
        return isLive(caps.instrumentRegistry) ? make("directory", "РЕГИСТАР · БЕЗ ТЕКСТ", "REGISTRY · NO TEXT") : make("unknown", "СТАТУС НЕПОЗНАТ", "STATUS UNKNOWN");
      case "cases":
      case "echr": {
        const v = key === "cases" ? caps.caseLawCorpus : caps.echrCorpus;
        if (isLive(v)) return make("live", "LIVE · ИНДЕКСИРАНО", "LIVE · INDEXED");
        if (v === "directory_only") return make("directory", "ДИРЕКТОРИУМ", "DIRECTORY");
        return make("unknown", "СТАТУС НЕПОЗНАТ", "STATUS UNKNOWN");
      }
      case "versions":
      case "citationAudit": {
        const v = key === "versions" ? caps.versionCompare : caps.citationAudit;
        if (isLive(v)) return make("live", "LIVE", "LIVE");
        if (v === "governed_preview") return make("preview", "PREVIEW · ПОД КОНТРОЛА", "PREVIEW · GOVERNED");
        return make("locked", "ЗАКЛУЧЕНО", "LOCKED");
      }
      case "documents":
        // Both the upload and the workspace must be explicitly live before this card is active.
        if (isLive(caps.documentUpload) && isLive(caps.caseWorkspace)) return make("live", "LIVE", "LIVE");
        return make("locked", "ЗАКЛУЧЕНО · ВО ПОДГОТОВКА", "LOCKED · IN PREPARATION");
      default:
        return make("unknown", "СТАТУС НЕПОЗНАТ", "STATUS UNKNOWN");
    }
  }

  const REVIEW = Object.freeze({
    approved: { mk: "одобрено", en: "approved" },
    reviewed: { mk: "прегледано", en: "reviewed" },
    pending: { mk: "чека проверка", en: "pending review" },
    rejected: { mk: "одбиено", en: "rejected" }
  });
  const reviewLabel = (v, lang) => (REVIEW[v] || REVIEW.pending)[lang === "en" ? "en" : "mk"];

  const VERSION_CLASSES = Object.freeze({
    original_text: { mk: "Оригинален текст", en: "Original text" },
    official_consolidated: { mk: "Официјален пречистен текст", en: "Official consolidated text" },
    dated_snapshot: { mk: "Датумски снимок", en: "Dated snapshot" },
    reference_consolidation: { mk: "Референтна консолидација (не е официјален пречистен текст)", en: "Reference consolidation (not an official consolidated text)" },
    amendment_text: { mk: "Текст на измена", en: "Amendment text" },
    other: { mk: "Друго", en: "Other" }
  });

  /**
   * Status category of a version as reported by the backend. Order of checks matters:
   * "approved_current" requires BOTH isCurrent and an approved Human Gate.
   */
  function versionCategory(v) {
    if (!v || v.legacyUnversioned) return "legacy";
    if (v.isCurrent && v.humanReviewStatus === "approved") return "approved_current";
    if (v.humanReviewStatus === "rejected") return "rejected";
    if (v.class === "reference_consolidation") return "reference";
    if (v.validTo) return "historical_window";
    return "pending_review";
  }
  const VERSION_CATEGORY_LABELS = Object.freeze({
    approved_current: { mk: "ТЕКОВНА · ОДОБРЕНА (Human Gate)", en: "CURRENT · APPROVED (Human Gate)" },
    reference: { mk: "РЕФЕРЕНТНА КОНСОЛИДАЦИЈА · ЧЕКА ПРОВЕРКА", en: "REFERENCE CONSOLIDATION · PENDING REVIEW" },
    historical_window: { mk: "ВЕРЗИЈА СО КРАЕН ДАТУМ · НЕ Е ТЕКОВНО ПОТВРДЕНА", en: "VERSION WITH END DATE · NOT CONFIRMED AS CURRENT" },
    pending_review: { mk: "ЧЕКА ПРОВЕРКА · НЕ Е ТЕКОВНО ПОТВРДЕНА", en: "PENDING REVIEW · NOT CONFIRMED AS CURRENT" },
    rejected: { mk: "ОДБИЕНА (Human Gate)", en: "REJECTED (Human Gate)" },
    legacy: { mk: "БЕЗ ВЕРЗИСКИ МЕТАПОДАТОЦИ (legacy)", en: "NO VERSION METADATA (legacy)" }
  });
  const versionCategoryLabel = (v, lang) => VERSION_CATEGORY_LABELS[versionCategory(v)][lang === "en" ? "en" : "mk"];

  /** Rows for a version metadata table, values copied from the backend (null → "—"). */
  function versionRows(v, lang) {
    const en = lang === "en";
    const dash = "—";
    if (!v) return [];
    return [
      [en ? "Version" : "Верзија", v.legacyUnversioned ? (en ? "legacy (no version metadata)" : "legacy (без верзиски метаподатоци)") : (v.label || dash)],
      [en ? "Text type (version_class)" : "Вид на текст (version_class)", v.class ? (VERSION_CLASSES[v.class] || { mk: v.class, en: v.class })[en ? "en" : "mk"] : dash],
      ["valid_from", v.validFrom || dash],
      ["application_from", v.applicationFrom || dash],
      ["valid_to", v.validTo ? `${v.validTo} ${en ? "(exclusive)" : "(не вклучувајќи)"}` : dash],
      [en ? "Source issue" : "Службен весник", [v.sourceIssueNumber, v.sourceIssueDate].filter(Boolean).join(" · ") || dash],
      ["Human Gate", reviewLabel(v.humanReviewStatus, lang)],
      [en ? "Status" : "Статус", versionCategoryLabel(v, lang)]
    ];
  }

  /** Article label from the backend's publicStatus (computed server-side in articlePublicStatus). */
  const ARTICLE_STATUS = Object.freeze({
    current_verified: { mk: "ТЕКОВЕН · ПРОВЕРЕН", en: "CURRENT · VERIFIED", tone: "ok" },
    verified: { mk: "ПРОВЕРЕН", en: "VERIFIED", tone: "ok" },
    version_review: { mk: "ПРОВЕРКА НА ВЕРЗИЈА", en: "VERSION REVIEW", tone: "pending" },
    historical: { mk: "ИСТОРИСКИ СНИМОК", en: "HISTORICAL SNAPSHOT", tone: "pending" },
    pending: { mk: "ЧЕКА ПРОВЕРКА", en: "PENDING REVIEW", tone: "pending" }
  });
  const articleStatus = (publicStatus, lang) => {
    const s = ARTICLE_STATUS[publicStatus] || ARTICLE_STATUS.pending;
    return { label: s[lang === "en" ? "en" : "mk"], tone: s.tone };
  };

  /** Layers of a law in the registry, from /api/instruments fields only. */
  function instrumentLayers(inst, lang) {
    const en = lang === "en";
    const layers = [];
    layers.push({ id: "metadata", present: true, label: en ? "Official metadata" : "Официјални метаподатоци" });
    layers.push({ id: "source", present: Boolean(inst && inst.canonicalSourceUrl), label: en ? "Linked official source" : "Поврзан официјален извор" });
    layers.push({ id: "text", present: Number(inst && inst.articleCount) > 0,
      label: Number(inst && inst.articleCount) > 0 ? (en ? `Article-level text · ${inst.articleCount} articles` : `Текст член-по-член · ${inst.articleCount} членови`) : (en ? "No article-level text" : "Нема текст член-по-член") });
    layers.push({ id: "review", present: inst && inst.humanReviewStatus === "approved", label: `Human Gate: ${reviewLabel(inst && inst.humanReviewStatus, lang)}` });
    return layers;
  }

  // ---------------------------------------------------------------------------
  // Citation audit (PREVIEW). The system only ever reports whether a source could be
  // found ("unresolved": found, needs human judgement) or not ("source_unavailable").
  // "supported" / "unsupported" exist only as the user's own recorded verdict.
  // ---------------------------------------------------------------------------
  const AUDIT_STATES = Object.freeze({
    supported: { mk: "ПОДДРЖАНО — ваша оцена", en: "SUPPORTED — your assessment", system: false },
    unsupported: { mk: "НЕ Е ПОДДРЖАНО — ваша оцена", en: "UNSUPPORTED — your assessment", system: false },
    unresolved: { mk: "НЕРАЗРЕШЕНО — изворот е пронајден, потребна е човечка проверка", en: "UNRESOLVED — source found, human verification required", system: true },
    source_unavailable: { mk: "ИЗВОРОТ НЕ Е ДОСТАПЕН", en: "SOURCE UNAVAILABLE", system: true }
  });
  const auditLabel = (state, lang) => (AUDIT_STATES[state] || AUDIT_STATES.source_unavailable)[lang === "en" ? "en" : "mk"];

  const DOI_RE = /^10\.\d{4,9}\/[^\s]+$/;
  function normalizeDoi(input) {
    const s = String(input || "").trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
    return DOI_RE.test(s) ? s : null;
  }

  /** DOI against the portal's own registry (/api/zenodo). Never contacts doi.org. */
  function classifyDoi(input, records) {
    const doi = normalizeDoi(input);
    if (!doi) return { state: "source_unavailable", reason: "invalid_doi", doi: null };
    const rec = (records || []).find((r) => String(r.doi).toLowerCase() === doi.toLowerCase());
    if (!rec) return { state: "source_unavailable", reason: "not_in_portal_registry", doi };
    if (rec.status !== "published" || !rec.publicUrl) return { state: "source_unavailable", reason: "not_published", doi };
    return { state: "unresolved", reason: "published_record", doi, record: rec };
  }

  function officialSourceFor(url) {
    let host;
    try { host = new URL(String(url)).hostname.replace(/^www\./, ""); } catch { return null; }
    return OFFICIAL_SOURCES.find((s) => new URL(s.url).hostname.replace(/^www\./, "") === host) || null;
  }

  /** Classification of a source URL. The page never fetches third-party sites. */
  function classifySourceUrl(input) {
    const raw = String(input || "").trim();
    if (!/^https:\/\//i.test(raw)) return { state: "source_unavailable", reason: "invalid_url" };
    const official = officialSourceFor(raw);
    return official
      ? { state: "unresolved", reason: "official_directory", source: official }
      : { state: "unresolved", reason: "unlisted_source" };
  }

  /**
   * Article citation from an /api/articles response (or its error).
   * found → "unresolved" (show the text for human comparison); anything else → unavailable.
   */
  function classifyArticleLookup(status, body) {
    if (!body) return { state: "source_unavailable", reason: "service_unavailable" };
    if (body.ok && Array.isArray(body.articles) && body.articles.length) return { state: "unresolved", reason: "article_found", article: body.articles[0] };
    if (body.ok) return { state: "source_unavailable", reason: "article_not_in_corpus" };
    if (body.error === "instrument_not_found") return { state: "source_unavailable", reason: "instrument_not_found" };
    if (body.error === "no_articles") return { state: "source_unavailable", reason: "no_articles" };
    if (String(body.error || "").startsWith("version_")) return { state: "source_unavailable", reason: "version_unresolved", versions: body.versions || [] };
    return { state: "source_unavailable", reason: status >= 500 ? "service_unavailable" : "lookup_failed" };
  }

  const AUDIT_REASONS = Object.freeze({
    invalid_doi: { mk: "Внесениот текст не е DOI (формат 10.xxxx/…).", en: "The input is not a DOI (format 10.xxxx/…)." },
    not_in_portal_registry: { mk: "DOI-то не е во регистарот на порталот. Порталот не проверува надворешни DOI — отворете го doi.org сами.", en: "The DOI is not in the portal's registry. The portal does not check external DOIs — open doi.org yourself." },
    not_published: { mk: "DOI-то е резервирано, но записот не е објавен. Не смее да се цитира како објавен труд.", en: "The DOI is reserved but the record is not published. It must not be cited as a published work." },
    published_record: { mk: "Објавен запис. Отворете го и проверете дали ја поддржува тврдњата.", en: "Published record. Open it and check whether it supports the claim." },
    invalid_url: { mk: "Внесете целосна https:// адреса на изворот.", en: "Enter a full https:// address of the source." },
    official_directory: { mk: "Адресата е од официјален извор во директориумот. Отворете ја и споредете ја со тврдњата.", en: "The address belongs to an official source in the directory. Open it and compare it with the claim." },
    unlisted_source: { mk: "Изворот не е во официјалниот директориум на порталот. Проверете ја неговата веродостојност пред употреба.", en: "The source is not in the portal's official directory. Check its reliability before use." },
    article_found: { mk: "Членот е пронајден во корпусот. Споредете го текстот со тврдњата — системот не одлучува наместо вас.", en: "The article was found in the corpus. Compare its text with the claim — the system does not decide for you." },
    article_not_in_corpus: { mk: "Таков член не постои во внесениот корпус за овој закон.", en: "No such article exists in the loaded corpus for this law." },
    instrument_not_found: { mk: "Законот не е во регистарот.", en: "The law is not in the registry." },
    no_articles: { mk: "За овој закон нема внесен текст член-по-член.", en: "This law has no article-level text." },
    version_unresolved: { mk: "Верзијата не може безбедно да се утврди. Наведете датум.", en: "The version cannot be resolved safely. Enter a date." },
    service_unavailable: { mk: "Услугата привремено не е достапна.", en: "The service is temporarily unavailable." },
    lookup_failed: { mk: "Барањето не успеа.", en: "The lookup failed." },
    case_corpus_disabled: { mk: "Индексираната судска практика не е вклучена. Проверете ја одлуката во официјалната база на судот.", en: "Indexed case law is not enabled. Check the decision in the court's official database." }
  });
  const auditReason = (reason, lang) => (AUDIT_REASONS[reason] || AUDIT_REASONS.lookup_failed)[lang === "en" ? "en" : "mk"];

  /**
   * Word-level text comparison (LCS). Purely textual: it says which words differ,
   * never what the legal effect is.
   */
  function diffWords(a, b, maxWords) {
    const limit = maxWords || 4000;
    const A = String(a || "").split(/(\s+)/).filter((x) => x !== "");
    const B = String(b || "").split(/(\s+)/).filter((x) => x !== "");
    if (A.length > limit || B.length > limit) return null;
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    const push = (type, text) => { const last = out[out.length - 1]; if (last && last.type === type) last.text += text; else out.push({ type, text }); };
    while (i < n && j < m) {
      if (A[i] === B[j]) { push("same", A[i]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { push("removed", A[i]); i++; }
      else { push("added", B[j]); j++; }
    }
    while (i < n) push("removed", A[i++]);
    while (j < m) push("added", B[j++]);
    return out;
  }

  /** Start of a version's window, usable as a date for /api/articles (null when unknown). */
  const versionStartDate = (v) => (v && (v.applicationFrom || v.validFrom)) || null;

  const api = {
    OFFICIAL_SOURCES, JURISDICTION_LABELS, LAYERS, LIVE_VALUES, AUDIT_STATES,
    capabilityState, reviewLabel, versionCategory, versionCategoryLabel, versionRows,
    articleStatus, instrumentLayers, auditLabel, auditReason, normalizeDoi, classifyDoi,
    classifySourceUrl, classifyArticleLookup, officialSourceFor, diffWords, versionStartDate
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LegalBase = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis);
