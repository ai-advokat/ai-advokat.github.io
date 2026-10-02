/*
 * AI Advokat — ZPP (Закон за парничната постапка) public version timeline.
 *
 * Static, human-verified OFFICIAL METADATA only (Official Gazette numbers and dates
 * from LDBIS), as supplied for publication on 2 October 2026. No legal text, no
 * article data, no status computed from the corpus.
 *
 * The "phase" labels below are statements valid AS OF `statusAsOf`. They are never
 * recomputed from the clock: after `statusReviewBy` the UI withdraws them and shows
 * "re-check required" instead (fail-closed), until a human updates this file.
 * Human Gate status is never stored here; it is read from /api/instruments.
 *
 * Loaded by index.html as a classic script (window.ZppTimeline) and by the Node
 * tests as CommonJS (module.exports).
 */
(function (root) {
  "use strict";

  const LDBIS = "https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=";

  const ZPP_TIMELINE = Object.freeze({
    instrumentKey: "mk:zpp",
    title: { mk: "Закон за парничната постапка", en: "Law on Civil Procedure" },
    short: { mk: "ЗПП", en: "ZPP" },
    statusAsOf: "2026-10-02",
    // Last day on which the phase labels below are still correct without review:
    // the day before the new law begins to apply.
    statusReviewBy: "2027-01-17",
    items: Object.freeze([
      Object.freeze({
        id: "zpp-7-2011",
        gazette: "7/2011",
        kind: "consolidated",
        kindLabel: { mk: "Пречистена верзија", en: "Consolidated version" },
        title: { mk: "Закон за парничната постапка (пречистен текст)", en: "Law on Civil Procedure (consolidated text)" },
        published: "2011-01-20",
        entryIntoForce: null,
        applicationFrom: null,
        terminationShownByLdbis: null,
        track: "pre2027",
        phase: "reference",
        sourceLabel: { mk: "LDBIS — официјални метаподатоци", en: "LDBIS — official metadata" },
        sourceUrl: LDBIS + "10692"
      }),
      Object.freeze({
        id: "zpp-124-2015",
        gazette: "124/2015",
        kind: "amendment",
        kindLabel: { mk: "Закон за изменување и дополнување", en: "Amending law" },
        title: { mk: "Закон за изменување и дополнување на Законот за парничната постапка", en: "Law amending and supplementing the Law on Civil Procedure" },
        published: "2015-07-23",
        entryIntoForce: "2015-07-31",
        applicationFrom: "2016-01-31",
        terminationShownByLdbis: "2027-01-18",
        track: "pre2027",
        phase: "current_track",
        sourceLabel: { mk: "LDBIS — официјални метаподатоци", en: "LDBIS — official metadata" },
        sourceUrl: LDBIS + "37950"
      }),
      Object.freeze({
        id: "zpp-151-2026",
        gazette: "151/2026",
        kind: "new_law",
        kindLabel: { mk: "Нов закон", en: "New law" },
        title: { mk: "Закон за парничната постапка (нов)", en: "Law on Civil Procedure (new)" },
        published: "2026-07-08",
        entryIntoForce: "2026-07-16",
        applicationFrom: "2027-01-18",
        terminationShownByLdbis: null,
        track: "from2027",
        phase: "future_application",
        sourceLabel: { mk: "LDBIS — официјални метаподатоци", en: "LDBIS — official metadata" },
        sourceUrl: LDBIS + "74234"
      })
    ])
  });

  // Phase labels: conservative wording; none of them says "current consolidated".
  const PHASES = Object.freeze({
    reference: {
      mk: "Историски / референтен текст",
      en: "Historical / reference text",
      noteMk: "Пречистен текст што е основа на патеката пред 2027. Измените по 2011 (124/2015) не се дел од него.",
      noteEn: "Consolidated text forming the basis of the pre-2027 track. Later amendments (124/2015) are not part of it."
    },
    current_track: {
      mk: "Применлива патека до почетокот на примената на 151/2026 · не е потврдена како тековен пречистен текст",
      en: "Applicable track until 151/2026 begins to apply · not confirmed as a current consolidated text",
      noteMk: "Заедно со пречистениот текст 7/2011, оваа измена ја сочинува патеката што се применува до почетокот на примената на новиот закон.",
      noteEn: "Together with the 7/2011 consolidated text, this amendment forms the track that applies until the new law begins to apply."
    },
    future_application: {
      mk: "Објавен и стапен во сила; примена од 18.01.2027",
      en: "Published and in force; application begins 18 January 2027",
      noteMk: "Законот е во сила, но неговите одредби сè уште не се применуваат.",
      noteEn: "The law is in force, but its provisions do not apply yet."
    },
    stale: {
      mk: "ПОТРЕБНА Е ПОВТОРНА ПРОВЕРКА",
      en: "RE-CHECK REQUIRED",
      noteMk: "Ознаката за состојба е застарена. Проверете ги официјалните метаподатоци; картичката чека ажурирање преку Human Gate.",
      noteEn: "The status label is out of date. Check the official metadata; this card awaits a Human Gate update."
    }
  });

  const DATE_LABELS = Object.freeze({
    published: { mk: "Објавен", en: "Published" },
    entryIntoForce: { mk: "Стапил во сила", en: "Entered into force" },
    applicationFrom: { mk: "Примена од", en: "Applicable from" },
    terminationShownByLdbis: { mk: "Престанок (според LDBIS)", en: "Termination (as shown by LDBIS)" }
  });

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  function formatDate(iso, lang) {
    if (!iso || !ISO.test(iso)) return null;
    const [y, m, d] = iso.split("-");
    return lang === "en" ? new Date(Date.UTC(+y, +m - 1, +d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : `${d}.${m}.${y}`;
  }

  /** Phase labels are withdrawn after statusReviewBy (fail-closed; never recomputed). */
  function isStale(todayIso, timeline) {
    const t = timeline || ZPP_TIMELINE;
    return typeof todayIso === "string" && ISO.test(todayIso) && todayIso > t.statusReviewBy;
  }

  function phaseFor(item, todayIso, timeline) {
    const key = isStale(todayIso, timeline) ? "stale" : item.phase;
    return { key, ...PHASES[key] };
  }

  /**
   * Date rows. Publication, entry into force and application are always listed; a
   * date the official metadata does not state is shown as "not stated", never guessed.
   * The LDBIS termination date is listed only where LDBIS shows one.
   */
  function dateRows(item, lang) {
    const notStated = lang === "en" ? "not stated in the metadata" : "не е наведено во метаподатоците";
    return ["published", "entryIntoForce", "applicationFrom", "terminationShownByLdbis"]
      .filter((k) => k !== "terminationShownByLdbis" || item[k])
      .map((k) => ({ key: k, label: DATE_LABELS[k][lang === "en" ? "en" : "mk"], value: item[k] ? formatDate(item[k], lang) : notStated, iso: item[k] || null }));
  }

  /**
   * Human Gate label from /api/instruments (instrument-level). Unknown when the API
   * did not answer — never assumed approved.
   */
  function humanGateLabel(instrument, lang) {
    const en = lang === "en";
    const v = instrument && instrument.humanReviewStatus;
    const map = { approved: ["одобрено", "approved"], reviewed: ["прегледано", "reviewed"], pending: ["чека проверка", "pending review"], rejected: ["одбиено", "rejected"] };
    if (!v) return en ? "unknown (registry unavailable)" : "непознато (регистарот не е достапен)";
    const pair = map[v] || map.pending;
    return en ? pair[1] : pair[0];
  }

  /** Internal consistency of the published metadata (used by tests and shown nowhere). */
  function consistencyProblems(timeline) {
    const t = timeline || ZPP_TIMELINE;
    const out = [];
    for (const it of t.items) {
      for (const k of ["published", "entryIntoForce", "applicationFrom", "terminationShownByLdbis"]) {
        if (it[k] !== null && !ISO.test(it[k])) out.push(`${it.id}.${k} is not ISO`);
      }
      if (it.entryIntoForce && it.entryIntoForce < it.published) out.push(`${it.id}: in force before publication`);
      if (it.applicationFrom && it.entryIntoForce && it.applicationFrom < it.entryIntoForce) out.push(`${it.id}: applies before entry into force`);
      if (!/^https:\/\/ldbis\.pravda\.gov\.mk\//.test(it.sourceUrl)) out.push(`${it.id}: source is not LDBIS https`);
    }
    const amend = t.items.find((i) => i.id === "zpp-124-2015");
    const next = t.items.find((i) => i.id === "zpp-151-2026");
    if (amend.terminationShownByLdbis !== next.applicationFrom) out.push("pre-2027 track does not end when 151/2026 begins to apply");
    if (!(t.statusReviewBy < next.applicationFrom)) out.push("statusReviewBy must precede the new application date");
    return out;
  }

  const api = { ZPP_TIMELINE, PHASES, DATE_LABELS, formatDate, isStale, phaseFor, dateRows, humanGateLabel, consistencyProblems };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ZppTimeline = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis);
