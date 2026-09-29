-- Case-law authority and relevance layer for AI Advokat.
-- Public-source metadata and extracted legal propositions only.

CREATE TABLE IF NOT EXISTS case_law_authority (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL UNIQUE,
  court_level TEXT,
  chamber_or_section TEXT,
  decision_type TEXT,
  precedential_weight TEXT NOT NULL DEFAULT 'persuasive'
    CHECK (precedential_weight IN ('binding','strong_persuasive','persuasive','contextual','unknown')),
  outcome_side TEXT NOT NULL DEFAULT 'neutral'
    CHECK (outcome_side IN ('supporting','adverse','distinguishing','neutral')),
  outcome_code TEXT,
  convention_articles TEXT,
  domestic_articles TEXT,
  legal_issue_keys TEXT,
  factual_tags TEXT,
  source_language TEXT,
  authoritative_language TEXT,
  finality_date TEXT,
  importance_level TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_law_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL,
  holding_type TEXT NOT NULL DEFAULT 'holding'
    CHECK (holding_type IN ('holding','principle','test','remedy','procedural_rule','dissent','other')),
  proposition TEXT NOT NULL,
  source_locator TEXT,
  source_quote TEXT,
  source_language TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS case_law_citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citing_case_id INTEGER NOT NULL,
  cited_case_id INTEGER,
  cited_reference TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'cites'
    CHECK (relationship IN ('cites','follows','distinguishes','overrules','criticises','applies','mentions')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (citing_case_id) REFERENCES case_law(id) ON DELETE CASCADE,
  FOREIGN KEY (cited_case_id) REFERENCES case_law(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS case_match_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_case_key TEXT NOT NULL,
  case_law_id INTEGER NOT NULL,
  match_role TEXT NOT NULL
    CHECK (match_role IN ('supporting','adverse','distinguishing','neutral')),
  legal_issue_similarity REAL,
  factual_similarity REAL,
  court_weight REAL,
  recency_weight REAL,
  source_quality REAL,
  composite_score REAL,
  explanation TEXT,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_authority_outcome
ON case_law_authority(outcome_side, precedential_weight);

CREATE INDEX IF NOT EXISTS idx_case_holdings_case
ON case_law_holdings(case_law_id, holding_type);

CREATE INDEX IF NOT EXISTS idx_case_match_workspace
ON case_match_assessments(workspace_case_key, match_role, composite_score DESC);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('12', 'Case-law authority, holdings, citations and supporting/adverse/distinguishing matching');
