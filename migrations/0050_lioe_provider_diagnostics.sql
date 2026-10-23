-- AI Advokat 4 P0 observability migration.
-- Prepared only; production execution requires a separate Human Gate.
-- Stores technical provider diagnostics only. No prompts, answers, secrets,
-- membership identities, attachment content or client facts are added.

ALTER TABLE lioe_runtime_runs ADD COLUMN error_code TEXT;
ALTER TABLE lioe_runtime_runs ADD COLUMN http_status INTEGER;
ALTER TABLE lioe_runtime_runs ADD COLUMN response_status TEXT;
ALTER TABLE lioe_runtime_runs ADD COLUMN incomplete_reason TEXT;
ALTER TABLE lioe_runtime_runs ADD COLUMN provider_request_id TEXT;
ALTER TABLE lioe_runtime_runs ADD COLUMN provider_response_id TEXT;
ALTER TABLE lioe_runtime_runs ADD COLUMN provider_timeout_ms INTEGER;
ALTER TABLE lioe_runtime_runs ADD COLUMN provider_attempts_json TEXT;

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('50','LIOE privacy-safe provider failure diagnostics');
