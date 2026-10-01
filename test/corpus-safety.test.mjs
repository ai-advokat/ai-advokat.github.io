// AI Advokat — Corpus Safety Foundation tests (F1 parser v0.3, F2 validator,
// F3 migration 0023 + importer, F4 version-aware retrieval and alias ambiguity).
// Run: npm run test:corpus-safety   (Node >= 22.5, no extra dependencies)
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { parseLegalText, splitArticles, normalizeArticleNumber, PARSER_VERSION } from "../scripts/parse-mk-legal-text.mjs";
import { validateCorpus, toMarkdown } from "../scripts/validate-legal-corpus.mjs";
import { generateImportSql } from "../scripts/legal-ndjson-to-sql.mjs";
import { createD1, seedArticles } from "./d1-shim.mjs";
import { loadWorker } from "./load-worker.mjs";

const { worker } = await loadWorker();
const BASE = "https://ai-advokat-github-io.aiadvokat16.workers.dev";
const SHA = "a".repeat(64);
const META = { instrument_key: "mk:test", instrument_title: "Закон за тест", version_id: "v-test", version_label: "v-test",
  source_url: "https://ldbis.pravda.gov.mk/test", source_sha256: SHA, source_issue_number: "1/2026", source_issue_date: "2026-01-01" };
const parse = (text, meta = {}, opts) => parseLegalText(text, { ...META, ...meta }, opts);
const codes = (p, sev) => p.warnings.filter((w) => !sev || w.severity === sev).map((w) => w.code);

// ---------------------------------------------------------------------------
// F1 — parser v0.3
// ---------------------------------------------------------------------------
describe("F1 parser v0.3", () => {
  test("P0 parser version is v0.3", () => assert.equal(PARSER_VERSION, "mk-legal-article-v0.3.0"));

  test("T1 'Член 122а' (no dash) is a separate article, normalised to 122-а", () => {
    const p = parse("Член 122\n(1) А.\nЧлен 122а\n(1) Б.\nЧлен 123\n(1) В.");
    assert.deepEqual(p.records.map((r) => r.article_number_normalized), ["122", "122-а", "123"]);
    assert.equal(p.records[1].article_text, "(1) Б.");
    assert.equal(p.records[0].article_text, "(1) А.", "122а must not be merged into 122");
  });

  test("T2 'Член 122-а' and dash variants normalise identically", () => {
    for (const h of ["122-а", "122–а", "122—а", "122‑а", "122 - а", "122−а"]) {
      const p = parse(`Член 122\n(1) А.\nЧлен ${h}\n(1) Б.`);
      assert.equal(p.records[1].article_number_normalized, "122-а", h);
    }
    assert.equal(normalizeArticleNumber("10а"), normalizeArticleNumber("10-а"));
  });

  test("T2b '10а' and '10-а' in one text are a duplicate (no silent winner)", () => {
    assert.throws(() => parse("Член 10\n(1) А.\nЧлен 10-а\n(1) Б.\nЧлен 10а\n(1) В."), /Duplicate article number/);
  });

  test("T3 gap 1,2,4 is a stop finding unless allowed_gaps lists 3", () => {
    const p = parse("Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 4\n(1) Г.");
    assert.deepEqual(p.gaps, ["3"]);
    assert.ok(codes(p, "stop").includes("unexplained_gap"));
    const ok = parse("Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 4\n(1) Г.", { allowed_gaps: ["3"] });
    assert.ok(!codes(ok, "stop").includes("unexplained_gap"));
    assert.ok(codes(ok, "info").includes("allowed_gap"));
  });

  test("T5 duplicate 'Член 10' throws in strict mode and is reported in collect mode", () => {
    const t = "Член 9\n(1) А.\nЧлен 10\n(1) Б.\nЧлен 10\n(1) В.";
    assert.throws(() => parse(t), /Duplicate article number detected: 10/);
    const p = parse(t, {}, { strict: false });
    assert.equal(p.errors[0].code, "duplicate_article_number");
  });

  test("T5b lowercase 'член 5' line is not a header and is flagged", () => {
    const p = parse("Член 1\n(1) Се применуваат одредбите од\nчлен 5\nод овој закон.\nЧлен 2\n(1) Текст.");
    assert.deepEqual(p.records.map((r) => r.article_number_normalized), ["1", "2"]);
    assert.match(p.records[0].article_text, /член 5/);
    assert.ok(codes(p).includes("lowercase_article_marker_line"));
  });

  test("T5c out-of-order numbering (cross-reference or appended act) is a structural error", () => {
    assert.throws(() => parse("Член 1\n(1) А.\nЧлен 3\n(1) В.\nЧлен 2\n(1) Б."), /numbering must increase/);
  });

  test("T5d malformed header-like lines are flagged, never silently dropped or guessed", () => {
    const p = parse("Член 1\n(1) А.\nЧЛЕН 2\n(1) Б.\nЧлен 3\n(1) В.\nЧлен4\n(1) Г.\nЧлeн 5\n(1) Д.", {}, { strict: false });
    assert.equal(codes(p).filter((c) => c === "malformed_article_header").length, 3);
    assert.deepEqual(p.records.map((r) => r.article_number_normalized), ["1", "3"]);
    assert.ok(p.warning_count >= 3);
  });

  test("T5e a sentence starting with 'Член 5 од овој закон' is body text, not a header or a warning", () => {
    const p = parse("Член 1\n(1) А.\nЧлен 5 од овој закон се применува и на договорите.\nЧлен 2\n(1) Б.");
    assert.deepEqual(p.records.map((r) => r.article_number_normalized), ["1", "2"]);
    assert.ok(!codes(p).includes("malformed_article_header"));
  });

  test("T5f editorial notes and the transitional/final heading are detected", () => {
    const p = parse("Член 1\n(1) А.\nНапомена: редакциска белешка\nЧлен 2\n(1) Б (изменет со Законот).\nПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ\nЧлен 3\n(1) В.");
    assert.equal(codes(p).filter((c) => c === "editorial_note_contamination").length, 2);
    assert.equal(p.transitional_final_starts_at, "3");
  });

  test("T6 mixed Latin/Cyrillic token is a stop finding; Latin suffix in a header is an error", () => {
    const p = parse("Член 1\n(1) Закон за kulturата.\nЧлен 2\n(1) Б.");
    assert.ok(codes(p, "stop").includes("mixed_script_token"));
    assert.throws(() => parse("Член 10\n(1) А.\nЧлен 10a\n(1) Б."), /Latin letter suffix/);
  });

  test("T4 contaminated text yields a real warning_count > 0", () => {
    const t = [
      "Член 1", "(1) Прв став.", "Службен весник на Република Северна Македонија, бр. 12", "3 од 40",
      "Член 2", "(1) Втор став.", "ЗАКОН ЗА ИЗМЕНУВАЊЕ И ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА ТЕСТ"
    ].join("\n");
    const p = parse(t);
    assert.ok(p.warning_count >= 3, `warning_count=${p.warning_count}`);
    assert.ok(codes(p, "warning").includes("possible_header_footer"));
    assert.ok(codes(p, "warning").includes("amending_act_contamination"));
    assert.equal(p.records[0].article_text, "(1) Прв став.\nСлужбен весник на Република Северна Македонија, бр. 12\n3 од 40", "text is never auto-repaired");
  });

  test("T4b a sentence citing the Gazette is NOT flagged as a header", () => {
    const p = parse("Член 1\n(1) Овој закон влегува во сила осмиот ден од денот на објавувањето во „Службен весник на Република Северна Македонија“.");
    assert.equal(p.warning_count, 0);
  });

  test("T4c deleted articles are detected and kept verbatim", () => {
    const p = parse("Член 1\n(1) А.\nЧлен 2\n(Избришан)\nЧлен 3\n(1) В.");
    assert.equal(p.records[1].status, "repealed");
    assert.equal(p.records[1].article_text, "(Избришан)");
    assert.ok(codes(p, "info").includes("repealed_article_detected"));
  });

  test("T4d canonical ids of v0.2-recognised headers are unchanged (production rows stay addressable)", () => {
    const p = parse("Член 25-а\n(1) Посебен член.");
    const seed = ["MK", META.instrument_key, META.version_id, "ART", "25-а", SHA].join(":");
    assert.equal(p.records[0].canonical_id, "MK:" + crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32));
    assert.equal(splitArticles("Член 25-а\n(1) x")[0].number, "25-а");
  });
});

// ---------------------------------------------------------------------------
// F2 — QA validator
// ---------------------------------------------------------------------------
const CLEAN = "Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.";
const baseManifest = (o = {}) => ({
  instrument_key: "mk:test", version_label: "v-test", version_class: "official_consolidated",
  expected_article_count: 3, expected_first_article: "1", expected_last_article: "3",
  source: { url: META.source_url, sha256: SHA, issue_number: "1/2026", issue_date: "2026-01-01" },
  legal_status: "source_text", human_gate: { status: "pending", approved_by: null, approved_at: null },
  validity: { valid_from: "2026-01-09", application_from: null, valid_to: null },
  transitional_final_provisions: { present: false, starts_at_article: null }, ...o
});
const asParsed = (p) => ({ manifest: { type: "ingest_manifest", ...p, records: undefined }, records: p.records });
const validate = (text, manifest = baseManifest(), meta = {}) => validateCorpus(asParsed(parse(text, meta, { strict: false })), manifest);
const failed = (r) => r.errors.map((e) => e.check);

describe("F2 QA validator", () => {
  test("V1 clean corpus + matching manifest -> PASS", () => {
    const r = validate(CLEAN);
    assert.equal(r.verdict, "PASS", JSON.stringify(r.errors));
    assert.match(toMarkdown(r), /\*\*Verdict: PASS\*\*/);
  });
  test("V2 article_count mismatch -> STOP", () => assert.ok(failed(validate(CLEAN, baseManifest({ expected_article_count: 4 }))).includes("article_count")));
  test("V3 wrong first/last article -> STOP", () => assert.ok(failed(validate(CLEAN, baseManifest({ expected_last_article: "4" }))).includes("first_last_article")));
  test("V4 unexplained gap -> STOP; explained gap -> PASS", () => {
    const t = "Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 4\n(1) Г.";
    assert.ok(failed(validate(t, baseManifest({ expected_last_article: "4" }))).includes("gaps"));
    const ok = validate(t, baseManifest({ expected_last_article: "4", allowed_gaps: ["3"] }), { allowed_gaps: ["3"] });
    assert.equal(ok.verdict, "PASS", JSON.stringify(ok.errors));
  });
  test("V5 duplicate numbers -> STOP", () => {
    const r = validate("Член 1\n(1) А.\nЧлен 2\n(1) Б.\nЧлен 2\n(1) В.", baseManifest({ expected_article_count: 2, expected_last_article: "2" }));
    assert.equal(r.verdict, "STOP");
    assert.ok(failed(r).includes("extraction_errors"));
  });
  test("V6 NULL instrument version -> STOP", () => {
    const p = parse(CLEAN, { version_label: "" }); p.records.forEach((r) => { r.instrument_version_label = null; }); p.instrument_version_label = null;
    assert.ok(failed(validateCorpus(asParsed(p), baseManifest())).includes("instrument_version"));
  });
  test("V7 mixed scripts -> STOP", () => assert.ok(failed(validate("Член 1\n(1) kulturата.\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.")).includes("mixed_scripts")));
  test("V8 header/footer contamination -> STOP unless acknowledged with a reason", () => {
    const t = "Член 1\n(1) А.\n3 од 40\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.";
    assert.ok(failed(validate(t)).includes("header_footer"));
    const ack = validate(t, baseManifest({ acknowledged_warnings: [{ code: "possible_header_footer", article: "1", reason: "verified against PDF page 3" }] }));
    assert.equal(ack.verdict, "PASS", JSON.stringify(ack.errors));
  });
  test("V9 missing provenance / sha256 -> STOP", () => {
    assert.ok(failed(validate(CLEAN, baseManifest({ source: { url: "http://x", sha256: "", issue_number: null, issue_date: null } }))).includes("provenance"));
  });
  test("V10 unresolved legal status -> STOP", () => {
    assert.ok(failed(validate(CLEAN, baseManifest({ legal_status: "unknown" }))).includes("legal_status"));
    assert.ok(failed(validate(CLEAN, baseManifest({ human_gate: { status: "maybe" } }))).includes("legal_status"));
  });
  test("V11 impossible or overlapping validity dates -> STOP", () => {
    assert.ok(failed(validate(CLEAN, baseManifest({ validity: { valid_from: "2026-05-01", application_from: "2026-01-01", valid_to: null } }))).includes("validity_dates"));
    assert.ok(failed(validate(CLEAN, baseManifest({ validity: { valid_from: "2026-05-01", application_from: null, valid_to: "2026-01-01" } }))).includes("validity_dates"));
    assert.ok(failed(validate(CLEAN, baseManifest({ other_versions: [{ version_label: "old", valid_from: "2020-01-01", valid_to: "2027-01-01" }] }))).includes("validity_dates"));
    assert.equal(validate(CLEAN, baseManifest({ other_versions: [{ version_label: "old", valid_from: "2020-01-01", valid_to: "2026-01-09" }] })).verdict, "PASS");
  });
  test("V12 current_consolidated without approved Human Gate -> STOP", () => {
    const r = validate(CLEAN, baseManifest({ legal_status: "current_consolidated" }), { status: "current_consolidated" });
    assert.ok(failed(r).includes("legal_status"));
  });
  test("V13 extraction uncertainty below threshold -> STOP", () => {
    assert.ok(failed(validate(CLEAN, baseManifest({ min_extraction_confidence: 0.95 }), { extraction_confidence: 0.6 })).includes("extraction_uncertainty"));
  });
  test("V14 output of the old v0.2 parser is refused", () => {
    const p = asParsed(parse(CLEAN)); p.manifest.parser_version = "mk-legal-article-v0.2.0";
    assert.ok(failed(validateCorpus(p, baseManifest())).includes("parser_version"));
  });
  test("V16 lettered and repealed articles are reported and compared with the manifest", () => {
    const t = "Член 1\n(1) А.\nЧлен 1а\n(1) А1.\nЧлен 2\n(Избришан)\nЧлен 3\n(1) В.";
    const m = baseManifest({ expected_article_count: 4 });
    assert.equal(validate(t, { ...m, expected_lettered_articles: ["1-а"], expected_repealed_articles: ["2"] }).verdict, "PASS");
    assert.ok(failed(validate(t, { ...m, expected_lettered_articles: [] })).includes("lettered_articles"));
    assert.ok(failed(validate(t, { ...m, expected_repealed_articles: [] })).includes("repealed_articles"));
    const notes = validate(t, m).warnings.map((w) => w.check);
    assert.ok(notes.includes("lettered_articles") && notes.includes("repealed_articles"));
  });
  test("V17 transitional/final provisions must match the manifest", () => {
    const t = "Член 1\n(1) А.\nПРЕОДНИ И ЗАВРШНИ ОДРЕДБИ\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.";
    assert.ok(failed(validate(t)).includes("transitional_final"), "declared absent but present");
    assert.equal(validate(t, baseManifest({ transitional_final_provisions: { present: true, starts_at_article: "2" } })).verdict, "PASS");
    assert.ok(failed(validate(t, baseManifest({ transitional_final_provisions: { present: true, starts_at_article: "3" } }))).includes("transitional_final"));
    assert.ok(failed(validate(CLEAN, baseManifest({ transitional_final_provisions: undefined }))).includes("transitional_final"));
  });
  test("V18 amendment/editorial notes and malformed headers -> STOP unless acknowledged", () => {
    assert.ok(failed(validate("Член 1\n(1) А.\n* Изменет со бр. 12/2010\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.")).includes("amendment_editorial_contamination"));
    assert.ok(failed(validate("Член 1\n(1) А.\nЧЛЕН 2\n(1) Б.\nЧлен 2\n(1) Б.\nЧлен 3\n(1) В.")).includes("malformed_header"));
  });
  test("V15 CLI writes JSON + Markdown and exits 1 on STOP, 0 on PASS", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "corpus-qa-"));
    const p = parse(CLEAN);
    fs.writeFileSync(path.join(dir, "a.ndjson"), [JSON.stringify({ type: "ingest_manifest", ...p, records: undefined }), ...p.records.map((r) => JSON.stringify({ type: "article", ...r }))].join("\n"));
    fs.writeFileSync(path.join(dir, "ok.json"), JSON.stringify(baseManifest()));
    fs.writeFileSync(path.join(dir, "bad.json"), JSON.stringify(baseManifest({ expected_article_count: 9 })));
    const run = (m) => spawnSync(process.execPath, ["scripts/validate-legal-corpus.mjs", path.join(dir, "a.ndjson"), path.join(dir, m), path.join(dir, "r.json"), path.join(dir, "r.md")]);
    assert.equal(run("ok.json").status, 0);
    assert.equal(run("bad.json").status, 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "r.json"), "utf8")).verdict, "STOP");
    assert.match(fs.readFileSync(path.join(dir, "r.md"), "utf8"), /STOP reasons/);
  });
});

// ---------------------------------------------------------------------------
// F3 — migration 0023 + importer
// ---------------------------------------------------------------------------
describe("F3 migration 0023 and importer", () => {
  const insertArticle = (raw, key, versionId, number, id) => raw.prepare(
    `INSERT INTO legal_article_versions (canonical_id,instrument_id,instrument_version_id,article_number,article_number_normalized,article_text,source_url,source_sha256)
     VALUES (?,(SELECT id FROM legal_instruments WHERE canonical_key=?),?,?,?,?,?,?)`).run(id, key, versionId, number, number, "x", "u", SHA);

  test("M1 legacy unversioned rows survive 0023 and are listed by the audit view", () => {
    const { raw, applyRemaining } = createD1({ stopBefore: "0023" });
    seedArticles(raw, "mk:zro", [{ number: "1", text: "a" }, { number: "2", text: "b" }], { version: null, status: "historical", review: "pending" });
    applyRemaining();
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions").get().n, 2);
    assert.deepEqual(raw.prepare("SELECT canonical_key, article_count FROM corpus_legacy_unversioned_articles").all().map((r) => ({ ...r })), [{ canonical_key: "mk:zro", article_count: 2 }]);
    assert.equal(raw.prepare("SELECT MAX(CAST(version AS INTEGER)) v FROM schema_migrations").get().v, 23);
  });

  test("T5 duplicate article in one version, NULL version, foreign version and unapproved current are blocked", () => {
    const { raw } = createD1();
    seedArticles(raw, "mk:zro", [{ number: "1", text: "a" }], { version: { label: "v1" }, status: "historical", review: "pending" });
    const v1 = raw.prepare("SELECT id FROM instrument_versions WHERE version_label='v1'").get().id;
    assert.throws(() => insertArticle(raw, "mk:zro", v1, "1", "dup"), /UNIQUE/);
    assert.throws(() => insertArticle(raw, "mk:zro", null, "2", "null"), /instrument_version_id is required/);
    assert.throws(() => insertArticle(raw, "mk:zkp", v1, "2", "foreign"), /different instrument/);
    assert.throws(() => raw.prepare(`INSERT INTO legal_article_versions (canonical_id,instrument_id,instrument_version_id,article_number,article_number_normalized,article_text,source_url,source_sha256,status,human_review_status)
      VALUES ('cur',(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro'),?,'3','3','x','u',?,'current_consolidated','pending')`).run(v1, SHA), /requires human_review_status=approved/);
    assert.throws(() => raw.prepare("INSERT INTO instrument_versions(instrument_id,version_label,valid_from,application_from) VALUES (1,'bad','2026-08-01','2026-01-01')").run(), /impossible validity window/);
  });

  test("M2 importer binds rows to the version, refuses re-runs and unversioned input", () => {
    const { raw } = createD1();
    raw.prepare("INSERT INTO instrument_versions(instrument_id,version_label) VALUES ((SELECT id FROM legal_instruments WHERE canonical_key='mk:zoup'),'zoup-v')").run();
    const p = parseLegalText(CLEAN, { ...META, instrument_key: "mk:zoup", version_id: "zoup-v", version_label: "zoup-v" });
    const nd = [JSON.stringify({ type: "ingest_manifest", ...p, records: undefined }), ...p.records.map((r) => JSON.stringify({ type: "article", ...r }))].join("\n");
    const { sql } = generateImportSql(nd);
    assert.ok(!/INSERT OR REPLACE INTO legal_article_versions/.test(sql), "REPLACE would silently overwrite articles");
    raw.exec(sql);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id=(SELECT id FROM instrument_versions WHERE version_label='zoup-v')").get().n, 3);
    assert.throws(() => raw.exec(sql), /UNIQUE/, "re-running the same import must fail loudly");
    const missing = parseLegalText(CLEAN, { ...META, instrument_key: "mk:zoup", version_id: "nope", version_label: "nope" });
    const nd2 = [JSON.stringify({ type: "ingest_manifest", ...missing, records: undefined }), ...missing.records.map((r) => JSON.stringify({ type: "article", ...r }))].join("\n");
    assert.throws(() => raw.exec(generateImportSql(nd2).sql), /instrument_version_id is required/);
    const broken = parseLegalText("Член 1\n(1) А.\nЧлен 1\n(1) Б.", META, { strict: false });
    assert.throws(() => generateImportSql([JSON.stringify({ type: "ingest_manifest", ...broken, records: undefined }), JSON.stringify({ type: "article", ...broken.records[0] })].join("\n")), /structural error/);
  });
});

// ---------------------------------------------------------------------------
// F4 — version-aware retrieval and alias ambiguity
// ---------------------------------------------------------------------------
let ip = 0;
const nextIp = () => `192.0.2.${(ip++ % 250) + 1}`;
const baseEnv = (d1) => ({ DB: d1, RATE_LIMIT_SALT: "s".repeat(40), ASSETS: { fetch: async () => new Response("x") } });
async function ask(env, q, extra = {}) {
  const r = await worker.fetch(new Request(BASE + "/api/assistant", {
    method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": nextIp() }, body: JSON.stringify({ q, ...extra })
  }), env, {});
  return { status: r.status, body: await r.json() };
}
async function get(env, p) {
  const r = await worker.fetch(new Request(BASE + p), env, {});
  return { status: r.status, body: await r.json() };
}
const usage = (raw) => raw.prepare("SELECT COALESCE(SUM(assistant_requests),0) n FROM membership_usage_monthly").get().n;

function zppTracks({ approveOld = true } = {}) {
  const { d1, raw } = createD1();
  seedArticles(raw, "mk:zpp", [{ number: "12", text: "СТАР ЗПП: странката поднесува тужба до судот." }],
    { status: "source_text", review: "pending", version: { label: "zpp-2005", valid_from: "2005-09-29", valid_to: "2027-01-18", is_current: approveOld ? 1 : 0, human_review_status: approveOld ? "approved" : "pending", version_class: "official_consolidated" } });
  seedArticles(raw, "mk:zpp", [{ number: "12", text: "НОВ ЗПП: тужбата се поднесува електронски до судот." }],
    { status: "source_text", review: "pending", version: { label: "zpp-151-2026", valid_from: "2026-07-01", application_from: "2027-01-18", is_current: 0, human_review_status: "pending", version_class: "original_text" } });
  return { env: baseEnv(d1), raw };
}

describe("F4 version-aware retrieval", () => {
  test("T6 two versions with the same article number -> only the applicable version is returned", async () => {
    const { env } = zppTracks();
    const r = await ask(env, "ЗПП член 12");
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.citations.length, 1);
    assert.match(r.body.citations[0].excerpt, /СТАР ЗПП/);
    assert.equal(r.body.instrumentVersion.label, "zpp-2005");
    assert.equal(r.body.citations[0].version.label, "zpp-2005");
    assert.equal(r.body.versionBasis, "approved_current");
  });

  test("T13 the same article number in two different versions is allowed (and stored once per version)", () => {
    const { raw } = zppTracks();
    const rows = raw.prepare(`SELECT v.version_label, COUNT(*) n FROM legal_article_versions a JOIN instrument_versions v ON v.id=a.instrument_version_id
      WHERE a.article_number_normalized='12' GROUP BY v.version_label ORDER BY 1`).all().map((r) => ({ ...r }));
    assert.deepEqual(rows, [{ version_label: "zpp-151-2026", n: 1 }, { version_label: "zpp-2005", n: 1 }]);
  });

  test("T7 the future version is never used before its application date; a later date selects it", async () => {
    const { env } = zppTracks();
    const before = await ask(env, "ЗПП член 12", { date: "2026-12-31" });
    assert.match(before.body.citations[0].excerpt, /СТАР ЗПП/);
    assert.equal(before.body.versionBasis, "date");
    const after = await ask(env, "ЗПП член 12", { date: "2027-01-18" });
    assert.equal(after.body.instrumentVersion.label, "zpp-151-2026");
    assert.match(after.body.citations[0].excerpt, /НОВ ЗПП/);
    assert.ok(!after.body.citations.some((c) => /СТАР ЗПП/.test(c.excerpt)));
  });

  test("T7b a lone future version is not applicable today (no date) and costs no quota", async () => {
    const { d1, raw } = createD1();
    seedArticles(raw, "mk:zpp", [{ number: "12", text: "НОВ ЗПП." }], { status: "source_text", review: "pending",
      version: { label: "zpp-151-2026", valid_from: "2026-07-01", application_from: "2099-01-18", version_class: "original_text" } });
    const r = await ask(baseEnv(d1), "ЗПП член 12");
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "version_not_yet_applicable");
    assert.equal(usage(raw), 0);
  });

  test("T7c several versions, none approved as current, no date -> version_required with candidates", async () => {
    const { env, raw } = zppTracks({ approveOld: false });
    const r = await ask(env, "ЗПП член 12");
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "version_required");
    assert.deepEqual(r.body.versions.map((v) => v.label).sort(), ["zpp-151-2026", "zpp-2005"]);
    assert.equal(usage(raw), 0, "a controlled refusal consumes no quota");
  });

  test("T8 a historical version is never presented as current", async () => {
    const { d1, raw } = createD1();
    seedArticles(raw, "mk:zkp", [{ number: "12", text: "Судот е должен да постапува без одлагање." }],
      { status: "historical", review: "pending", version: { label: "zkp-ref-198-2018", version_class: "dated_snapshot" } });
    const r = await ask(baseEnv(d1), "ЗКП член 12");
    assert.equal(r.status, 200);
    assert.equal(r.body.instrumentVersion.isCurrent, false);
    assert.equal(r.body.citations[0].version.isCurrent, false);
    assert.match(r.body.legalStatusWarning, /zkp-ref-198-2018/);
    assert.match(r.body.legalStatusWarning, /не смее да се третира како тековен/);
    assert.doesNotMatch(r.body.legalStatusWarning, /111\/2023/, "the ZRO-specific date must not leak into other laws");
  });

  test("T8b legacy unversioned rows and new versioned rows of one law are never mixed", async () => {
    const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
    seedArticles(raw, "mk:zro", [{ number: "12", text: "ЛЕГАЦИ текст." }], { version: null, status: "historical", review: "pending" });
    applyRemaining();
    seedArticles(raw, "mk:zro", [{ number: "12", text: "НОВА верзија." }], { status: "source_text", review: "pending", version: { label: "zro-new" } });
    const r = await ask(baseEnv(d1), "ЗРО член 12");
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "version_ambiguous");
  });

  test("T8c a legacy corpus cannot prove applicability on an explicit date", async () => {
    const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
    seedArticles(raw, "mk:zro", [{ number: "12", text: "Работодавачот е должен." }], { version: null, status: "historical", review: "pending" });
    applyRemaining();
    const r = await ask(baseEnv(d1), "ЗРО член 12", { date: "2010-05-01" });
    assert.equal(r.status, 409);
    assert.equal(r.body.error, "version_date_unverifiable");
    assert.equal((await ask(baseEnv(d1), "ЗРО член 12", { date: "2010-02-30" })).body.error, "invalid_date");
  });

  test("/api/articles serves exactly one version and refuses to mix", async () => {
    const { env } = zppTracks({ approveOld: false });
    const mixed = await get(env, "/api/articles?instrument=mk:zpp");
    assert.equal(mixed.status, 409);
    assert.equal(mixed.body.error, "version_required");
    const dated = await get(env, "/api/articles?instrument=mk:zpp&date=2027-02-01");
    assert.equal(dated.status, 200);
    assert.equal(dated.body.total, 1);
    assert.equal(dated.body.instrumentVersion.label, "zpp-151-2026");
    assert.equal((await get(env, "/api/articles?instrument=mk:zpp&date=bad")).status, 400);
  });
});

describe("F4 alias ambiguity", () => {
  function courtsAndFamily() {
    const { d1, raw } = createD1();
    // Test-only instrument: the Law on Courts is NOT imported by this PR.
    raw.prepare("INSERT INTO legal_instruments(canonical_key,title,short_title,instrument_type,jurisdiction) VALUES ('mk:zsud','Закон за судовите','ЗСуд','law','MK')").run();
    const add = (key, alias) => raw.prepare("INSERT INTO legal_instrument_aliases(instrument_id,alias,language,priority) SELECT id,?, 'mk',200 FROM legal_instruments WHERE canonical_key=?").run(alias, key);
    add("mk:zsud", "ЗС"); add("mk:zsud", "ЗСуд"); add("mk:zsud", "Закон за судовите");
    seedArticles(raw, "mk:zs", [{ number: "12", text: "Бракот се склучува пред матичар." }], { status: "historical", review: "pending", version: { label: "zs-153-2014" } });
    seedArticles(raw, "mk:zsud", [{ number: "12", text: "Судовите се самостојни и независни." }], { status: "source_text", review: "pending", version: { label: "zsud-test" } });
    return { env: baseEnv(d1), raw };
  }

  test("T9 'ЗС' maps to two laws -> instrument_ambiguous with both candidates, no silent winner, no quota", async () => {
    const { env, raw } = courtsAndFamily();
    assert.deepEqual(raw.prepare("SELECT alias, instrument_count FROM legal_instrument_alias_collisions").all().map((r) => ({ ...r })), [{ alias: "ЗС", instrument_count: 2 }]);
    const r = await ask(env, "ЗС член 12");
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "instrument_ambiguous");
    assert.deepEqual(r.body.candidates.map((c) => c.canonicalKey).sort(), ["mk:zs", "mk:zsud"]);
    assert.equal(usage(raw), 0);
  });

  test("T10 explicit 'ЗСем' and 'ЗСуд' resolve to the right law", async () => {
    const { env } = courtsAndFamily();
    const fam = await ask(env, "ЗСем член 12");
    assert.equal(fam.status, 200, JSON.stringify(fam.body));
    assert.equal(fam.body.instrument.canonicalKey, "mk:zs");
    const courts = await ask(env, "ЗСуд член 12");
    assert.equal(courts.body.instrument.canonicalKey, "mk:zsud");
    const full = await ask(env, "Што вели член 12 од Закон за судовите?");
    assert.equal(full.body.instrument.canonicalKey, "mk:zsud", "a full title wins over a shorter alias it contains");
  });

  test("T11 bare 'член 12' remains instrument_required", async () => {
    const { env } = courtsAndFamily();
    const r = await ask(env, "член 12");
    assert.equal(r.status, 400);
    assert.equal(r.body.error, "instrument_required");
  });

  test("two different statutes named in one question -> ambiguous, not the first match", async () => {
    const { d1, raw } = createD1();
    seedArticles(raw, "mk:zro", [{ number: "5", text: "a" }], { status: "historical", review: "pending" });
    const r = await ask(baseEnv(d1), "ЗРО или ЗКП член 5");
    assert.equal(r.body.error, "instrument_ambiguous");
  });
});

// ---------------------------------------------------------------------------
// T12 — existing production corpora (legacy, unversioned) keep working
// ---------------------------------------------------------------------------
describe("T12 compatibility with existing ZRO / ZKP / ZI corpora", () => {
  test("legacy corpora of 298 / 570 / 258 articles still answer and count exactly", async () => {
    const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
    const make = (n, word) => Array.from({ length: n }, (_, i) => ({ number: String(i + 1), text: `${word} одредба број ${i + 1}.` }));
    seedArticles(raw, "mk:zro", make(298, "работна"), { version: null, status: "historical", review: "pending" });
    seedArticles(raw, "mk:zkp", make(570, "кривична"), { version: null, status: "historical", review: "pending" });
    seedArticles(raw, "mk:zi", make(258, "извршна"), { version: null, status: "needs_version_review", review: "pending" });
    applyRemaining();
    const env = baseEnv(d1);
    for (const [key, n, short] of [["mk:zro", 298, "ЗРО"], ["mk:zkp", 570, "ЗКП"], ["mk:zi", 258, "ЗИ"]]) {
      const a = await get(env, `/api/articles?instrument=${key}&limit=1`);
      assert.equal(a.status, 200, key);
      assert.equal(a.body.total, n, key);
      assert.equal(a.body.instrumentVersion.legacyUnversioned, true);
      const r = await ask(env, `${short} член 12`);
      assert.equal(r.status, 200, `${short}: ${JSON.stringify(r.body).slice(0, 200)}`);
      assert.equal(r.body.citations[0].articleNumber, "12");
      assert.ok(r.body.legalStatusWarning, "legacy corpora always carry a status warning");
    }
    const inst = await get(env, "/api/instruments");
    const count = Object.fromEntries(inst.body.instruments.map((i) => [i.canonicalKey, i.articleCount]));
    assert.deepEqual([count["mk:zro"], count["mk:zkp"], count["mk:zi"]], [298, 570, 258]);
  });

  test("Batch 2 versioned corpora (ZOUP, ZSDSP) with their exact production version values stay answerable", async () => {
    const { d1, raw } = createD1();
    seedArticles(raw, "mk:zoup", [{ number: "12", text: "Органот е должен да постапува." }], { status: "needs_version_review", review: "pending",
      version: { label: "official-gazette-base-124-2015-pre-court-effect", valid_from: "2016-07-31", valid_to: null, is_current: 0, human_review_status: "pending" } });
    seedArticles(raw, "mk:zsidp", [{ number: "12", text: "Сопственоста е право." }], { status: "needs_version_review", review: "pending",
      version: { label: "government-hosted-consolidated-through-35-2010", valid_from: null, valid_to: null, is_current: 0, human_review_status: "pending" } });
    const env = baseEnv(d1);
    for (const [q, label] of [["ЗОУП член 12", "official-gazette-base-124-2015-pre-court-effect"], ["ЗСДСП член 12", "government-hosted-consolidated-through-35-2010"]]) {
      const r = await ask(env, q);
      assert.equal(r.status, 200, `${q}: ${JSON.stringify(r.body).slice(0, 160)}`);
      assert.equal(r.body.instrumentVersion.label, label);
      assert.equal(r.body.instrumentVersion.isCurrent, false);
    }
  });
});
