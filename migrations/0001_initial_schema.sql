CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'reference',
  issuing_body TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  source_status TEXT NOT NULL DEFAULT 'pending',
  publication_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_instruments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  short_title TEXT,
  instrument_type TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  gazette_reference TEXT,
  adopted_date TEXT,
  effective_date TEXT,
  current_status TEXT NOT NULL DEFAULT 'unknown',
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  canonical_source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canonical_source_id) REFERENCES sources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instrument_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_id INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  checksum_sha256 TEXT,
  text_content TEXT,
  source_url TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE,
  UNIQUE (instrument_id, version_label)
);

CREATE TABLE IF NOT EXISTS case_law (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_title TEXT NOT NULL,
  court TEXT NOT NULL,
  case_number TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  legal_area TEXT,
  decision_date TEXT,
  outcome_summary TEXT,
  reasoning_summary TEXT,
  source_id INTEGER,
  source_url TEXT,
  finality_status TEXT NOT NULL DEFAULT 'unknown',
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  author_name TEXT NOT NULL,
  venue TEXT,
  publication_type TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft',
  publication_date TEXT,
  doi TEXT UNIQUE,
  canonical_url TEXT,
  abstract TEXT,
  keywords TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citing_type TEXT NOT NULL,
  citing_id INTEGER NOT NULL,
  locator TEXT,
  quotation TEXT,
  support_status TEXT NOT NULL DEFAULT 'pending',
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_status ON sources(source_status, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title);
CREATE INDEX IF NOT EXISTS idx_legal_instruments_title ON legal_instruments(title);
CREATE INDEX IF NOT EXISTS idx_legal_instruments_status ON legal_instruments(current_status, jurisdiction);
CREATE INDEX IF NOT EXISTS idx_instrument_versions_instrument ON instrument_versions(instrument_id, is_current);
CREATE INDEX IF NOT EXISTS idx_case_law_case_number ON case_law(case_number);
CREATE INDEX IF NOT EXISTS idx_case_law_decision_date ON case_law(decision_date);
CREATE INDEX IF NOT EXISTS idx_publications_doi ON publications(doi);
CREATE INDEX IF NOT EXISTS idx_publications_status ON publications(publication_status);
CREATE INDEX IF NOT EXISTS idx_citations_locator ON citations(locator);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('1', 'Initial AI Advokat public legal research schema');
