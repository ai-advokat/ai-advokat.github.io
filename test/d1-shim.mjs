// Minimal Cloudflare D1 stand-in for security tests.
// Uses node:sqlite (Node >= 22.5) and applies the repository's real migrations,
// so SQL semantics (UPSERT ... WHERE ... RETURNING, CHECK constraints) are tested
// against a real SQLite engine rather than a hand-written mock.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const yieldTurn = () => new Promise((resolve) => setImmediate(resolve));

function toSqlValue(value) {
  if (value === undefined) throw new TypeError("D1_TYPE_ERROR: undefined is not a supported bind value");
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

/**
 * stopBefore: apply only migrations whose file name sorts before this prefix
 * (e.g. "0023") so tests can create legacy rows exactly as production has them,
 * then call applyRemaining() to run the newer migrations on top.
 */
export function createD1({ migrationsDir = "migrations", stopBefore = null } = {}) {
  const db = new DatabaseSync(":memory:");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const pending = [];
  for (const file of files) {
    if (stopBefore && file >= stopBefore) { pending.push(file); continue; }
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  const applyRemaining = () => {
    while (pending.length) db.exec(fs.readFileSync(path.join(migrationsDir, pending.shift()), "utf8"));
  };

  const stats = { statements: 0, bySql: new Map() };

  function prepare(sql) {
    let bindings = [];
    const record = () => {
      stats.statements += 1;
      const key = sql.replace(/\s+/g, " ").trim().slice(0, 80);
      stats.bySql.set(key, (stats.bySql.get(key) || 0) + 1);
    };
    const statement = {
      bind(...values) {
        bindings = values.map(toSqlValue);
        return statement;
      },
      async first() {
        // Yield before executing so concurrent requests genuinely interleave,
        // which is what exposes read-then-write races.
        await yieldTurn();
        record();
        const row = db.prepare(sql).get(...bindings);
        return row ? { ...row } : null;
      },
      async all() {
        await yieldTurn();
        record();
        const rows = db.prepare(sql).all(...bindings).map((r) => ({ ...r }));
        return { results: rows, success: true, meta: {} };
      },
      async run() {
        await yieldTurn();
        record();
        if (/\bRETURNING\b/i.test(sql)) {
          const rows = db.prepare(sql).all(...bindings).map((r) => ({ ...r }));
          return { results: rows, success: true, meta: { changes: rows.length } };
        }
        const info = db.prepare(sql).run(...bindings);
        return { results: [], success: true, meta: { changes: Number(info.changes) } };
      }
    };
    return statement;
  }

  return { d1: { prepare }, raw: db, stats, applyRemaining };
}

/**
 * Seeds article rows bound to an instrument version.
 *   version: { label, valid_from, application_from, valid_to, is_current, human_review_status, version_class }
 *            defaults to an undated, non-current "test-v1" version;
 *            null = legacy unversioned rows (only possible before migration 0023).
 */
export function seedArticles(raw, canonicalKey, articles, { status = "current_consolidated", review = "approved", version = {} } = {}) {
  const instrument = raw.prepare("SELECT id FROM legal_instruments WHERE canonical_key=?").get(canonicalKey);
  if (!instrument) throw new Error(`Unknown instrument ${canonicalKey}`);
  let versionId = null;
  if (version !== null) {
    const v = { label: "test-v1", is_current: 0, human_review_status: "pending", ...version };
    const cols = raw.prepare("PRAGMA table_info(instrument_versions)").all().map((c) => c.name);
    const fields = ["instrument_id", "version_label", "valid_from", "valid_to", "is_current", "human_review_status"];
    const values = [instrument.id, v.label, v.valid_from ?? null, v.valid_to ?? null, v.is_current, v.human_review_status];
    for (const k of ["application_from", "version_class"]) if (cols.includes(k)) { fields.push(k); values.push(v[k] ?? null); }
    raw.prepare(`INSERT OR IGNORE INTO instrument_versions (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`).run(...values);
    versionId = raw.prepare("SELECT id FROM instrument_versions WHERE instrument_id=? AND version_label=?").get(instrument.id, v.label).id;
  }
  const insert = raw.prepare(
    `INSERT INTO legal_article_versions
      (canonical_id,instrument_id,instrument_version_id,article_number,article_number_normalized,article_heading,
       article_text,status,source_url,source_sha256,human_review_status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const a of articles) {
    insert.run(
      `${canonicalKey}:${version === null ? "legacy" : version.label ?? "test-v1"}:art:${a.number}`,
      instrument.id,
      versionId,
      String(a.number),
      String(a.number),
      a.heading ?? null,
      a.text,
      a.status ?? status,
      "https://example.invalid/source",
      "0".repeat(64),
      a.review ?? review
    );
  }
}
