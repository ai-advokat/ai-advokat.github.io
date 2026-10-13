-- AI Advokat Gazette comprehensive archive foundation
-- Scope: issue -> act -> article metadata, 1944-present
-- This schema stores provenance and indexing metadata. Full Gazette text is not bulk-published by this migration.

CREATE TABLE IF NOT EXISTS gazette_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_name TEXT NOT NULL,
  publication_name_historical TEXT,
  year INTEGER NOT NULL CHECK(year BETWEEN 1944 AND 2100),
  issue_number TEXT NOT NULL,
  issue_date TEXT,
  edition_label TEXT,
  month_number INTEGER CHECK(month_number BETWEEN 1 AND 12),
  source_url TEXT NOT NULL,
  source_access_class TEXT NOT NULL DEFAULT 'official_public',
  source_sha256 TEXT,
  page_count INTEGER,
  chronological_register_url TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  provenance_checked_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, issue_number, publication_name)
);

CREATE INDEX IF NOT EXISTS idx_gazette_issues_year_issue
  ON gazette_issues(year, issue_number);
CREATE INDEX IF NOT EXISTS idx_gazette_issues_date
  ON gazette_issues(issue_date);

CREATE TABLE IF NOT EXISTS gazette_acts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL REFERENCES gazette_issues(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  ordinal_in_issue INTEGER,
  act_number TEXT,
  act_type TEXT,
  title TEXT NOT NULL,
  issuer TEXT,
  page_start INTEGER,
  page_end INTEGER,
  source_url TEXT,
  source_sha256 TEXT,
  canonical_instrument_key TEXT,
  legal_effect_class TEXT,
  effective_date TEXT,
  application_date TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(issue_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_gazette_acts_issue
  ON gazette_acts(issue_id);
CREATE INDEX IF NOT EXISTS idx_gazette_acts_title
  ON gazette_acts(title);
CREATE INDEX IF NOT EXISTS idx_gazette_acts_instrument
  ON gazette_acts(canonical_instrument_key);

CREATE TABLE IF NOT EXISTS gazette_act_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  act_id INTEGER NOT NULL REFERENCES gazette_acts(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  paragraph_number TEXT,
  item_number TEXT,
  heading TEXT,
  article_role TEXT,
  amendment_operation TEXT,
  target_instrument_key TEXT,
  target_article_number TEXT,
  text_sha256 TEXT,
  text_storage_policy TEXT NOT NULL DEFAULT 'metadata_only'
    CHECK(text_storage_policy IN ('metadata_only','source_text_authorized','source_text_private')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(act_id, article_number, COALESCE(paragraph_number,''), COALESCE(item_number,''))
);

CREATE INDEX IF NOT EXISTS idx_gazette_articles_act
  ON gazette_act_articles(act_id);
CREATE INDEX IF NOT EXISTS idx_gazette_articles_number
  ON gazette_act_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_gazette_articles_target
  ON gazette_act_articles(target_instrument_key, target_article_number);

CREATE TABLE IF NOT EXISTS gazette_ingest_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_key TEXT NOT NULL UNIQUE,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  act_count INTEGER NOT NULL DEFAULT 0,
  article_count INTEGER NOT NULL DEFAULT 0,
  parse_status TEXT NOT NULL DEFAULT 'staged'
    CHECK(parse_status IN ('staged','parsed','validated','approved','failed')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  checksum_sha256 TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
