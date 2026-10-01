// Corpus foundation v1.1 — validator multi-source provenance and the deterministic amendment engine.
// All law texts here are FICTIONAL fixtures; no real statute is imported or asserted.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseLegalText } from "../scripts/parse-mk-legal-text.mjs";
import { validateCorpus, VALIDATOR_VERSION } from "../scripts/validate-legal-corpus.mjs";
import { applyAmendments, AmendmentStop, toNdjson, readNdjson, ENGINE_VERSION } from "../scripts/apply-amendments.mjs";

const FIX = "test/fixtures/amendments";
const BASE_TEXT = fs.readFileSync(`${FIX}/base-law.txt`, "utf8");
const BASE_META = JSON.parse(fs.readFileSync(`${FIX}/base-meta.json`, "utf8"));
const PLAN = JSON.parse(fs.readFileSync(`${FIX}/plan-2-2026.json`, "utf8"));
const EXPECTED = JSON.parse(fs.readFileSync(`${FIX}/expected-merged-texts.json`, "utf8"));
const clone = (x) => JSON.parse(JSON.stringify(x));

function baseCorpus() {
  const p = parseLegalText(BASE_TEXT, BASE_META);
  return { manifest: { type: "ingest_manifest", ...p, records: undefined }, records: p.records };
}
const plan = (mutate = (p) => p) => { const p = clone(PLAN); mutate(p); return p; };
function stopOf(fn) {
  try { fn(); } catch (e) { if (e instanceof AmendmentStop) return e; throw e; }
  assert.fail("expected an AmendmentStop");
}
const merged = () => applyAmendments(baseCorpus(), plan());

// ---- validator fixtures ------------------------------------------------------------------------
const SHA = "a".repeat(64);
const SINGLE_TEXT = "Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.";
const SINGLE_META = { instrument_key: "mk:test", instrument_title: "Закон за тест", version_id: "v-test", version_label: "v-test",
  source_url: "https://example.invalid/single.pdf", source_sha256: SHA, source_issue_number: "1/2026", source_issue_date: "2026-01-01" };
const singleManifest = (o = {}) => ({
  instrument_key: "mk:test", version_label: "v-test", version_class: "official_consolidated",
  expected_article_count: 3, expected_first_article: "1", expected_last_article: "3",
  source: { url: SINGLE_META.source_url, sha256: SHA, issue_number: "1/2026", issue_date: "2026-01-01" },
  legal_status: "source_text", human_gate: { status: "pending", approved_by: null, approved_at: null },
  validity: { valid_from: "2026-01-09", application_from: null, valid_to: null },
  transitional_final_provisions: { present: false, starts_at_article: null }, ...o
});
const singleParsed = () => { const p = parseLegalText(SINGLE_TEXT, SINGLE_META); return { manifest: { type: "ingest_manifest", ...p, records: undefined }, records: p.records }; };
const checksFailed = (r) => r.errors.map((e) => e.check);

const CHAIN = [
  { role: "base_text", issue_number: "1/2020", issue_date: "2020-01-10", url: PLAN.base.url, sha256: PLAN.base.sha256 },
  { role: "amendment", issue_number: "2/2026", issue_date: "2026-02-02", url: PLAN.amendment.url, sha256: PLAN.amendment.sha256 }
];
const derivedManifest = (o = {}) => ({
  instrument_key: "mk:fixture-amend", version_label: PLAN.target.version_label, version_class: "reference_consolidation",
  expected_article_count: 8, expected_first_article: "1", expected_last_article: "6",
  expected_lettered_articles: ["4-а", "4-б"], expected_repealed_articles: ["4"],
  source: { url: PLAN.base.url, sha256: PLAN.base.sha256, issue_number: "1/2020", issue_date: "2020-01-10" },
  source_chain: clone(CHAIN),
  legal_status: "needs_version_review", human_gate: { status: "pending", approved_by: null, approved_at: null },
  validity: { valid_from: "2026-02-10", application_from: "2026-08-10", valid_to: null },
  transitional_final_provisions: { present: true, starts_at_article: "6" }, ...o
});
const derivedParsed = () => { const m = merged(); return { manifest: { type: "ingest_manifest", ...m.header }, records: m.records }; };

describe("A. Validator v1.1", () => {
  test("A0 version bumped to v1.1.0", () => assert.equal(VALIDATOR_VERSION, "mk-legal-corpus-validator-v1.1.0"));

  test("A1 valid single-source corpus (v1.0 manifest, no source_chain) -> PASS", () => {
    const r = validateCorpus(singleParsed(), singleManifest());
    assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
  });

  test("A1b single-source: article with derived_from but no source_chain -> STOP", () => {
    const p = singleParsed(); p.records[1].derived_from = [{ sha256: "b".repeat(64), amendment_article: 1 }];
    assert.ok(checksFailed(validateCorpus(p, singleManifest())).includes("provenance"));
  });

  test("A2 valid two-source derived corpus (engine output + source_chain) -> PASS", () => {
    const r = validateCorpus(derivedParsed(), derivedManifest());
    assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
  });

  test("A2b two-source corpus WITHOUT source_chain is refused (inserted article has another source)", () => {
    const m = derivedManifest(); delete m.source_chain;
    assert.ok(checksFailed(validateCorpus(derivedParsed(), m)).includes("provenance"));
  });

  test("A3 derived_from sha256 not in source_chain -> STOP", () => {
    const p = derivedParsed();
    p.records.find((r) => r.article_number_normalized === "3").derived_from[0].sha256 = "c".repeat(64);
    const r = validateCorpus(p, derivedManifest());
    assert.equal(r.verdict, "STOP");
    assert.ok(r.errors.some((e) => e.check === "provenance" && /derived_from sha256/.test(e.detail) && e.article === "3"));
  });

  test("A3b manifest source_chain missing a source the corpus was built from -> STOP", () => {
    const r = validateCorpus(derivedParsed(), derivedManifest({ source_chain: [clone(CHAIN[0])] }));
    assert.ok(checksFailed(r).includes("provenance"));
  });

  test("A3c malformed source_chain entry (http url) -> STOP", () => {
    const chain = clone(CHAIN); chain[1].url = "http://example.invalid/x.pdf";
    assert.ok(checksFailed(validateCorpus(derivedParsed(), derivedManifest({ source_chain: chain }))).includes("provenance"));
  });

  test("A4 expected_lettered_articles as a string -> STOP (not silently skipped)", () => {
    const r = validateCorpus(singleParsed(), singleManifest({ expected_lettered_articles: "UNRESOLVED — HUMAN REVIEW NEEDED" }));
    assert.equal(r.verdict, "STOP");
    assert.ok(checksFailed(r).includes("lettered_articles"));
  });

  test("A5 expected_repealed_articles as a string -> STOP", () => {
    const r = validateCorpus(singleParsed(), singleManifest({ expected_repealed_articles: "UNRESOLVED — HUMAN REVIEW NEEDED" }));
    assert.ok(checksFailed(r).includes("repealed_articles"));
  });

  test("A6 allowed_gaps as a string -> orderly STOP, no TypeError", () => {
    let r;
    assert.doesNotThrow(() => { r = validateCorpus(singleParsed(), singleManifest({ allowed_gaps: "UNRESOLVED" })); });
    assert.ok(checksFailed(r).includes("gaps"));
  });

  test("A6b acknowledged_warnings / other_versions / source_chain as strings -> STOP, no TypeError", () => {
    for (const k of ["acknowledged_warnings", "other_versions", "source_chain"]) {
      let r;
      assert.doesNotThrow(() => { r = validateCorpus(singleParsed(), singleManifest({ [k]: "x" })); }, k);
      assert.ok(checksFailed(r).includes("manifest"), k);
    }
  });

  test("A6c null optional lists keep v1.0 behaviour (treated as absent)", () => {
    const r = validateCorpus(singleParsed(), singleManifest({ allowed_gaps: null, expected_lettered_articles: null, expected_repealed_articles: null }));
    assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
  });

  test("A7 the ZPP v1.1 draft manifest fails closed on every UNRESOLVED field", () => {
    const zpp = JSON.parse(fs.readFileSync("test/fixtures/zpp/ZPP_MANIFEST_V1_1_DRAFT.json", "utf8"));
    const p = singleParsed();
    p.records.forEach((r) => { r.instrument_key = "mk:zpp"; r.instrument_version_label = zpp.version_label; });
    p.manifest.instrument_key = "mk:zpp";
    const failed = checksFailed(validateCorpus(p, zpp));
    for (const c of ["article_count", "first_last_article", "lettered_articles", "repealed_articles", "transitional_final", "provenance"]) {
      assert.ok(failed.includes(c), `${c} must STOP while UNRESOLVED (got ${[...new Set(failed)].join(",")})`);
    }
    assert.equal(zpp.legal_status, "needs_version_review");
    assert.equal(zpp.human_gate.status, "pending");
  });
});

describe("B. Amendment engine", () => {
  test("B0 engine version", () => assert.equal(ENGINE_VERSION, "mk-amendment-engine-v1.0.0"));

  test("B1 all six operation types apply and match the golden texts", () => {
    const m = merged();
    const texts = Object.fromEntries(m.records.map((r) => [r.article_number_normalized, r.article_text]));
    assert.deepEqual(texts, EXPECTED.texts);
    assert.deepEqual(m.records.map((r) => r.article_number_normalized), ["1", "2", "3", "4", "4-а", "4-б", "5", "6"]);
    assert.deepEqual([...new Set(m.log.operations.map((o) => o.op))].sort(),
      ["delete_article", "insert_article", "non_text", "replace_article", "replace_paragraph", "textual_edit"]);
  });

  test("B2 provenance: derived_from on every changed article, none on unchanged ones", () => {
    const by = Object.fromEntries(merged().records.map((r) => [r.article_number_normalized, r]));
    assert.deepEqual(by["2"].derived_from.map((d) => d.amendment_article), [1, 2]);
    assert.deepEqual(by["3"].derived_from.map((d) => [d.amendment_article, d.op, d.issue_number]), [[3, "replace_article", "2/2026"]]);
    assert.equal(by["4-б"].source.sha256, PLAN.amendment.sha256, "inserted article is sourced from the amending act");
    assert.equal(by["3"].source.sha256, PLAN.base.sha256, "changed article keeps its base source + derived_from");
    for (const n of ["1", "4-а", "6"]) assert.equal(by[n].derived_from, undefined, n);
  });

  test("B3 delete_article: status repealed, text = verbatim amending sentence, previous text in the log", () => {
    const m = merged();
    const a4 = m.records.find((r) => r.article_number_normalized === "4");
    assert.equal(a4.status, "repealed");
    assert.equal(a4.article_text, "Членот 4 се брише.");
    assert.match(m.log.operations.find((o) => o.op === "delete_article").before_text, /Вештакот/);
  });

  test("B4 heading/paragraphs are re-derived by the parser; chapter heading after art. 5 is preserved", () => {
    const by = Object.fromEntries(merged().records.map((r) => [r.article_number_normalized, r]));
    assert.equal(by["4-б"].article_heading, "Задолжителна медијација");
    assert.equal(by["3"].paragraphs.length, 2);
    assert.match(by["5"].article_text, /ПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ$/);
  });

  test("B4b replace_paragraph / replace_article on the last article before a chapter heading keep the heading", () => {
    const para = applyAmendments(baseCorpus(), plan((p) => {
      p.operations[5] = { op: "replace_paragraph", amendment_article: 6, source_text: "x", target: "5", paragraph: "1", new_text: "(1) Нов текст." };
    }));
    assert.equal(para.records.find((r) => r.article_number_normalized === "5").article_text, "(1) Нов текст.\nПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ");
    const whole = applyAmendments(baseCorpus(), plan((p) => {
      p.operations[5] = { op: "replace_article", amendment_article: 6, source_text: "x", target: "5", new_text: "(1) Целосно нов текст." };
    }));
    const a5 = whole.records.find((r) => r.article_number_normalized === "5");
    assert.equal(a5.article_text, "(1) Целосно нов текст.\nПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ");
    assert.deepEqual(whole.log.operations[5].kept_trailing_structure, ["ПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ"]);
  });

  test("B5 every record is bound to the target version, pending Human Gate, never current_consolidated", () => {
    const m = merged();
    for (const r of m.records) {
      assert.equal(r.instrument_version_label, PLAN.target.version_label);
      assert.equal(r.instrument_version_id, null);
      assert.equal(r.human_review_status, "pending");
      assert.notEqual(r.status, "current_consolidated");
    }
    assert.equal(new Set(m.records.map((r) => r.canonical_id)).size, m.records.length, "canonical ids are unique");
    assert.deepEqual(m.header.source_chain.map((c) => c.issue_number), ["1/2020", "2/2026"]);
    assert.equal(m.header.merge_engine_version, ENGINE_VERSION);
  });

  test("B6 deterministic: two runs produce byte-identical NDJSON and log", () => {
    const a = merged(), b = merged();
    assert.equal(toNdjson(a), toNdjson(b));
    assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
  });

  test("B7 non_text operations are logged and change no article", () => {
    const m = merged();
    assert.deepEqual(m.log.summary.non_text, [{ amendment_article: 7, kind: "application" }]);
  });

  test("B8 the base corpus is not mutated", () => {
    const base = baseCorpus(); const before = JSON.stringify(base);
    applyAmendments(base, plan());
    assert.equal(JSON.stringify(base), before);
  });

  // ---- intentional STOP cases ----
  const op = (p, n) => p.operations[n];
  const STOPS = [
    ["S1 target article does not exist", (p) => { op(p, 0).target = "9"; }, /target article 9 does not exist/],
    ["S2 paragraph does not exist", (p) => { op(p, 1).paragraph = "3"; }, /paragraph \(3\) not found/],
    ["S3 find has 0 matches", (p) => { op(p, 0).find = "400.000"; }, /matches 0 time/],
    ["S4 find has 2 matches when exactly 1 is expected", (p) => { delete op(p, 5).expected_matches; }, /matches 2 time\(s\).*expected exactly 1/],
    ["S5 inserted article out of order", (p) => { op(p, 3).number = "7"; }, /would not come before the next article/],
    ["S6 inserted article already exists", (p) => { op(p, 3).number = "4-а"; op(p, 3).after = "4"; }, /already exists/],
    ["S7 amending article not accounted for", (p) => { p.operations.pop(); }, /amending article 7 is not accounted for/],
    ["S8 target status current_consolidated", (p) => { p.target.status = "current_consolidated"; }, /never produces current_consolidated/],
    ["S9 unknown field (typo) in an operation", (p) => { op(p, 2).targt = "3"; }, /unexpected field 'targt'/],
    ["S10 new text contains an article header", (p) => { op(p, 2).new_text = "(1) А.\nЧлен 9\n(1) Б."; }, /does not re-parse as exactly one article/],
    ["S11 base sha256 mismatch", (p) => { p.base.sha256 = "9".repeat(64); }, /base.sha256 does not match/],
    ["S12 amendment older than the base", (p) => { p.amendment.issue_date = "2019-01-01"; }, /chronological order/],
    ["S13 edit on an already repealed article", (p) => { p.operations.splice(5, 0, { op: "textual_edit", amendment_article: 6, source_text: "x", target: "4", find: "Членот", replace: "Член" }); }, /already repealed/],
    ["S14 textual edit would destroy the paragraph marker", (p) => { op(p, 0).find = "(2) Во"; op(p, 0).replace = "Во"; }, /paragraph marker/],
    ["S15 missing source_text", (p) => { op(p, 4).source_text = " "; }, /source_text/],
    ["S16 Human Gate set by the plan", (p) => { p.target.human_review_status = "approved"; }, /Human Gate is never set/]
  ];
  for (const [name, mutate, re] of STOPS) {
    test(name, () => {
      const e = stopOf(() => applyAmendments(baseCorpus(), plan(mutate)));
      assert.equal(e.log.verdict, "STOP");
      assert.ok(e.stops.some((s) => re.test(s.detail)), `${name}: ${e.stops.map((s) => s.detail).join(" | ")}`);
    });
  }

  test("S17 applying the same amending act twice -> STOP", () => {
    const once = merged();
    const e = stopOf(() => applyAmendments({ manifest: once.header, records: once.records }, plan()));
    assert.ok(e.stops.some((s) => /already been applied/.test(s.detail)));
  });

  test("B9 chained run: a second (fictional) act applies on top of the first", () => {
    const once = merged();
    const second = {
      ...plan(), amendment: { role: "amendment", issue_number: "3/2027", issue_date: "2027-03-03", url: "https://example.invalid/fixture/amend-3-2027.pdf", sha256: "3".repeat(64), article_count: 1 },
      operations: [{ op: "textual_edit", amendment_article: 1, source_text: "Во членот 2 став (1) бројот „15“ се заменува со бројот „20“.", target: "2", paragraph: "1", find: "15", replace: "20" }]
    };
    const twice = applyAmendments({ manifest: once.header, records: once.records }, second);
    assert.deepEqual(twice.header.source_chain.map((c) => c.issue_number), ["1/2020", "2/2026", "3/2027"]);
    assert.deepEqual(twice.records.find((r) => r.article_number_normalized === "2").derived_from.map((d) => d.issue_number), ["2/2026", "2/2026", "3/2027"]);
  });

  test("B10 CLI: APPLIED writes both files; STOP writes only the log and removes a stale merged file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "amend-"));
    const basePath = path.join(dir, "base.ndjson");
    fs.writeFileSync(basePath, toNdjson({ header: baseCorpus().manifest, records: baseCorpus().records }));
    const run = (planObj) => {
      fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(planObj));
      return spawnSync(process.execPath, ["scripts/apply-amendments.mjs", basePath, path.join(dir, "plan.json"), path.join(dir, "merged.ndjson"), path.join(dir, "log.json")], { encoding: "utf8" });
    };
    const ok = run(plan());
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(readNdjson(fs.readFileSync(path.join(dir, "merged.ndjson"), "utf8")).records.length, 8);
    const bad = run(plan((p) => { p.operations[0].target = "9"; }));
    assert.equal(bad.status, 1);
    assert.equal(fs.existsSync(path.join(dir, "merged.ndjson")), false);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "log.json"), "utf8")).verdict, "STOP");
  });
});
