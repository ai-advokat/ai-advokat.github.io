-- AI Advokat Membership v1
-- Stores only entitlement/payment metadata; never card numbers, passwords or legal-client files.
-- Production activation remains Human-Gate controlled.

CREATE TABLE IF NOT EXISTS membership_accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  organization_name TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending','active','suspended','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS membership_entitlements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  plan_code TEXT NOT NULL
    CHECK (plan_code IN ('trial_pro','start','pro','office')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial','active','expired','cancelled','suspended')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('trial','monthly','annual','manual')),
  monthly_quota INTEGER NOT NULL CHECK (monthly_quota > 0),
  seat_limit INTEGER NOT NULL DEFAULT 1 CHECK (seat_limit > 0),
  price_mkd INTEGER NOT NULL DEFAULT 0 CHECK (price_mkd >= 0),
  starts_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES membership_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_entitlements_account
ON membership_entitlements(account_id, status, expires_at);

CREATE TABLE IF NOT EXISTS membership_access_keys (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','revoked','expired')),
  expires_at TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES membership_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_keys_account
ON membership_access_keys(account_id, status);

CREATE TABLE IF NOT EXISTS membership_usage_monthly (
  subject_key TEXT NOT NULL,
  period_ym TEXT NOT NULL,
  assistant_requests INTEGER NOT NULL DEFAULT 0 CHECK (assistant_requests >= 0),
  last_request_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_key, period_ym)
);

CREATE TABLE IF NOT EXISTS membership_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  organization_name TEXT,
  request_kind TEXT NOT NULL CHECK (request_kind IN ('trial','subscription')),
  requested_plan TEXT NOT NULL CHECK (requested_plan IN ('trial_pro','start','pro','office')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('trial','monthly','annual')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_membership_requests_status
ON membership_requests(status, created_at);

CREATE TABLE IF NOT EXISTS membership_payments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount_mkd INTEGER NOT NULL CHECK (amount_mkd >= 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer','manual','card_provider')),
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','failed','refunded','cancelled')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES membership_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_account
ON membership_payments(account_id, status, created_at);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('17', 'Membership v1 entitlements, opaque access keys, monthly AI quota and manual-payment ledger');
