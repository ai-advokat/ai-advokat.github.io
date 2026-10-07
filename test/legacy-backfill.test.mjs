// AI Advokat — migrations 0024-0026 governed legacy corpus version-backfill tests.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createD1, seedArticles } from "./d1-shim.mjs";

const ZI_URL = "https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf";
const ZI_SHA = "15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55";
const ZI_LABEL = "official-editorial-consolidated-through-154/2023";

const ZRO_URL = "https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf";
const ZRO_SHA = "f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655";
const ZRO_LABEL = "official-consolidated-snapshot-through-111/2023";

const ZKP_URL = "https://glasprotivnasilstvo.org.mk/wp-content/uploads/2020/10/ZAKON-ZA-KRIVICHNATA-POSTAPKA.pdf";
const ZKP_SHA = "e6bf4588833752695a9b776b473ed9d504264effdfcd7917b8d6655bcfacaf45";
const ZKP_LABEL = "consolidated-reference-through-198/2018-and-CC-193/2016";

function ziNumbers() {
  return [...Array.from({ length: 262 }, (_, i) => i + 1).filter((n) => n < 240 || n > 244), 269];
}

function zroNumbers() {
  // Production ZRO snapshot has 298 article records but the base-law numeric
  // boundary ends at Article 273. The additional records are lettered articles.
  // The synthetic fixture preserves governed count and boundary without claiming
  // the exact source-side distribution of every lettered provision.
  return [
    ...Array.from({ length: 273 }, (_, i) => i + 1),
    "25-а","50-а","60-а","70-а","80-а","90-а","100-а","110-а","120-а",
    "130-а","140-а","150-а","160-а","170-а","180-а","190-а","200-а",
    "210-а","220-а","230-а","240-а","250-а","260-а","270-а","272-а"
  ];
}

function zkpNumbers() {
  // Production parse is 570 records ending at numeric article 568 and includes
  // lettered provisions. The synthetic fixture preserves only the governed
  // count/boundaries; it does not claim these test article numbers mirror the source.
  return [...Array.from({ length: 568 }, (_, i) => i + 1), "100-а", "567-а"];
}

function legacyZiFixture({ corruptOneHash = false } = {}) {
  const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
  const rows = ziNumbers().map((n) => ({ number: String(n), text: `ЗИ тест член ${n}.` }));
  seedArticles(raw, "mk:zi", rows, { version: null, status: "needs_version_review", review: "pending" });

  raw.prepare(
    `UPDATE legal_article_versions
        SET source_url=?, source_sha256=?
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')`
  ).run(ZI_URL, ZI_SHA);

  if (corruptOneHash) {
    raw.prepare(
      `UPDATE legal_article_versions SET source_sha256=?
        WHERE id=(SELECT MIN(id) FROM legal_article_versions
                   WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi'))`
    ).run("f".repeat(64));
  }

  raw.prepare(
    `INSERT INTO instrument_versions
       (instrument_id,version_label,valid_from,valid_to,is_current,checksum_sha256,text_content,human_review_status)
     SELECT id,?,NULL,NULL,0,NULL,NULL,'pending'
       FROM legal_instruments WHERE canonical_key='mk:zi'`
  ).run(ZI_LABEL);

  return { d1, raw, applyRemaining };
}

function legacyZroFixture({ corruptOneHash = false, needsVersionReviewCount = 0 } = {}) {
  const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
  const rows = zroNumbers().map((n) => ({ number: String(n), text: `ЗРО тест член ${n}.` }));
  seedArticles(raw, "mk:zro", rows, { version: null, status: "historical", review: "pending" });

  raw.prepare(
    `UPDATE legal_article_versions
        SET source_url=?, source_sha256=?, source_issue_number='through-111/2023', source_issue_date='2023-05-30'
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')`
  ).run(ZRO_URL, ZRO_SHA);

  if (needsVersionReviewCount > 0) {
    raw.prepare(
      `UPDATE legal_article_versions
          SET status='needs_version_review'
        WHERE id IN (
          SELECT id FROM legal_article_versions
           WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
           ORDER BY id
           LIMIT ?
        )`
    ).run(needsVersionReviewCount);
  }

  if (corruptOneHash) {
    raw.prepare(
      `UPDATE legal_article_versions SET source_sha256=?
        WHERE id=(SELECT MIN(id) FROM legal_article_versions
                   WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro'))`
    ).run("f".repeat(64));
  }

  const target = raw.prepare(
    `SELECT id FROM instrument_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND version_label=?`
  ).get(ZRO_LABEL);
  assert.ok(target, "migration 0014 must provide the governed ZRO target version");

  return { d1, raw, applyRemaining };
}


function legacyZkpFixture({ corruptOneHash = false } = {}) {
  const { d1, raw, applyRemaining } = createD1({ stopBefore: "0023" });
  const rows = zkpNumbers().map((n) => ({ number: String(n), text: `ЗКП тест член ${n}.` }));
  seedArticles(raw, "mk:zkp", rows, { version: null, status: "needs_version_review", review: "pending" });

  raw.prepare(
    `UPDATE legal_article_versions
        SET source_url=?, source_sha256=?,
            source_issue_number='150/2010; 100/2012; 142/2016; 193/2016; 198/2018',
            source_issue_date='2018-10-31'
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')`
  ).run(ZKP_URL, ZKP_SHA);

  if (corruptOneHash) {
    raw.prepare(
      `UPDATE legal_article_versions SET source_sha256=?
        WHERE id=(SELECT MIN(id) FROM legal_article_versions
                   WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp'))`
    ).run("f".repeat(64));
  }

  const target = raw.prepare(
    `SELECT id FROM instrument_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND version_label=?`
  ).get(ZKP_LABEL);
  assert.ok(target, "migration 0018 must provide the governed ZKP target version");

  return { d1, raw, applyRemaining };
}

function snapshot(raw, key) {
  return raw.prepare(
    `SELECT canonical_id,article_number_normalized,article_text,status,
            source_url,source_sha256,source_issue_number,source_issue_date,human_review_status
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key=?)
      ORDER BY id`
  ).all(key).map((r) => ({ ...r }));
}

describe("migration 0024 — ZI legacy version binding", () => {
  test("fresh database applies governed backfill migrations as safe no-ops", () => {
    const { raw } = createD1();
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='24'").get().n, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='25'").get().n, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='26'").get().n, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')").get().n, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')").get().n, 0);
  });

  test("exact 258-row governed snapshot binds to one dated version without changing legal text or status", () => {
    const { raw, applyRemaining } = legacyZiFixture();
    const before = snapshot(raw, "mk:zi");
    assert.equal(before.length, 258);
    applyRemaining();

    const after = snapshot(raw, "mk:zi");
    assert.deepEqual(after, before, "migration must not rewrite text, article identifiers, provenance or Human-Gate status");
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')").get().n, 0);

    const bound = raw.prepare(
      `SELECT COUNT(*) n FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND instrument_version_id=(SELECT id FROM instrument_versions
              WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
                AND version_label=?)`
    ).get(ZI_LABEL).n;
    assert.equal(bound, 258);

    const v = raw.prepare(
      `SELECT version_class,checksum_sha256,source_issue_number,source_issue_date,is_current,human_review_status
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND version_label=?`
    ).get(ZI_LABEL);
    assert.deepEqual({ ...v }, {
      version_class: "dated_snapshot",
      checksum_sha256: ZI_SHA,
      source_issue_number: "72/2016; 142/2016; 178/2017; 26/2018; 233/2018; 14/2020; 136/2020; 154/2023",
      source_issue_date: "2023-07-20",
      is_current: 0,
      human_review_status: "pending"
    });
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='current_consolidated' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')").get().n, 0);
  });

  test("one wrong ZI source hash makes migration 0024 fail closed", () => {
    const { raw, applyRemaining } = legacyZiFixture({ corruptOneHash: true });
    assert.throws(() => applyRemaining(), /CHECK constraint failed|constraint/i);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')").get().n, 258);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='24'").get().n, 0);
  });
});

describe("migration 0025 — ZRO 111/2023 historical snapshot binding", () => {
  test("exact 298-row governed snapshot binds without changing legal text, provenance or historical status", () => {
    const { raw, applyRemaining } = legacyZroFixture();
    const before = snapshot(raw, "mk:zro");
    assert.equal(before.length, 298);
    assert.equal(before.filter((r) => r.article_number_normalized === "25-а").length, 1);
    assert.equal(before.filter((r) => r.article_number_normalized === "273").length, 1);
    assert.equal(before.filter((r) => r.article_number_normalized === "298").length, 0);

    applyRemaining();

    const after = snapshot(raw, "mk:zro");
    assert.deepEqual(after, before, "ZRO backfill may only bind instrument_version_id");
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 0);

    const bound = raw.prepare(
      `SELECT COUNT(*) n FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND instrument_version_id=(SELECT id FROM instrument_versions
              WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
                AND version_label=?)`
    ).get(ZRO_LABEL).n;
    assert.equal(bound, 298);

    const v = raw.prepare(
      `SELECT version_class,checksum_sha256,source_issue_number,source_issue_date,is_current,human_review_status
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND version_label=?`
    ).get(ZRO_LABEL);
    assert.deepEqual({ ...v }, {
      version_class: "dated_snapshot",
      checksum_sha256: ZRO_SHA,
      source_issue_number: "through-111/2023",
      source_issue_date: "2023-05-30",
      is_current: 0,
      human_review_status: "pending"
    });
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='historical' AND human_review_status='pending' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 298);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='current_consolidated' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 0);
  });

  test("mixed historical and needs_version_review ZRO rows bind without status promotion", () => {
    const { raw, applyRemaining } = legacyZroFixture({ needsVersionReviewCount: 26 });
    const before = snapshot(raw, "mk:zro");
    assert.equal(before.filter((r) => r.status === "historical").length, 272);
    assert.equal(before.filter((r) => r.status === "needs_version_review").length, 26);

    applyRemaining();

    const after = snapshot(raw, "mk:zro");
    assert.deepEqual(after, before, "0025 must preserve mixed governed review status exactly");
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='historical' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 272);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='needs_version_review' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 26);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='current_consolidated' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 0);
  });

  test("one wrong ZRO source hash makes migration 0025 fail closed", () => {
    const { raw, applyRemaining } = legacyZroFixture({ corruptOneHash: true });
    assert.throws(() => applyRemaining(), /CHECK constraint failed|constraint/i);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')").get().n, 298);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='25'").get().n, 0);
  });
});


describe("migration 0026 — ZKP 2018 reference-consolidation binding", () => {
  test("exact 570-row governed reference snapshot binds without changing legal text, provenance or review status", () => {
    const { raw, applyRemaining } = legacyZkpFixture();
    const before = snapshot(raw, "mk:zkp");
    assert.equal(before.length, 570);
    assert.equal(before.filter((r) => r.article_number_normalized === "567-а").length, 1);
    assert.equal(before.filter((r) => r.article_number_normalized === "568").length, 1);

    applyRemaining();

    const after = snapshot(raw, "mk:zkp");
    assert.deepEqual(after, before, "ZKP backfill may only bind instrument_version_id");
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')").get().n, 0);

    const bound = raw.prepare(
      `SELECT COUNT(*) n FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND instrument_version_id=(SELECT id FROM instrument_versions
              WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
                AND version_label=?)`
    ).get(ZKP_LABEL).n;
    assert.equal(bound, 570);

    const v = raw.prepare(
      `SELECT version_class,checksum_sha256,source_issue_number,source_issue_date,is_current,human_review_status
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND version_label=?`
    ).get(ZKP_LABEL);
    assert.deepEqual({ ...v }, {
      version_class: "reference_consolidation",
      checksum_sha256: ZKP_SHA,
      source_issue_number: "150/2010; 100/2012; 142/2016; 193/2016; 198/2018",
      source_issue_date: "2018-10-31",
      is_current: 0,
      human_review_status: "pending"
    });

    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='needs_version_review' AND human_review_status='pending' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')").get().n, 570);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE status='current_consolidated' AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')").get().n, 0);
  });

  test("one wrong ZKP source hash makes migration 0026 fail closed", () => {
    const { raw, applyRemaining } = legacyZkpFixture({ corruptOneHash: true });
    assert.throws(() => applyRemaining(), /CHECK constraint failed|constraint/i);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM legal_article_versions WHERE instrument_version_id IS NULL AND instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')").get().n, 570);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM schema_migrations WHERE version='26'").get().n, 0);
  });
});
