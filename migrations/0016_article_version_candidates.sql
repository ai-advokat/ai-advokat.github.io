-- Human Gate candidate reconstructions.
-- Candidate text is never current law until explicitly approved and promoted by a separate governed step.

CREATE TABLE IF NOT EXISTS legal_article_version_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_key TEXT NOT NULL UNIQUE,
  instrument_id INTEGER NOT NULL,
  article_number_normalized TEXT NOT NULL,
  base_article_canonical_id TEXT,
  candidate_text TEXT,
  candidate_heading TEXT,
  effective_from TEXT,
  source_event_keys_json TEXT NOT NULL,
  generation_method TEXT NOT NULL DEFAULT 'human_gate_packet',
  generation_notes TEXT,
  candidate_status TEXT NOT NULL DEFAULT 'review_required'
    CHECK (candidate_status IN ('review_required','generated','approved','rejected','superseded')),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  reviewer TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_candidates_instrument
ON legal_article_version_candidates(instrument_id, article_number_normalized, candidate_status);

CREATE INDEX IF NOT EXISTS idx_article_candidates_review
ON legal_article_version_candidates(human_review_status, candidate_status);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('16', 'Human Gate article-version candidates without automatic current-law promotion');
