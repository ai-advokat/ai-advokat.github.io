-- 0035: Add auditable private document download events for Secure Case Workspace.
-- Rebuilds the constrained audit table while preserving every existing event.

CREATE TABLE case_audit_events_v3 (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  actor_account_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'workspace_created','workspace_viewed','delete_requested',
      'access_granted','access_revoked',
      'document_slot_reserved','document_uploaded','document_downloaded','document_quarantined','document_deleted',
      'analysis_requested','case_law_classified','human_gate_recorded','export_generated'
    )),
  object_type TEXT,
  object_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (length(metadata_json) <= 4000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_account_id) REFERENCES membership_accounts(id) ON DELETE RESTRICT
);

INSERT INTO case_audit_events_v3
  (id,case_id,actor_account_id,event_type,object_type,object_id,metadata_json,created_at)
SELECT
  id,case_id,actor_account_id,event_type,object_type,object_id,metadata_json,created_at
FROM case_audit_events;

DROP TABLE case_audit_events;
ALTER TABLE case_audit_events_v3 RENAME TO case_audit_events;

CREATE INDEX idx_case_audit_events_case_created
ON case_audit_events(case_id,created_at);

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('35','Secure Case Workspace audit schema supports private document downloads');
