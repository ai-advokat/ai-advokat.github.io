// Legal Base public layer: the presentation helpers in assets/legal-base.js and the
// Legal Base panels in index.html. Non-corpus tests only — no legal data is asserted.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { loadWorker } from "./load-worker.mjs";
import { createD1 } from "./d1-shim.mjs";

const require = createRequire(import.meta.url);
const LB = require("../assets/legal-base.js");
const { worker, workerModule } = await loadWorker();
const index = fs.readFileSync("index.html", "utf8");
const workerSrc = fs.readFileSync("src/index.js", "utf8");
const chatJs = fs.readFileSync("assets/ai-advokat-chat.js", "utf8");
const guideVaultJs = fs.readFileSync("assets/guide-vault.js", "utf8");
const BASE = "https://ai-advokat-github-io.aiadvokat16.workers.dev";

async function liveCapabilities() {
  const { d1 } = createD1();
  const res = await worker.fetch(new Request(BASE + "/api/capabilities"), { DB: d1 }, {});
  return res.json();
}
const fnBody = (name) => {
  const start = index.indexOf(`function ${name}(`);
  assert.ok(start > 0, `${name} not found`);
  const next = index.indexOf("\n  function ", start + 10);
  const nextAsync = index.indexOf("\n  async function ", start + 10);
  const ends = [next, nextAsync].filter((x) => x > 0);
  return index.slice(start, Math.min(...ends));
};

describe("capability states (PREVIEW / LOCKED never appear active)", () => {
  const KEYS = ["laws", "cases", "echr", "versions", "citationAudit", "documents"];
  const NOT_LIVE = [undefined, null, "", "governed_preview", "locked", "directory_only", "LIVE", "Live", " live", "live ",
    "enabled", "active", "true", true, 1, "bound", "not_bound", "blocked", "live_source_backed_ai", "manual_human_gate"];

  test("LB1 only the exact backend values live / live_read_only / live_corpus can activate a card", () => {
    assert.deepEqual([...LB.LIVE_VALUES].sort(), ["live", "live_corpus", "live_read_only"]);
    const fields = ["articleCorpus", "instrumentRegistry", "caseLawCorpus", "echrCorpus", "versionCompare", "citationAudit", "documentUpload", "caseWorkspace"];
    for (const v of NOT_LIVE) {
      const caps = Object.fromEntries(fields.map((f) => [f, v]));
      const payload = { capabilities: caps, coverage: { articleCorpusInstruments: [{ canonicalKey: "mk:x", articleCount: 5 }] } };
      for (const k of KEYS) assert.equal(LB.capabilityState(k, payload).active, false, `${k} active for ${JSON.stringify(v)}`);
    }
  });

  test("LB2 no capabilities (failed or loading) → every card is unknown/locked, never active", () => {
    for (const k of KEYS) {
      for (const payload of [null, undefined, {}, { capabilities: null }, { capabilities: "x" }]) {
        const st = LB.capabilityState(k, payload);
        assert.equal(st.active, false, k);
        assert.notEqual(st.state, "live", k);
      }
    }
  });

  test("LB3 documents need BOTH upload and workspace explicitly live", () => {
    const st = (u, w) => LB.capabilityState("documents", { capabilities: { documentUpload: u, caseWorkspace: w } });
    assert.equal(st("live", "locked").active, false);
    assert.equal(st("locked", "live").active, false);
    assert.equal(st("locked", "locked").state, "locked");
    assert.equal(st("live", "live").active, true);
  });

  test("LB4 against the real Worker: versions and citation audit are PREVIEW, documents LOCKED, case law and ECHR DIRECTORY", async () => {
    const caps = await liveCapabilities();
    assert.equal(LB.capabilityState("versions", caps).state, "preview");
    assert.equal(LB.capabilityState("citationAudit", caps).state, "preview");
    assert.equal(LB.capabilityState("documents", caps).state, "locked");
    assert.equal(LB.capabilityState("cases", caps).state, "directory");
    assert.equal(LB.capabilityState("echr", caps).state, "directory");
    for (const k of ["versions", "citationAudit", "documents", "cases", "echr"]) assert.equal(LB.capabilityState(k, caps).active, false, k);
    assert.match(LB.capabilityState("versions", caps).mk, /PREVIEW/);
    assert.match(LB.capabilityState("documents", caps).mk, /ЗАКЛУЧЕНО/);
  });

  test("LB5 the homepage renders card states only through LegalBase.capabilityState and never hard-codes them", () => {
    for (const m of index.matchAll(/<span class="cardState" data-cap="([a-zA-Z]+)"[^>]*>([^<]*)<\/span>/g)) {
      assert.equal(m[2], "…", `card ${m[1]} must start as "…", got "${m[2]}"`);
    }
    const caps = [...index.matchAll(/data-cap="([a-zA-Z]+)"/g)].map((m) => m[1]).sort();
    assert.deepEqual(caps, ["citationAudit", "documents", "echr", "laws", "versions", "cases"].sort());
    const render = fnBody("renderCapabilityLabels");
    assert.match(render, /LB\.capabilityState\(key/);
    assert.ok(!/set\("(versions|citationAudit|documents)"/.test(render), "no direct per-card overrides");
  });
});

describe("official sources and labels", () => {
  test("LO1 the front-end directory mirrors the Worker's PUBLIC_WEB_SOURCES exactly", async () => {
    const res = await worker.fetch(new Request(BASE + "/api/web-sources"), {}, {});
    const body = await res.json();
    const pick = (x) => ({ id: x.id, url: x.url, jurisdiction: x.jurisdiction, category: x.category });
    assert.deepEqual(LB.OFFICIAL_SOURCES.map(pick), body.sources.map(pick));
  });

  test("LO2 every official link is https; every external link in the Legal Base code is on an allowed host", () => {
    for (const s of LB.OFFICIAL_SOURCES) assert.match(s.url, /^https:\/\/[a-z0-9.-]+\/$/);
    const allowed = new Set([...LB.OFFICIAL_SOURCES.map((s) => new URL(s.url).hostname), "doi.org", "zenodo.org", "orcid.org", "ai-advokat.github.io", "ai-advokat-github-io.aiadvokat16.workers.dev"]);
    const code = fs.readFileSync("assets/legal-base.js", "utf8") + index.slice(index.indexOf("const LB=window.LegalBase;"), index.indexOf("function currentMembershipKey(){"));
    for (const m of code.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) assert.ok(allowed.has(m[1].toLowerCase()), `unexpected host ${m[1]}`);
  });

  test("LO3 ECHR and EU sources are labelled with their own jurisdiction, never as Macedonian law", () => {
    const hudoc = LB.OFFICIAL_SOURCES.find((s) => s.id === "hudoc");
    const eurlex = LB.OFFICIAL_SOURCES.find((s) => s.id === "eur-lex");
    assert.equal(hudoc.jurisdiction, "ECHR");
    assert.equal(eurlex.jurisdiction, "EU");
    assert.ok(!/Македонија|Macedonia/.test(LB.JURISDICTION_LABELS.ECHR.mk + LB.JURISDICTION_LABELS.EU.en));
    assert.match(fnBody("openInternationalRegistry"), /Не се прикажуваат како македонски прописи/);
  });

  test("LO4 article labels map exactly the Worker's publicStatus values; only current_verified reads as current", () => {
    const fn = workerSrc.slice(workerSrc.indexOf("function articlePublicStatus("), workerSrc.indexOf("}", workerSrc.indexOf("function articlePublicStatus(")) + 200);
    const statuses = [...new Set([...fn.matchAll(/return "([a-z_]+)"/g)].map((m) => m[1]))];
    assert.ok(statuses.length >= 4, statuses.join(","));
    for (const s of statuses) assert.notEqual(LB.articleStatus(s, "mk").label, undefined, s);
    for (const s of [...statuses, "unknown", undefined, "current_consolidated"]) {
      const label = LB.articleStatus(s, "mk").label;
      if (s !== "current_verified") assert.ok(!/ТЕКОВЕН/.test(label), `${s} must not read as current (${label})`);
    }
    assert.equal(LB.articleStatus("current_verified", "mk").label, "ТЕКОВЕН · ПРОВЕРЕН");
  });

  test("LO5 a version is 'current' only when the backend marks it current AND approved", () => {
    const combos = [];
    for (const isCurrent of [true, false]) for (const review of ["approved", "reviewed", "pending", "rejected", undefined])
      for (const cls of [null, "official_consolidated", "reference_consolidation", "original_text"]) for (const validTo of [null, "2027-01-18"])
        combos.push({ label: "v", isCurrent, humanReviewStatus: review, class: cls, validTo, legacyUnversioned: false });
    for (const v of combos) {
      const cat = LB.versionCategory(v);
      const current = /ТЕКОВНА · ОДОБРЕНА/.test(LB.versionCategoryLabel(v, "mk"));
      assert.equal(cat === "approved_current", v.isCurrent && v.humanReviewStatus === "approved", JSON.stringify(v));
      assert.equal(current, cat === "approved_current", JSON.stringify(v));
    }
    assert.equal(LB.versionCategory({ legacyUnversioned: true, isCurrent: true, humanReviewStatus: "approved" }), "legacy");
    assert.equal(LB.versionCategory(null), "legacy");
  });

  test("LO6 the version table shows the backend fields verbatim (valid_from, application_from, valid_to, issue, class, Human Gate)", () => {
    const v = { label: "track-a", class: "reference_consolidation", validFrom: "2016-01-31", applicationFrom: null, validTo: "2027-01-18", isCurrent: true, humanReviewStatus: "pending", sourceIssueNumber: "124/2015", sourceIssueDate: "2015-07-23", legacyUnversioned: false };
    const rows = Object.fromEntries(LB.versionRows(v, "mk"));
    assert.equal(rows.valid_from, "2016-01-31");
    assert.equal(rows.application_from, "—");
    assert.match(rows.valid_to, /^2027-01-18 /);
    assert.equal(rows["Службен весник"], "124/2015 · 2015-07-23");
    assert.match(rows["Вид на текст (version_class)"], /Референтна консолидација/);
    assert.equal(rows["Human Gate"], "чека проверка");
    assert.ok(!/ТЕКОВНА/.test(rows["Статус"]), "marked current but pending must not read as current");
  });

  test("LO7 law registry layers come only from /api/instruments fields", () => {
    const layers = LB.instrumentLayers({ articleCount: 0, humanReviewStatus: "pending", canonicalSourceUrl: null }, "mk");
    assert.deepEqual(layers.map((l) => [l.id, l.present]), [["metadata", true], ["source", false], ["text", false], ["review", false]]);
    const full = LB.instrumentLayers({ articleCount: 298, humanReviewStatus: "approved", canonicalSourceUrl: "https://ldbis.pravda.gov.mk/" }, "en");
    assert.ok(full.every((l) => l.present));
  });
});

describe("citation audit (PREVIEW) never decides support on its own", () => {
  const SYSTEM_STATES = new Set(["unresolved", "source_unavailable"]);
  const records = workerModule.ZENODO_RECORDS;

  test("CA1 DOI: published → unresolved (needs human check); reserved draft → unavailable; unknown/invalid → unavailable", () => {
    for (const r of records) {
      const c = LB.classifyDoi(r.doi, records);
      assert.equal(c.state, r.status === "published" ? "unresolved" : "source_unavailable", r.doi);
      if (r.status !== "published") assert.equal(c.reason, "not_published");
    }
    assert.equal(LB.classifyDoi("https://doi.org/" + records[0].doi, records).state, "unresolved");
    assert.equal(LB.classifyDoi("10.9999/unknown", records).reason, "not_in_portal_registry");
    assert.equal(LB.classifyDoi("not a doi", records).reason, "invalid_doi");
  });

  test("CA2 no system path returns 'supported' or 'unsupported'", () => {
    const outputs = [
      ...["", "x", "10.5281/zenodo.1", records[0].doi].map((d) => LB.classifyDoi(d, records)),
      ...["", "http://slvesnik.com.mk/", "https://slvesnik.com.mk/x", "https://example.com/a"].map(LB.classifySourceUrl),
      LB.classifyArticleLookup(200, { ok: true, articles: [{ articleNumber: "1", text: "t" }] }),
      LB.classifyArticleLookup(200, { ok: true, articles: [] }),
      LB.classifyArticleLookup(404, { ok: false, error: "instrument_not_found" }),
      LB.classifyArticleLookup(404, { ok: false, error: "no_articles" }),
      LB.classifyArticleLookup(409, { ok: false, error: "version_required", versions: [] }),
      LB.classifyArticleLookup(503, null),
      LB.classifyArticleLookup(500, { ok: false })
    ];
    for (const o of outputs) assert.ok(SYSTEM_STATES.has(o.state), JSON.stringify(o));
    assert.equal(LB.AUDIT_STATES.supported.system, false);
    assert.equal(LB.AUDIT_STATES.unsupported.system, false);
    assert.match(LB.auditLabel("supported", "mk"), /ваша оцена/);
  });

  test("CA3 the audit panel never rewrites the citation and never stores the user's verdict", () => {
    const body = fnBody("openCitationAudit");
    assert.ok(!/localStorage|sessionStorage|fetch\([^)]*method:"POST"/.test(body), "verdicts must not be stored or sent");
    assert.match(body, /Цитатот не е изменет или „поправен“/);
    assert.ok(!/\.value\s*=\s*(?!"")/.test(body.replace(/s\.value=String\(sel\)/, "")), "inputs must not be overwritten");
  });

  test("CA4 official-directory URLs are recognised; others are flagged as unlisted", () => {
    assert.equal(LB.classifySourceUrl("https://www.vrhoven.sud.mk/abc").source.id, "supreme-court");
    assert.equal(LB.classifySourceUrl("https://hudoc.echr.coe.int/eng?i=001").source.id, "hudoc");
    assert.equal(LB.classifySourceUrl("https://example.com/").reason, "unlisted_source");
    assert.equal(LB.classifySourceUrl("http://slvesnik.com.mk/").state, "source_unavailable");
  });
});

describe("versions, case law, documents", () => {
  test("VD1 the textual diff reconstructs both texts and does not interpret them", () => {
    const a = "(1) Рокот е 30 дена.", b = "(1) Рокот е 15 дена и се продолжува.";
    const d = LB.diffWords(a, b);
    assert.equal(d.filter((p) => p.type !== "added").map((p) => p.text).join(""), a);
    assert.equal(d.filter((p) => p.type !== "removed").map((p) => p.text).join(""), b);
    assert.deepEqual(LB.diffWords(a, a), [{ type: "same", text: a }]);
    assert.equal(LB.diffWords("x ".repeat(5000), "y", 4000), null);
    assert.match(fnBody("openVersionsWorkspace"), /не утврдува правно дејство/);
  });

  test("VD2 version comparison fetches each version by its own start date (no front-end status inference)", () => {
    const body = fnBody("openVersionsWorkspace");
    assert.match(body, /date:LB\.versionStartDate\(v\)/);
    assert.equal(LB.versionStartDate({ applicationFrom: "2027-01-18", validFrom: "2026-07-16" }), "2027-01-18");
    assert.equal(LB.versionStartDate({ validFrom: null }), null);
    assert.ok(!/isCurrent\s*=|humanReviewStatus\s*=/.test(body), "the UI must not assign status fields");
  });

  test("VD3 case-law filters are disabled unless the backend reports a live case-law corpus; no fabricated cases", () => {
    const body = fnBody("openCaseLawRegistry");
    assert.match(body, /const live=st\.active;/);
    assert.match(body, /id:"caseIssue",type:"search",disabled:!live/);
    for (const id of ["caseCourt", "caseDate", "caseOutcome"]) assert.match(body, new RegExp(`id:"${id}"[^}]*disabled:true`), id);
    assert.ok(!/(Рев|Гж|Пж|Кж|К)\.?\s?бр\.?\s?\d|Application no\.|v\. [A-Z][a-z]+/.test(body), "no case citations in code");
  });

  test("VD3a case-law banner text follows the live capability instead of contradicting it", () => {
    const body = fnBody("openCaseLawRegistry");
    assert.match(body, /live\s*\?\s*"Индексираната судска практика е вклучена/);
    assert.match(body, /:\s*"Индексираната судска практика не е вклучена/);
  });

  test("VD3b article browser ignores stale async responses after a newer date/search request", () => {
    const body = fnBody("openLawBrowser");
    assert.match(body, /let loadSeq=0/);
    assert.match(body, /const seq=\+\+loadSeq/);
    assert.match(body, /if\(seq!==loadSeq\) return/);
    assert.match(body, /requestedDate=date\.value/);
    assert.match(body, /requestedQuery=currentQuery/);
  });

  test("VD3c version comparison probes candidate versions before declaring that only one is available", () => {
    const body = fnBody("openVersionsWorkspace");
    assert.match(body, /date:"0001-01-01"/);
    assert.match(body, /probe\.body\?\.versions/);
    assert.ok(!/successful resolution as proof/i.test(body));
  });

  test("VD4 document workspace stays locked while chat attachments and the local Guide Vault stay separately privacy-gated", () => {
    const fileInputs=[...index.matchAll(/<input\b[^>]*type="file"[^>]*>/g)].map(m=>m[0]);
    assert.equal(fileInputs.length,2);
    assert.ok(fileInputs.some(x=>/id="aiChatFiles"/.test(x)));
    assert.ok(fileInputs.some(x=>/id="aiGuideVaultFiles"/.test(x) && /hidden/.test(x)));
    assert.ok(!/FormData\(|\.upload\b|\/api\/documents"?,\s*\{[^}]*method/.test(index));
    assert.match(chatJs,/\/api\/chat/);
    assert.match(workerSrc,/OPENAI_FILE_INPUT_ENABLED/);
    assert.match(workerSrc,/attachment_processing_locked/);
    assert.match(guideVaultJs,/indexedDB/);
    assert.doesNotMatch(workerSrc,/INSERT\s+INTO\s+.*guide/i);
    const body = fnBody("openDocumentsInfo");
    assert.ok(!/el\("(input|textarea|form)"/.test(body), "documents workspace panel must not contain inputs");
    assert.match(body, /заклучена и во подготовка/);
    assert.match(body, /хронологии/);
    assert.match(body, /доказни матрици/);
    assert.match(body, /Human Gate/);
  });

  test("VD5 the source-first ladder keeps its order and every Legal Base panel names its layer", () => {
    assert.deepEqual(LB.LAYERS.map((l) => l.id), ["source", "article", "case", "analysis", "ai"]);
    for (const [fn, re] of [["openLawsRegistry", /Слој 1–2/], ["openLawBrowser", /Слој 2/], ["openCaseLawRegistry", /Слој 3/],
      ["openInternationalRegistry", /Слој 1 и 3/], ["openVersionsWorkspace", /Слој 2/], ["openCitationAudit", /Проверка меѓу слоевите/], ["openDocumentsInfo", /Работен простор/]]) {
      assert.match(fnBody(fn), re, fn);
    }
    assert.match(index, /Слој 4 · Стручна анализа/);
    assert.match(index, /Слој 5 · AI синтеза/);
  });

  test("VD6 legal-base.js is loaded before the app script and served from the same origin", () => {
    const helper = index.indexOf('<script src="/assets/legal-base.js"></script>');
    const app = index.indexOf("window.AI_ADVOCAT_CONFIG");
    assert.ok(helper > 0 && helper < app);
    assert.ok(fs.existsSync("assets/legal-base.js"));
  });

  test("VD7 every data-i18n key on the page has both a Macedonian and an English string", () => {
    const keys = [...new Set([...index.matchAll(/data-i18n="([A-Za-z0-9]+)"/g)].map((m) => m[1]))];
    const start = index.indexOf("  const i18n = {");
    const enStart = index.indexOf("    en:{", start);
    const mk = index.slice(start, enStart), en = index.slice(enStart, index.indexOf("  let lang = ", enStart));
    const missing = keys.filter((k) => !new RegExp(`\\b${k}:"`).test(mk) || !new RegExp(`\\b${k}:"`).test(en));
    assert.deepEqual(missing, []);
  });
});
