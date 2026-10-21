-- Explicit opt-in migration. NOT part of automatic corpus migrations.
-- Apply only to an approved, private ALARM_DB binding.
CREATE TABLE alarm_subscriptions (
 id TEXT PRIMARY KEY, address_key TEXT NOT NULL UNIQUE, address_cipher TEXT,
 state TEXT NOT NULL CHECK(state IN ('pending','active','unsubscribed','suppressed')),
 topics TEXT NOT NULL, consent_version TEXT NOT NULL, consent_at INTEGER NOT NULL,
 confirmed_at INTEGER, confirm_hash TEXT UNIQUE, confirm_expires INTEGER,
 manage_hash TEXT NOT NULL UNIQUE, manage_cipher TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE alarm_records (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, source_url TEXT NOT NULL UNIQUE,
 published_at INTEGER NOT NULL, verified_at INTEGER NOT NULL, reviewer TEXT NOT NULL,
 evidence TEXT NOT NULL, topics TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('verified','withdrawn'))
);
CREATE TABLE alarm_deliveries (
 subscription_id TEXT NOT NULL REFERENCES alarm_subscriptions(id),
 record_id TEXT NOT NULL REFERENCES alarm_records(id),
 state TEXT NOT NULL CHECK(state IN ('claimed','sent','uncertain')),
 claimed_at INTEGER NOT NULL, provider_id TEXT,
 PRIMARY KEY(subscription_id,record_id)
);
CREATE TABLE alarm_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
