-- AI Advokat security hardening: exact, privacy-preserving rate-limit windows.
-- Additive only. Stores an HMAC-derived subject key (never a plaintext IP),
-- a scope label and a counter per fixed time window.
-- Rollback: the Worker simply stops using this table; it can be dropped safely.

CREATE TABLE IF NOT EXISTS security_rate_limit_windows (
  scope TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, subject_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_security_rate_limit_windows_updated
ON security_rate_limit_windows(updated_at);

-- Supports the "one pending request per e-mail per 24h" rule without a full scan.
CREATE INDEX IF NOT EXISTS idx_membership_requests_email_pending
ON membership_requests(email, status, created_at);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('22', 'Security hardening: HMAC-keyed rate-limit windows and membership request de-duplication index');
