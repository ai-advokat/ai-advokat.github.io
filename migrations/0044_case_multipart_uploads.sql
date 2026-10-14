-- AI Advokat 0044: protected multipart private-case uploads
--
-- Metadata only. No document bytes are stored in D1.
-- Large file bytes are written directly to the existing private CASE_FILES R2 bucket.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS case_multipart_uploads (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  actor_account_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  r2_upload_id TEXT NOT NULL,
  original_name TEXT NOT NULL CHECK (length(original_name) BETWEEN 1 AND 180),
  mime_type TEXT NOT NULL CHECK (length(mime_type) <= 120),
  expected_size INTEGER NOT NULL CHECK (expected_size > 0 AND expected_size <= 524288000),
  part_size INTEGER NOT NULL CHECK (part_size = 8388608),
  total_parts INTEGER NOT NULL CHECK (total_parts BETWEEN 1 AND 64),
  page_count INTEGER,
  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','completed','aborted','failed','expired')),
  integrity_manifest_sha256 TEXT
    CHECK (integrity_manifest_sha256 IS NULL OR length(integrity_manifest_sha256)=64),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES case_document_slots(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_account_id) REFERENCES membership_accounts(id) ON DELETE RESTRICT,
  UNIQUE (case_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_case_multipart_uploads_case_state
ON case_multipart_uploads(case_id, state, expires_at);

CREATE TABLE IF NOT EXISTS case_multipart_parts (
  upload_session_id TEXT NOT NULL,
  part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 64),
  etag TEXT NOT NULL CHECK (length(etag) BETWEEN 1 AND 180),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 8388608),
  sha256 TEXT NOT NULL CHECK (length(sha256)=64),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (upload_session_id, part_number),
  FOREIGN KEY (upload_session_id) REFERENCES case_multipart_uploads(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('44', 'Protected multipart private-case uploads up to 500 MB with per-part integrity metadata');
