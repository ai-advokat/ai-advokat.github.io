-- Rich provenance for amendment events.
-- Keeps amendment-act article identity separate from target base-law article identity.

ALTER TABLE legal_amendment_events ADD COLUMN event_key TEXT;
ALTER TABLE legal_amendment_events ADD COLUMN amendment_title TEXT;
ALTER TABLE legal_amendment_events ADD COLUMN amendment_article_number TEXT;
ALTER TABLE legal_amendment_events ADD COLUMN inserted_article_numbers_json TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_amendment_events_event_key
ON legal_amendment_events(event_key)
WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_amendment_events_source_issue
ON legal_amendment_events(source_issue_number, source_issue_date);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('15', 'Add amendment-event provenance keys, amendment article and inserted-article metadata');
