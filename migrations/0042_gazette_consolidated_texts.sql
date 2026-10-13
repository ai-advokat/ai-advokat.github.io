-- Gazette consolidated-text governance layer
-- A consolidated text is treated as a derived legal representation, not as a silent replacement of the official amendment chain.

CREATE TABLE IF NOT EXISTS gazette_consolidated_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_instrument_key TEXT NOT NULL,
  title TEXT NOT NULL,
  consolidation_kind TEXT NOT NULL
    CHECK(consolidation_kind IN ('official_consolidated','editorial_consolidated','working_consolidation')),
  reference_date TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  source_basis TEXT NOT NULL,
  official_source_url TEXT,
  source_sha256 TEXT,
  amendment_chain_complete INTEGER NOT NULL DEFAULT 0 CHECK(amendment_chain_complete IN (0,1)),
  constitutional_court_effects_checked INTEGER NOT NULL DEFAULT 0 CHECK(constitutional_court_effects_checked IN (0,1)),
  court_effects_checked INTEGER NOT NULL DEFAULT 0 CHECK(court_effects_checked IN (0,1)),
  effective_application_dates_checked INTEGER NOT NULL DEFAULT 0 CHECK(effective_application_dates_checked IN (0,1)),
  article_count INTEGER NOT NULL DEFAULT 0,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  current_law_eligible INTEGER NOT NULL DEFAULT 0 CHECK(current_law_eligible IN (0,1)),
  publication_status TEXT NOT NULL DEFAULT 'private_working'
    CHECK(publication_status IN ('private_working','catalogue_only','public')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(canonical_instrument_key,reference_date,consolidation_kind)
);

CREATE TABLE IF NOT EXISTS gazette_consolidated_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consolidated_text_id INTEGER NOT NULL REFERENCES gazette_consolidated_texts(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  article_number_normalized TEXT NOT NULL,
  article_heading TEXT,
  article_text TEXT NOT NULL,
  article_sha256 TEXT NOT NULL,
  derivation_trace TEXT NOT NULL,
  last_source_issue_number TEXT,
  last_source_issue_date TEXT,
  source_article_ids TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(consolidated_text_id,article_number_normalized)
);

CREATE INDEX IF NOT EXISTS idx_gazette_consolidated_instrument
  ON gazette_consolidated_texts(canonical_instrument_key,reference_date,current_law_eligible);
CREATE INDEX IF NOT EXISTS idx_gazette_consolidated_articles
  ON gazette_consolidated_articles(consolidated_text_id,article_number_normalized);
