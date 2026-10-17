-- 0046: Membership access-key hardening.
-- New keys use HMAC-SHA256 with a server-side pepper instead of unsalted SHA-256.
-- Existing hashes remain explicitly marked legacy and may be accepted only behind
-- the short-lived MEMBERSHIP_LEGACY_SHA256_ENABLED compatibility flag.

ALTER TABLE membership_access_keys
  ADD COLUMN key_hash_scheme TEXT NOT NULL DEFAULT 'sha256_legacy'
  CHECK (key_hash_scheme IN ('sha256_legacy','hmac_sha256_v2'));

ALTER TABLE membership_access_keys
  ADD COLUMN key_fingerprint TEXT;

ALTER TABLE membership_access_keys
  ADD COLUMN rotated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_membership_keys_hash_scheme
ON membership_access_keys(key_hash_scheme,status,expires_at);

UPDATE membership_access_keys
SET key_fingerprint=COALESCE(key_fingerprint,'legacy:'||substr(key_hash,1,12))
WHERE key_fingerprint IS NULL;

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('46','Membership access-key HMAC pepper, fingerprint and rotation metadata');
