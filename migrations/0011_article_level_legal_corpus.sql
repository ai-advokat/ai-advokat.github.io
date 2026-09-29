-- Article-level public legal corpus for AI Advokat.
-- This schema stores only public/authorized legal text and provenance.
-- No private case/client data belongs in these tables.

CREATE TABLE IF NOT EXISTS legal_article_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_id TEXT NOT NULL UNIQUE,
  instrument_id INTEGER NOT NULL,
  instrument_version_id INTEGER,
  article_number TEXT NOT NULL,
  article_number_normalized TEXT NOT NULL,
  article_heading TEXT,
  article_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'source_text'
    CHECK (status IN ('source_text','verified','needs_version_review','current_consolidated','historical','repealed')),
  valid_from TEXT,
  valid_to TEXT,
  source_issue_number TEXT,
  source_issue_date TEXT,
  source_url TEXT NOT NULL,
  source_page_start INTEGER,
  source_page_end INTEGER,
  source_sha256 TEXT NOT NULL,
  extraction_method TEXT NOT NULL DEFAULT 'text_parser',
  extraction_confidence REAL,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  supersedes_canonical_id TEXT,
  superseded_by_canonical_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE,
  FOREIGN KEY (instrument_version_id) REFERENCES instrument_versions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS legal_article_paragraphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_version_id INTEGER NOT NULL,
  paragraph_number TEXT NOT NULL,
  paragraph_order INTEGER NOT NULL,
  paragraph_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_version_id) REFERENCES legal_article_versions(id) ON DELETE CASCADE,
  UNIQUE(article_version_id, paragraph_order)
);

CREATE TABLE IF NOT EXISTS legal_article_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paragraph_id INTEGER NOT NULL,
  item_number TEXT NOT NULL,
  item_order INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paragraph_id) REFERENCES legal_article_paragraphs(id) ON DELETE CASCADE,
  UNIQUE(paragraph_id, item_order)
);

CREATE TABLE IF NOT EXISTS legal_amendment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_id INTEGER NOT NULL,
  target_article_number TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('amend','insert','delete','replace','renumber','correct','interpret','court_effect','other')),
  event_text TEXT NOT NULL,
  source_issue_number TEXT,
  source_issue_date TEXT,
  source_url TEXT NOT NULL,
  source_page_start INTEGER,
  source_page_end INTEGER,
  source_sha256 TEXT NOT NULL,
  effective_date TEXT,
  application_date TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS corpus_ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_key TEXT NOT NULL UNIQUE,
  source_url TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  instrument_id INTEGER,
  input_kind TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged','validated','rejected','imported')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_article_versions_instrument
ON legal_article_versions(instrument_id, article_number_normalized, valid_from);

CREATE INDEX IF NOT EXISTS idx_article_versions_status
ON legal_article_versions(status, human_review_status);

CREATE INDEX IF NOT EXISTS idx_article_versions_source
ON legal_article_versions(source_issue_date, source_issue_number);

CREATE INDEX IF NOT EXISTS idx_article_paragraphs_article
ON legal_article_paragraphs(article_version_id, paragraph_order);

CREATE INDEX IF NOT EXISTS idx_amendment_events_instrument
ON legal_amendment_events(instrument_id, target_article_number, effective_date);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('11', 'Article-level legal corpus, paragraphs, amendment events and ingest audit');
