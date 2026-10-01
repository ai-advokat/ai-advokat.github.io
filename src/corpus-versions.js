// AI Advokat — version-aware corpus resolution (Corpus Safety Foundation, F4).
//
// One request is answered from exactly ONE instrument version. Articles from
// different versions (e.g. the 2005 and the 151/2026 Law on Civil Procedure)
// are never mixed. When the applicable version cannot be determined safely,
// the caller receives a controlled error instead of a guess.
//
// Date semantics (ISO YYYY-MM-DD, compared as strings):
//   start = application_from ?? valid_from   (start of application, inclusive)
//   end   = valid_to                         (exclusive: first day it no longer applies)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/** Validates an optional user-supplied reference date. */
export function parseQueryDate(value) {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };
  const s = String(value).trim();
  if (!ISO_DATE.test(s)) return { ok: false, error: "invalid_date" };
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return { ok: false, error: "invalid_date" };
  return { ok: true, date: s };
}

export function versionWindow(v) {
  return { start: v?.application_from || v?.valid_from || null, end: v?.valid_to || null };
}

function inWindow(w, date) {
  if (!w.start) return false;
  return w.start <= date && (!w.end || date < w.end);
}

export function summarizeVersion(v, articleCount = null) {
  if (!v) return { id: null, label: "legacy-unversioned", class: null, legacyUnversioned: true,
    validFrom: null, applicationFrom: null, validTo: null, isCurrent: false, humanReviewStatus: "pending", articleCount };
  return {
    id: v.id,
    label: v.version_label,
    class: v.version_class ?? null,
    legacyUnversioned: false,
    validFrom: v.valid_from ?? null,
    applicationFrom: v.application_from ?? null,
    validTo: v.valid_to ?? null,
    isCurrent: Number(v.is_current) === 1,
    humanReviewStatus: v.human_review_status ?? "pending",
    sourceIssueNumber: v.source_issue_number ?? null,
    sourceIssueDate: v.source_issue_date ?? null,
    articleCount
  };
}

/**
 * Pure decision function.
 *   groups:   [{ versionId: number|null, count: number }]  article rows per version
 *   versions: Map(id -> instrument_versions row)
 * Returns { ok: true, versionId, version, basis } or { ok: false, error, versions }.
 */
export function chooseVersion(groups, versions, { date = null, today = todayIso() } = {}) {
  const summaries = () => groups.map(g => summarizeVersion(g.versionId === null ? null : versions.get(g.versionId), g.count));
  if (!groups.length) return { ok: false, error: "no_articles", versions: [] };

  if (groups.length === 1) {
    const g = groups[0];
    if (g.versionId === null) {
      // Legacy corpus imported before version binding: usable, but it cannot prove
      // that it applied on an arbitrary historical/future date.
      if (date) return { ok: false, error: "version_date_unverifiable", versions: summaries() };
      return { ok: true, versionId: null, version: null, basis: "single_unversioned" };
    }
    const v = versions.get(g.versionId);
    if (!v) return { ok: false, error: "version_metadata_missing", versions: summaries() };
    const w = versionWindow(v);
    if (date) {
      if (!w.start) return { ok: false, error: "version_date_unverifiable", versions: summaries() };
      if (!inWindow(w, date)) return { ok: false, error: "version_not_applicable_on_date", versions: summaries() };
      return { ok: true, versionId: v.id, version: v, basis: "date" };
    }
    if (w.start && w.start > today) return { ok: false, error: "version_not_yet_applicable", versions: summaries() };
    if (w.end && w.end <= today) return { ok: false, error: "version_no_longer_applicable", versions: summaries() };
    return { ok: true, versionId: v.id, version: v, basis: "single_version" };
  }

  // Several article sets for one instrument.
  if (groups.some(g => g.versionId === null)) return { ok: false, error: "version_ambiguous", versions: summaries() };
  const vs = groups.map(g => versions.get(g.versionId)).filter(Boolean);
  if (vs.length !== groups.length) return { ok: false, error: "version_metadata_missing", versions: summaries() };

  if (date) {
    const hits = vs.filter(v => inWindow(versionWindow(v), date));
    if (hits.length === 1) return { ok: true, versionId: hits[0].id, version: hits[0], basis: "date" };
    return { ok: false, error: hits.length ? "version_ambiguous" : "version_not_applicable_on_date", versions: summaries() };
  }

  // No date: only a version that the Human Gate approved as current and that applies today.
  const current = vs.filter(v => {
    const w = versionWindow(v);
    return Number(v.is_current) === 1 && v.human_review_status === "approved"
      && (!w.start || w.start <= today) && (!w.end || today < w.end);
  });
  if (current.length === 1) return { ok: true, versionId: current[0].id, version: current[0], basis: "approved_current" };
  return { ok: false, error: "version_required", versions: summaries() };
}

export const VERSION_ERROR_MESSAGES = {
  no_articles: "За избраниот закон нема внесен article-level текст.",
  version_date_unverifiable: "Не може да се потврди која верзија на законот важела на наведениот датум. Проверете ја официјалната верзија.",
  version_not_applicable_on_date: "Ниту една внесена верзија на законот не се применува на наведениот датум.",
  version_not_yet_applicable: "Внесената верзија на законот сè уште не се применува. Наведете датум за да ја прегледате идната верзија.",
  version_no_longer_applicable: "Внесената верзија на законот повеќе не се применува. Наведете датум за историски преглед.",
  version_ambiguous: "Постојат повеќе верзии на законот и не може безбедно да се избере една. Наведете датум.",
  version_required: "Постојат повеќе верзии на законот, а ниту една не е потврдена (Human Gate) како тековна. Наведете датум.",
  version_metadata_missing: "Метаподатоците за верзијата недостасуваат; одговорот е запрен."
};

/** Loads version groups + metadata and decides. D1 errors propagate to the caller. */
export async function resolveInstrumentVersion(env, instrumentId, opts = {}) {
  const groupsResult = await env.DB.prepare(
    `SELECT instrument_version_id AS version_id, COUNT(*) AS n
       FROM legal_article_versions WHERE instrument_id=?
      GROUP BY instrument_version_id`
  ).bind(instrumentId).all();
  const groups = (groupsResult.results ?? []).map(r => ({ versionId: r.version_id === null ? null : Number(r.version_id), count: Number(r.n) }));
  let versions = new Map();
  if (groups.some(g => g.versionId !== null)) {
    // SELECT * stays compatible with databases where 0023 columns do not exist yet.
    const vr = await env.DB.prepare("SELECT * FROM instrument_versions WHERE instrument_id=?").bind(instrumentId).all();
    versions = new Map((vr.results ?? []).map(v => [Number(v.id), v]));
  }
  return chooseVersion(groups, versions, opts);
}

/** Human-readable status warning derived from the resolved version and the article rows. */
export function versionStatusWarning(version, articles) {
  const label = version ? version.version_label : "legacy-unversioned";
  const parts = [];
  if (!version) parts.push(`Текстот е од постоечки корпус без врзана верзија (${label}); тековноста не е потврдена.`);
  else {
    if (version.version_class === "dated_snapshot" || version.version_class === "reference_consolidation") {
      parts.push(`Верзијата „${label}“ е датиран/референтен snapshot и не смее да се третира како тековен текст.`);
    }
    if (!(Number(version.is_current) === 1 && version.human_review_status === "approved")) {
      parts.push(`Верзијата „${label}“ не е Human-Gate потврдена како тековна.`);
    }
  }
  if (articles.some(a => a.status === "needs_version_review")) parts.push("Еден или повеќе релевантни членови се под VERSION REVIEW.");
  if (articles.some(a => a.status === "historical")) parts.push(`Релевантните членови се историски (верзија „${label}“).`);
  if (articles.some(a => a.status === "repealed")) parts.push("Еден или повеќе членови се означени како избришани.");
  return parts.length ? parts.join(" ") : null;
}
