-- 0052: Hybrid Legal Intelligence R1
-- Persistent governed graph for five deterministic capabilities:
-- Article Time Machine, delegated legislation, article-case-law links,
-- effective-date calendar, and visual consolidation diffs.
-- No row in these tables promotes current law autonomously.

CREATE TABLE IF NOT EXISTS legal_delegated_legislation_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_instrument_key TEXT NOT NULL,
  basis_article TEXT NOT NULL,
  child_instrument_key TEXT NOT NULL,
  child_title TEXT NOT NULL,
  act_type TEXT,
  source_url TEXT NOT NULL,
  source_issue_number TEXT,
  publication_date TEXT,
  effective_from TEXT,
  application_from TEXT,
  authority_status TEXT NOT NULL DEFAULT 'primary_official',
  official_source INTEGER NOT NULL DEFAULT 1 CHECK(official_source IN (0,1)),
  status TEXT NOT NULL DEFAULT 'verified_link',
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_instrument_key,basis_article,child_instrument_key,source_url)
);

CREATE INDEX IF NOT EXISTS idx_delegated_parent_article
  ON legal_delegated_legislation_links(parent_instrument_key,basis_article);

CREATE TABLE IF NOT EXISTS legal_article_case_law_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_key TEXT NOT NULL,
  article_number TEXT NOT NULL,
  case_law_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'interprets'
    CHECK(relation_type IN ('interprets','applies','distinguishes','limits','references','constitutional_effect')),
  source_binding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(source_binding_status IN ('pending','reviewed','approved')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_key,article_number,case_law_id,relation_type)
);

CREATE INDEX IF NOT EXISTS idx_article_case_law_lookup
  ON legal_article_case_law_links(instrument_key,article_number);

CREATE TABLE IF NOT EXISTS legal_effective_date_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_key TEXT,
  instrument_title TEXT NOT NULL,
  act_type TEXT,
  event_type TEXT NOT NULL
    CHECK(event_type IN ('PUBLICATION','ENTRY_INTO_FORCE','APPLICATION_START','APPLICATION_END','LEGAL_EFFECT')),
  event_date TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_issue_number TEXT,
  source_sha256 TEXT,
  provenance_state TEXT NOT NULL DEFAULT 'official_source_bound',
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_key,event_type,event_date,source_url)
);

CREATE INDEX IF NOT EXISTS idx_legal_calendar_date
  ON legal_effective_date_events(event_date,instrument_key);

CREATE TABLE IF NOT EXISTS legal_consolidation_diff_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_key TEXT NOT NULL,
  before_version_label TEXT,
  after_version_label TEXT,
  before_reference_date TEXT,
  after_reference_date TEXT,
  source_basis TEXT NOT NULL,
  release_state TEXT NOT NULL DEFAULT 'working_diff'
    CHECK(release_state IN ('working_diff','reviewed_diff','approved_diff')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_consolidation_diff_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diff_run_id INTEGER NOT NULL REFERENCES legal_consolidation_diff_runs(id) ON DELETE CASCADE,
  article_number TEXT NOT NULL,
  change_type TEXT NOT NULL
    CHECK(change_type IN ('ADDED','REMOVED','MODIFIED','UNCHANGED')),
  before_text TEXT,
  after_text TEXT,
  before_source_url TEXT,
  after_source_url TEXT,
  before_derivation_trace TEXT,
  after_derivation_trace TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(human_review_status IN ('pending','reviewed','approved')),
  UNIQUE(diff_run_id,article_number)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_diff_article
  ON legal_consolidation_diff_articles(diff_run_id,change_type,article_number);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('52', 'Hybrid Legal Intelligence R1 graph: bylaws, article-case-law, calendar and consolidation diffs');
