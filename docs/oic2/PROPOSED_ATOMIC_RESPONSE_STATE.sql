-- Review-only schema for a disposable database after the existing migrations.
CREATE TABLE case_response_source_epochs (
  case_id TEXT PRIMARY KEY REFERENCES case_workspaces(id) ON DELETE CASCADE,
  epoch INTEGER NOT NULL DEFAULT 0 CHECK (epoch >= 0)
);

INSERT INTO case_response_source_epochs (case_id)
SELECT id FROM case_workspaces;

CREATE TRIGGER case_response_source_epoch_create AFTER INSERT ON case_workspaces
BEGIN
  INSERT INTO case_response_source_epochs (case_id) VALUES (NEW.id);
END;

CREATE TABLE case_response_extraction_heads (
  document_id TEXT PRIMARY KEY REFERENCES case_document_slots(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES case_workspaces(id) ON DELETE CASCADE,
  source_sha256 TEXT NOT NULL CHECK (length(source_sha256) = 64),
  object_sha256 TEXT NOT NULL CHECK (length(object_sha256) = 64),
  operation_id TEXT NOT NULL
);

CREATE TABLE case_response_revision_publications (
  case_id TEXT NOT NULL REFERENCES case_workspaces(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 1),
  revision_sha256 TEXT NOT NULL CHECK (length(revision_sha256) = 64),
  object_sha256 TEXT NOT NULL CHECK (length(object_sha256) = 64),
  source_epoch INTEGER NOT NULL CHECK (source_epoch >= 0),
  PRIMARY KEY (case_id, revision_number)
) WITHOUT ROWID;

CREATE TRIGGER case_response_sources_document_added AFTER INSERT ON case_document_slots
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id = NEW.case_id;
END;

CREATE TRIGGER case_response_sources_document_changed
AFTER UPDATE OF id, case_id, slot_number, sha256, storage_key, storage_state, extraction_state
ON case_document_slots
WHEN OLD.id IS NOT NEW.id OR OLD.case_id IS NOT NEW.case_id OR OLD.slot_number IS NOT NEW.slot_number
  OR OLD.sha256 IS NOT NEW.sha256 OR OLD.storage_key IS NOT NEW.storage_key
  OR OLD.storage_state IS NOT NEW.storage_state OR OLD.extraction_state IS NOT NEW.extraction_state
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id IN (OLD.case_id, NEW.case_id);
END;

CREATE TRIGGER case_response_sources_document_removed AFTER DELETE ON case_document_slots
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id = OLD.case_id;
END;

CREATE TRIGGER case_response_sources_extraction_added AFTER INSERT ON case_response_extraction_heads
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id = NEW.case_id;
END;

CREATE TRIGGER case_response_sources_extraction_republished AFTER UPDATE ON case_response_extraction_heads
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id IN (OLD.case_id, NEW.case_id);
END;

CREATE TRIGGER case_response_sources_extraction_removed AFTER DELETE ON case_response_extraction_heads
BEGIN
  UPDATE case_response_source_epochs SET epoch = epoch + 1 WHERE case_id = OLD.case_id;
END;


-- Keep the last epoch across deletion and recreation of the same grant or identity.
CREATE TABLE case_response_authorization_epochs (
  scope TEXT NOT NULL CHECK (scope IN ('account','workspace','grant')),
  account_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  epoch INTEGER NOT NULL DEFAULT 0 CHECK (epoch >= 0),
  CHECK ((scope = 'account' AND account_id <> '' AND case_id = '')
    OR (scope = 'workspace' AND account_id = '' AND case_id <> '')
    OR (scope = 'grant' AND account_id <> '' AND case_id <> '')),
  PRIMARY KEY (scope, account_id, case_id)
) WITHOUT ROWID;

INSERT INTO case_response_authorization_epochs (scope, account_id, case_id)
SELECT 'account', id, '' FROM membership_accounts
UNION ALL SELECT 'workspace', '', id FROM case_workspaces
UNION ALL SELECT 'grant', account_id, case_id FROM case_workspace_access;

-- Capture a displaced owner even when SQLite REPLACE omits delete triggers.
CREATE TRIGGER case_response_epoch_key_displaced BEFORE INSERT ON membership_access_keys
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT DISTINCT 'account', account_id, '', 1 FROM membership_access_keys
  WHERE (id = NEW.id OR key_hash = NEW.key_hash) AND account_id <> NEW.account_id
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_entitlement_displaced BEFORE INSERT ON membership_entitlements
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'account', account_id, '', 1 FROM membership_entitlements
  WHERE id = NEW.id AND account_id <> NEW.account_id
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_accounts_inserted
AFTER INSERT ON membership_accounts
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', NEW.id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_accounts_changed
AFTER UPDATE OF id, status ON membership_accounts
WHEN OLD.id IS NOT NEW.id
  OR OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'account', OLD.id, '', 1
  UNION SELECT 'account', NEW.id, '', 1 WHERE 1
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_accounts_deleted
AFTER DELETE ON membership_accounts
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', OLD.id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_access_keys_inserted
AFTER INSERT ON membership_access_keys
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', NEW.account_id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_access_keys_changed
AFTER UPDATE OF id, account_id, key_hash, status, expires_at ON membership_access_keys
WHEN OLD.id IS NOT NEW.id
  OR OLD.account_id IS NOT NEW.account_id
  OR OLD.key_hash IS NOT NEW.key_hash
  OR OLD.status IS NOT NEW.status
  OR OLD.expires_at IS NOT NEW.expires_at
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'account', OLD.account_id, '', 1
  UNION SELECT 'account', NEW.account_id, '', 1 WHERE 1
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_access_keys_deleted
AFTER DELETE ON membership_access_keys
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', OLD.account_id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_entitlements_inserted
AFTER INSERT ON membership_entitlements
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', NEW.account_id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_entitlements_changed
AFTER UPDATE OF id, account_id, plan_code, status, expires_at, updated_at ON membership_entitlements
WHEN OLD.id IS NOT NEW.id
  OR OLD.account_id IS NOT NEW.account_id
  OR OLD.plan_code IS NOT NEW.plan_code
  OR OLD.status IS NOT NEW.status
  OR OLD.expires_at IS NOT NEW.expires_at
  OR OLD.updated_at IS NOT NEW.updated_at
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'account', OLD.account_id, '', 1
  UNION SELECT 'account', NEW.account_id, '', 1 WHERE 1
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_membership_entitlements_deleted
AFTER DELETE ON membership_entitlements
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('account', OLD.account_id, '', 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspaces_inserted
AFTER INSERT ON case_workspaces
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('workspace', '', NEW.id, 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspaces_changed
AFTER UPDATE OF id, owner_account_id, status ON case_workspaces
WHEN OLD.id IS NOT NEW.id
  OR OLD.owner_account_id IS NOT NEW.owner_account_id
  OR OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'workspace', '', OLD.id, 1
  UNION SELECT 'workspace', '', NEW.id, 1 WHERE 1
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspaces_deleted
AFTER DELETE ON case_workspaces
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('workspace', '', OLD.id, 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspace_access_inserted
AFTER INSERT ON case_workspace_access
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('grant', NEW.account_id, NEW.case_id, 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspace_access_changed
AFTER UPDATE OF account_id, case_id, role, status ON case_workspace_access
WHEN OLD.account_id IS NOT NEW.account_id
  OR OLD.case_id IS NOT NEW.case_id
  OR OLD.role IS NOT NEW.role
  OR OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  SELECT 'grant', OLD.account_id, OLD.case_id, 1
  UNION SELECT 'grant', NEW.account_id, NEW.case_id, 1 WHERE 1
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_epoch_case_workspace_access_deleted
AFTER DELETE ON case_workspace_access
BEGIN
  INSERT INTO case_response_authorization_epochs (scope, account_id, case_id, epoch)
  VALUES ('grant', OLD.account_id, OLD.case_id, 1)
  ON CONFLICT (scope, account_id, case_id) DO UPDATE SET epoch = epoch + 1;
END;


-- Use an empty case ID for the shared D1 registry epoch, and private-case IDs
-- for changes to issue-specific authority classifications.
CREATE TABLE case_response_legal_authority_epochs (
  case_id TEXT PRIMARY KEY,
  epoch INTEGER NOT NULL DEFAULT 0 CHECK (epoch >= 0)
) WITHOUT ROWID;

INSERT INTO case_response_legal_authority_epochs (case_id) VALUES ('');

-- An isolated acceptance database must explicitly register the reviewed Worker digest.
CREATE TABLE case_response_legal_policy (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*')
);

CREATE TRIGGER case_response_legal_policy_registered AFTER INSERT ON case_response_legal_policy
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_policy_changed AFTER UPDATE OF sha256 ON case_response_legal_policy
WHEN OLD.sha256 IS NOT NEW.sha256
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_policy_removed AFTER DELETE ON case_response_legal_policy
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_sources_insert AFTER INSERT ON sources
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_sources_update AFTER UPDATE ON sources
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_sources_delete AFTER DELETE ON sources
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_instruments_insert AFTER INSERT ON legal_instruments
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_instruments_update AFTER UPDATE ON legal_instruments
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_instruments_delete AFTER DELETE ON legal_instruments
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_versions_insert AFTER INSERT ON instrument_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_versions_update AFTER UPDATE ON instrument_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_versions_delete AFTER DELETE ON instrument_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_aliases_insert AFTER INSERT ON legal_instrument_aliases
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_aliases_update AFTER UPDATE ON legal_instrument_aliases
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_aliases_delete AFTER DELETE ON legal_instrument_aliases
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_articles_insert AFTER INSERT ON legal_article_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_articles_update AFTER UPDATE ON legal_article_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_articles_delete AFTER DELETE ON legal_article_versions
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_chunks_insert AFTER INSERT ON gazette_article_chunks
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_chunks_update AFTER UPDATE ON gazette_article_chunks
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_chunks_delete AFTER DELETE ON gazette_article_chunks
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgments_insert AFTER INSERT ON case_law
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgments_update AFTER UPDATE ON case_law
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgments_delete AFTER DELETE ON case_law
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_authority_insert AFTER INSERT ON case_law_authority
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_authority_update AFTER UPDATE ON case_law_authority
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_authority_delete AFTER DELETE ON case_law_authority
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_holdings_insert AFTER INSERT ON case_law_holdings
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_holdings_update AFTER UPDATE ON case_law_holdings
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_holdings_delete AFTER DELETE ON case_law_holdings
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_evidence_gates_insert AFTER INSERT ON case_law_evidence_gates
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_evidence_gates_update AFTER UPDATE ON case_law_evidence_gates
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_judgment_evidence_gates_delete AFTER DELETE ON case_law_evidence_gates
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_issue_metadata_insert AFTER INSERT ON gazette_issue_metadata
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_issue_metadata_update AFTER UPDATE ON gazette_issue_metadata
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_gazette_issue_metadata_delete AFTER DELETE ON gazette_issue_metadata
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_case_law_provenance_insert AFTER INSERT ON case_law_provenance
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_case_law_provenance_update AFTER UPDATE ON case_law_provenance
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_case_law_provenance_delete AFTER DELETE ON case_law_provenance
BEGIN
  UPDATE case_response_legal_authority_epochs SET epoch = epoch + 1 WHERE case_id = '';
END;

CREATE TRIGGER case_response_legal_classifications_insert AFTER INSERT ON casepilot_authority_classifications
BEGIN
  INSERT INTO case_response_legal_authority_epochs (case_id, epoch)
  VALUES (NEW.case_id, 1)
  ON CONFLICT (case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_legal_classifications_update AFTER UPDATE ON casepilot_authority_classifications
BEGIN
  INSERT INTO case_response_legal_authority_epochs (case_id, epoch)
  SELECT OLD.case_id, 1 UNION SELECT NEW.case_id, 1 WHERE 1
  ON CONFLICT (case_id) DO UPDATE SET epoch = epoch + 1;
END;

CREATE TRIGGER case_response_legal_classifications_delete AFTER DELETE ON casepilot_authority_classifications
BEGIN
  INSERT INTO case_response_legal_authority_epochs (case_id, epoch)
  VALUES (OLD.case_id, 1)
  ON CONFLICT (case_id) DO UPDATE SET epoch = epoch + 1;
END;

-- These tables exercise final commit races in an isolated validation database.
CREATE TABLE case_response_export_validation_policy (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  epoch INTEGER NOT NULL CHECK (epoch >= 0),
  hold_active INTEGER NOT NULL CHECK (hold_active IN (0,1))
);

INSERT INTO case_response_export_validation_policy (slot, epoch, hold_active) VALUES (1,0,1);

CREATE TRIGGER case_response_export_validation_policy_monotonic
BEFORE UPDATE ON case_response_export_validation_policy WHEN NEW.epoch <= OLD.epoch
BEGIN
  SELECT RAISE(ABORT, 'export validation policy epoch must advance');
END;

CREATE TRIGGER case_response_export_validation_policy_keep BEFORE DELETE ON case_response_export_validation_policy
BEGIN
  SELECT RAISE(ABORT, 'export validation policy row is durable');
END;

CREATE TABLE case_response_export_validation_receipts (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES case_workspaces(id) ON DELETE CASCADE,
  actor_account_id TEXT NOT NULL REFERENCES membership_accounts(id),
  decision_id TEXT NOT NULL REFERENCES case_audit_events(id),
  revision_sha256 TEXT NOT NULL CHECK (length(revision_sha256) = 64),
  format TEXT NOT NULL CHECK (format IN ('docx','pdf')),
  model_sha256 TEXT NOT NULL CHECK (length(model_sha256) = 64),
  artifact_sha256 TEXT NOT NULL CHECK (length(artifact_sha256) = 64),
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
