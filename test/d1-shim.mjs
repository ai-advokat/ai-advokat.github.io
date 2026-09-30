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

export function createD1({ migrationsDir = "migrations" } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const file of fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }

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

  return { d1: { prepare }, raw: db, stats };
}

export function seedArticles(raw, canonicalKey, articles, { status = "current_consolidated", review = "approved" } = {}) {
  const instrument = raw.prepare("SELECT id FROM legal_instruments WHERE canonical_key=?").get(canonicalKey);
  if (!instrument) throw new Error(`Unknown instrument ${canonicalKey}`);
  const insert = raw.prepare(
    `INSERT INTO legal_article_versions
      (canonical_id,instrument_id,article_number,article_number_normalized,article_heading,
       article_text,status,source_url,source_sha256,human_review_status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  for (const a of articles) {
    insert.run(
      `${canonicalKey}:art:${a.number}`,
      instrument.id,
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
