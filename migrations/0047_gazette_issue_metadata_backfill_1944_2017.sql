-- Canonical Official Gazette issue-metadata backbone (1944-2017)
-- Human-Gate authorized metadata index only. No Gazette full text, act text or current-law promotion.

CREATE TABLE IF NOT EXISTS gazette_issue_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publication_type TEXT NOT NULL,
  issue_number TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  year INTEGER NOT NULL CHECK(year BETWEEN 1944 AND 2100),
  source_row_first INTEGER NOT NULL,
  source_occurrences INTEGER NOT NULL DEFAULT 1 CHECK(source_occurrences >= 1),
  source_authority TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  dataset_url TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  source_class TEXT NOT NULL DEFAULT 'primary_official_metadata',
  human_review_status TEXT NOT NULL DEFAULT 'reviewed'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  runtime_eligible INTEGER NOT NULL DEFAULT 0 CHECK(runtime_eligible IN (0,1)),
  legal_text_authority INTEGER NOT NULL DEFAULT 0 CHECK(legal_text_authority IN (0,1)),
  current_law_authority INTEGER NOT NULL DEFAULT 0 CHECK(current_law_authority IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(publication_type, issue_number, issue_date)
);

CREATE INDEX IF NOT EXISTS idx_gazette_issue_metadata_year_issue
  ON gazette_issue_metadata(year, issue_number);
CREATE INDEX IF NOT EXISTS idx_gazette_issue_metadata_date
  ON gazette_issue_metadata(issue_date);
CREATE INDEX IF NOT EXISTS idx_gazette_issue_metadata_type
  ON gazette_issue_metadata(publication_type);

CREATE TABLE IF NOT EXISTS gazette_issue_metadata_stage (
  publication_type TEXT NOT NULL,
  issue_number TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  year INTEGER NOT NULL,
  source_row_first INTEGER NOT NULL,
  source_occurrences INTEGER NOT NULL,
  source_authority TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  dataset_url TEXT NOT NULL,
  resource_url TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  source_class TEXT NOT NULL,
  human_review_status TEXT NOT NULL,
  runtime_eligible INTEGER NOT NULL,
  legal_text_authority INTEGER NOT NULL,
  current_law_authority INTEGER NOT NULL,
  UNIQUE(publication_type, issue_number, issue_date)
);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('47', 'Create canonical Official Gazette issue-metadata index and controlled staging layer for 1944-2017');
