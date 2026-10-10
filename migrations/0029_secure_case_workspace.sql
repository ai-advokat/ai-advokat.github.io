-- AI Advokat 0029: Secure Case Workspace v1
--
-- Additive private-case metadata foundation.
-- No document bytes or extracted client content are stored in D1.
-- File storage remains separately locked until a private CASE_FILES object-store binding is approved.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS case_workspaces (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  client_reference TEXT CHECK (client_reference IS NULL OR length(client_reference) <= 120),
  legal_area TEXT CHECK (legal_area IS NULL OR length(legal_area) <= 120),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','closed','delete_pending','deleted')),
  confidentiality_class TEXT NOT NULL DEFAULT 'private_legal'
    CHECK (confidentiality_class IN ('private_legal')),
  document_limit INTEGER NOT NULL DEFAULT 20
    CHECK (document_limit BETWEEN 1 AND 20),
  professional_use_locked INTEGER NOT NULL DEFAULT 1
    CHECK (professional_use_locked IN (0,1)),
  retention_until TEXT,
  delete_requested_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_account_id) REFERENCES membership_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_case_workspaces_owner_status
ON case_workspaces(owner_account_id, status, updated_at);

CREATE TABLE IF NOT EXISTS case_workspace_access (
  case_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  role TEXT NOT NULL
    CHECK (role IN ('owner','lawyer','reviewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','revoked')),
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  PRIMARY KEY (case_id, account_id),
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES membership_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_workspace_access_account
ON case_workspace_access(account_id, status, case_id);

CREATE TABLE IF NOT EXISTS case_document_slots (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 20),
  original_name TEXT CHECK (original_name IS NULL OR length(original_name) <= 180),
  mime_type TEXT CHECK (mime_type IS NULL OR length(mime_type) <= 120),
  sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
  page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
  storage_key TEXT,
  storage_state TEXT NOT NULL DEFAULT 'reserved'
    CHECK (storage_state IN ('reserved','uploaded','quarantined','deleted')),
  extraction_state TEXT NOT NULL DEFAULT 'not_started'
    CHECK (extraction_state IN ('not_started','pending','complete','failed')),
  provenance_required INTEGER NOT NULL DEFAULT 1
    CHECK (provenance_required IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  UNIQUE (case_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_case_document_slots_case
ON case_document_slots(case_id, slot_number);

CREATE TABLE IF NOT EXISTS case_audit_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  actor_account_id TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'workspace_created','workspace_viewed','delete_requested',
      'access_granted','access_revoked',
      'document_slot_reserved','document_uploaded','document_quarantined','document_deleted',
      'analysis_requested','human_gate_recorded','export_generated'
    )),
  object_type TEXT,
  object_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (length(metadata_json) <= 4000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES case_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_account_id) REFERENCES membership_accounts(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_created
ON case_audit_events(case_id, created_at);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('29', 'Secure Case Workspace v1: tenant-bound cases, per-case access, document slots and privacy-preserving audit events');
