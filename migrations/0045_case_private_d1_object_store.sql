-- 0045: Private CasePilot D1 fallback object store.
-- Used only when R2 is unavailable and CASE_D1_FALLBACK_ENABLED=true.
-- Data remain private, case-scoped through opaque object keys, and are never promoted to the public corpus.
-- Objects are chunked below the Cloudflare D1 per-row limit.

CREATE TABLE IF NOT EXISTS case_private_object_chunks (
  object_key TEXT NOT NULL,
  chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
  chunk_b64 TEXT NOT NULL,
  byte_length INTEGER NOT NULL CHECK (byte_length >= 0 AND byte_length <= 1048576),
  content_type TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (length(metadata_json) <= 4000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (object_key, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_case_private_object_chunks_key
ON case_private_object_chunks(object_key, chunk_index);

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('45','Private CasePilot D1 fallback object store for bounded document and derived-artifact storage');
