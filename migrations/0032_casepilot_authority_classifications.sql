-- 0032: Persist CasePilot issue-specific authority classification inside a private case workspace.
-- Roles are professional work-product metadata, never properties of the judgment itself.
-- Only reviewed official case law may be classified for a case.

CREATE TABLE IF NOT EXISTS casepilot_authority_classifications (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_law_id INTEGER NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('supporting','adverse','distinguishing','neutral')),
  reason TEXT NOT NULL,
  issue_key TEXT,
  classified_by_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','superseded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE RESTRICT,
  FOREIGN KEY (classified_by_account_id) REFERENCES membership_accounts(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_casepilot_authority_active_unique
ON casepilot_authority_classifications(case_id,case_law_id,issue_key)
WHERE status='active';

CREATE INDEX IF NOT EXISTS idx_casepilot_authority_case
ON casepilot_authority_classifications(case_id,status,updated_at);

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('32','CasePilot issue-specific authority classification provenance');
