-- Paragraf legacy migration landing tables.
-- This migration creates metadata-only structures. It does NOT import private data.

CREATE TABLE IF NOT EXISTS legacy_import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_system TEXT NOT NULL DEFAULT 'paragraf.mk',
  source_export_id TEXT,
  source_export_sha256 TEXT,
  import_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (import_status IN ('pending','validated','staging_imported','approved','production_imported','rejected')),
  item_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legacy_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER,
  legacy_id TEXT,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  source_url TEXT,
  source_path TEXT,
  source_sha256 TEXT,
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','restricted','private')),
  provenance_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (provenance_status IN ('pending','verified','rejected')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  text_content TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES legacy_import_batches(id) ON DELETE SET NULL,
  UNIQUE (legacy_id, source_sha256)
);

CREATE INDEX IF NOT EXISTS idx_legacy_documents_title ON legacy_documents(title);
CREATE INDEX IF NOT EXISTS idx_legacy_documents_type ON legacy_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legacy_documents_visibility ON legacy_documents(visibility);
CREATE INDEX IF NOT EXISTS idx_legacy_documents_knowledge ON legacy_documents(knowledge_eligible, corpus_role);
CREATE INDEX IF NOT EXISTS idx_legacy_documents_review ON legacy_documents(provenance_status, human_review_status);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('4', 'Create metadata landing zone for controlled Paragraf.mk migration');
