-- AI Advokat 0029: weighted cost-credit telemetry.
--
-- Adds a privacy-safe operational cost proxy. This is not a monetary price,
-- invoice, billing event or user-content log.

ALTER TABLE lioe_runtime_runs
ADD COLUMN estimated_credit_units INTEGER NOT NULL DEFAULT 1
CHECK (estimated_credit_units BETWEEN 1 AND 25);

CREATE INDEX IF NOT EXISTS idx_lioe_runtime_runs_credit
ON lioe_runtime_runs(estimated_credit_units, finished_at);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('29', 'LIOE weighted credit-unit telemetry for cost calibration');
