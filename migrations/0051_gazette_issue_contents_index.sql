-- Gazette issue contents index derived from official chronological registers
-- Scope: issue-level act catalogue metadata only. No act full text and no current-law promotion.

CREATE TABLE IF NOT EXISTS gazette_issue_contents_manifest (
  year INTEGER PRIMARY KEY CHECK(year BETWEEN 1991 AND 2100),
  register_source_url TEXT NOT NULL,
  register_source_sha256 TEXT NOT NULL,
  register_entry_count INTEGER NOT NULL CHECK(register_entry_count >= 0),
  issue_count INTEGER NOT NULL CHECK(issue_count >= 0),
  unresolved_count INTEGER NOT NULL DEFAULT 0 CHECK(unresolved_count >= 0),
  missing_issue_links_count INTEGER NOT NULL DEFAULT 0 CHECK(missing_issue_links_count >= 0),
  reconciliation_status TEXT NOT NULL
    CHECK(reconciliation_status IN ('pending','reconciled','mismatch')),
  verification_status TEXT NOT NULL DEFAULT 'reconciled'
    CHECK(verification_status IN ('pending','reconciled','reviewed','approved')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  runtime_eligible INTEGER NOT NULL DEFAULT 0 CHECK(runtime_eligible IN (0,1)),
  release_authorization_id TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gazette_issue_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL CHECK(year BETWEEN 1991 AND 2100),
  issue_number TEXT NOT NULL,
  ordinal_in_issue INTEGER NOT NULL CHECK(ordinal_in_issue >= 1),
  register_ordinal INTEGER NOT NULL CHECK(register_ordinal >= 1),
  act_type TEXT NOT NULL,
  title TEXT NOT NULL,
  page_start INTEGER,
  register_source_url TEXT NOT NULL,
  register_source_sha256 TEXT NOT NULL,
  source_class TEXT NOT NULL DEFAULT 'primary_official_chronological_register_metadata',
  verification_status TEXT NOT NULL DEFAULT 'reconciled'
    CHECK(verification_status IN ('pending','reconciled','reviewed','approved')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  runtime_eligible INTEGER NOT NULL DEFAULT 0 CHECK(runtime_eligible IN (0,1)),
  legal_text_authority INTEGER NOT NULL DEFAULT 0 CHECK(legal_text_authority IN (0,1)),
  current_law_authority INTEGER NOT NULL DEFAULT 0 CHECK(current_law_authority IN (0,1)),
  release_authorization_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(year, issue_number, register_ordinal, title)
);

CREATE INDEX IF NOT EXISTS idx_gazette_issue_contents_identity
  ON gazette_issue_contents(year, issue_number, ordinal_in_issue);
CREATE INDEX IF NOT EXISTS idx_gazette_issue_contents_type
  ON gazette_issue_contents(year, issue_number, act_type);
CREATE INDEX IF NOT EXISTS idx_gazette_issue_contents_runtime
  ON gazette_issue_contents(runtime_eligible, verification_status, year, issue_number);

CREATE TABLE IF NOT EXISTS gazette_issue_contents_manifest_stage AS
  SELECT * FROM gazette_issue_contents_manifest WHERE 0;

CREATE TABLE IF NOT EXISTS gazette_issue_contents_stage AS
  SELECT * FROM gazette_issue_contents WHERE 0;

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('51', 'Create governed Official Gazette issue-contents index from chronological registers');
