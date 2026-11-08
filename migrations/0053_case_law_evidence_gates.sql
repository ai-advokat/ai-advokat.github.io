-- 0053: Canonical case-law evidence gates derived from the Zoran/Paragraf FAST/F0 review pipeline.
-- Evidence/review metadata only. This migration never promotes a record to authority by itself.

CREATE TABLE IF NOT EXISTS case_law_evidence_gates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL UNIQUE,

  migration_state TEXT NOT NULL DEFAULT 'STAGED_NEEDS_SOURCE_MATCH'
    CHECK (migration_state IN (
      'STAGED_NEEDS_SOURCE_MATCH',
      'SOURCE_BOUND_REVIEW_REQUIRED',
      'BOUNDARY_VERIFIED_LEGAL_REVIEW_REQUIRED',
      'LEGAL_TEMPORAL_VERIFIED_AUTHORITY_REVIEW_REQUIRED',
      'REVIEWED_AUTHORITY_CANDIDATE',
      'PRODUCTION_CITABLE_AUTHORITY'
    )),

  source_locator_present INTEGER NOT NULL DEFAULT 0 CHECK (source_locator_present IN (0,1)),
  source_sha256 TEXT,
  start_page INTEGER,
  start_y_pt REAL,
  end_page INTEGER,
  end_y_pt REAL,
  boundary_reviewer_1_approved INTEGER NOT NULL DEFAULT 0 CHECK (boundary_reviewer_1_approved IN (0,1)),
  boundary_reviewer_2_approved INTEGER NOT NULL DEFAULT 0 CHECK (boundary_reviewer_2_approved IN (0,1)),
  attribution_verified INTEGER NOT NULL DEFAULT 0 CHECK (attribution_verified IN (0,1)),
  complete_unit_verified INTEGER NOT NULL DEFAULT 0 CHECK (complete_unit_verified IN (0,1)),
  warning_flags TEXT,
  warning_disposition TEXT,

  article_text_verified INTEGER NOT NULL DEFAULT 0 CHECK (article_text_verified IN (0,1)),
  historical_law_required INTEGER NOT NULL DEFAULT 0 CHECK (historical_law_required IN (0,1)),
  historical_authentic_gazette_verified INTEGER NOT NULL DEFAULT 0 CHECK (historical_authentic_gazette_verified IN (0,1)),
  transitional_rules_verified INTEGER NOT NULL DEFAULT 0 CHECK (transitional_rules_verified IN (0,1)),
  current_applicability_verified INTEGER NOT NULL DEFAULT 0 CHECK (current_applicability_verified IN (0,1)),
  contrary_authority_checked INTEGER NOT NULL DEFAULT 0 CHECK (contrary_authority_checked IN (0,1)),

  holding_verified INTEGER NOT NULL DEFAULT 0 CHECK (holding_verified IN (0,1)),
  authority_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (authority_review_status IN ('pending','reviewed','approved','rejected')),
  legal_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (legal_review_status IN ('pending','reviewed','approved','rejected')),

  publication_approved INTEGER NOT NULL DEFAULT 0 CHECK (publication_approved IN (0,1)),
  human_gate_approved INTEGER NOT NULL DEFAULT 0 CHECK (human_gate_approved IN (0,1)),
  algorithm_scoring_allowed INTEGER NOT NULL DEFAULT 0 CHECK (algorithm_scoring_allowed IN (0,1)),

  reviewer_evidence_reference TEXT,
  reviewer_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_law_evidence_gate_state
ON case_law_evidence_gates(migration_state, publication_approved, human_gate_approved);

CREATE INDEX IF NOT EXISTS idx_case_law_evidence_gate_temporal
ON case_law_evidence_gates(current_applicability_verified, contrary_authority_checked, legal_review_status);

CREATE TABLE IF NOT EXISTS case_law_echr_comparison_gates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL,
  hudoc_item_id TEXT,
  echr_application_number TEXT,
  comparison_status TEXT NOT NULL DEFAULT 'RESEARCH_CANDIDATE',
  hudoc_metadata_verified INTEGER NOT NULL DEFAULT 0 CHECK (hudoc_metadata_verified IN (0,1)),
  historical_domestic_law_verified INTEGER NOT NULL DEFAULT 0 CHECK (historical_domestic_law_verified IN (0,1)),
  independent_comparative_legal_review INTEGER NOT NULL DEFAULT 0 CHECK (independent_comparative_legal_review IN (0,1)),
  human_verified INTEGER NOT NULL DEFAULT 0 CHECK (human_verified IN (0,1)),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  reviewer_evidence_reference TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_law_echr_gate_case
ON case_law_echr_comparison_gates(case_law_id, comparison_status, human_verified);

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('53','Case-law boundary, temporal/article, contrary-authority, Human Gate and ECHR comparison evidence gates');
