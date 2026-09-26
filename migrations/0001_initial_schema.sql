-- AI Advokat D1 schema v1.0
-- Public legal-information data only. Do not store client secrets or sensitive case files here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'official_gazette','court','government','ministry','parliament',
    'international_court','international_organization','academic',
    'professional','other'
  )),
  title TEXT NOT NULL,
  issuing_body TEXT,
  jurisdiction TEXT,
  url TEXT,
  publication_date TEXT,
  accessed_at TEXT,
  language TEXT DEFAULT 'mk',
  source_status TEXT NOT NULL DEFAULT 'verified'
    CHECK (source_status IN ('official','verified','secondary','pending','withdrawn')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS legal_instruments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_type TEXT NOT NULL,
  title TEXT NOT NULL,
  short_title TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  issuer TEXT,
  gazette_reference TEXT,
  adopted_date TEXT,
  effective_date TEXT,
  repeal_date TEXT,
  current_status TEXT NOT NULL DEFAULT 'current'
    CHECK (current_status IN ('current','amended','repealed','pending','unknown')),
  canonical_source_id INTEGER,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (canonical_source_id) REFERENCES sources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS instrument_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_id INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  valid_from TEXT,
  valid_to TEXT,
  text_content TEXT,
  source_id INTEGER,
  checksum_sha256 TEXT,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0,1)),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
  UNIQUE (instrument_id, version_label)
);

CREATE TABLE IF NOT EXISTS case_law (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'MK',
  case_number TEXT,
  decision_date TEXT,
  case_title TEXT NOT NULL,
  legal_area TEXT,
  procedural_stage TEXT,
  outcome_summary TEXT,
  reasoning_summary TEXT,
  source_id INTEGER,
  source_url TEXT,
  ecli TEXT,
  echr_application_no TEXT,
  finality_status TEXT DEFAULT 'unknown'
    CHECK (finality_status IN ('final','non_final','pending','unknown')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT,
  author_name TEXT NOT NULL,
  publication_type TEXT NOT NULL DEFAULT 'research_article',
  publication_date TEXT,
  venue TEXT,
  language TEXT DEFAULT 'mk',
  version TEXT,
  doi TEXT UNIQUE,
  zenodo_record_id TEXT UNIQUE,
  canonical_url TEXT,
  abstract TEXT,
  keywords TEXT,
  license TEXT,
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft','review','accepted','published','withdrawn')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citing_type TEXT NOT NULL CHECK (citing_type IN ('instrument','case_law','publication','analysis')),
  citing_id INTEGER NOT NULL,
  source_id INTEGER,
  cited_instrument_id INTEGER,
  cited_case_id INTEGER,
  cited_publication_id INTEGER,
  locator TEXT,
  quotation TEXT,
  support_status TEXT NOT NULL DEFAULT 'unchecked'
    CHECK (support_status IN ('unchecked','supports','partial','does_not_support','unavailable')),
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL,
  FOREIGN KEY (cited_instrument_id) REFERENCES legal_instruments(id) ON DELETE SET NULL,
  FOREIGN KEY (cited_case_id) REFERENCES case_law(id) ON DELETE SET NULL,
  FOREIGN KEY (cited_publication_id) REFERENCES publications(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'source','instrument','instrument_version','case_law','publication','citation'
  )),
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  origin TEXT,
  source_url TEXT,
  source_checksum_sha256 TEXT,
  actor_type TEXT NOT NULL DEFAULT 'human'
    CHECK (actor_type IN ('human','system','ai')),
  actor_label TEXT,
  evidence_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS human_gate_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject','return_for_revision')),
  reviewer TEXT NOT NULL,
  review_note TEXT,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sources_type_status
  ON sources(source_type, source_status);
CREATE INDEX IF NOT EXISTS idx_instruments_jurisdiction_status
  ON legal_instruments(jurisdiction, current_status);
CREATE INDEX IF NOT EXISTS idx_instrument_versions_instrument_current
  ON instrument_versions(instrument_id, is_current);
CREATE INDEX IF NOT EXISTS idx_case_law_court_date
  ON case_law(court, decision_date);
CREATE INDEX IF NOT EXISTS idx_case_law_legal_area
  ON case_law(legal_area);
CREATE INDEX IF NOT EXISTS idx_publications_status_date
  ON publications(publication_status, publication_date);
CREATE INDEX IF NOT EXISTS idx_citations_citing
  ON citations(citing_type, citing_id);
CREATE INDEX IF NOT EXISTS idx_provenance_entity
  ON provenance(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_human_gate_entity
  ON human_gate_reviews(entity_type, entity_id, reviewed_at);

INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES ('0001', 'Initial AI Advokat legal information schema with provenance and Human Gate controls');
