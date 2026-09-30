-- Stable legal-instrument identity across staging and production.
-- Canonical article IDs must never depend on environment-specific AUTOINCREMENT ids.

ALTER TABLE legal_instruments ADD COLUMN canonical_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_instruments_canonical_key
ON legal_instruments(canonical_key)
WHERE canonical_key IS NOT NULL;

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES (
  'Ministry of Economy and Labour - ZRO consolidated snapshot through 111/2023',
  'https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf',
  'official_consolidated_snapshot',
  'Ministry of Economy and Labour',
  'MK',
  'official',
  'Official government-hosted 108-page consolidated Labour Relations Act snapshot through Official Gazette 111/2023. Historical snapshot; not current 2026 text.'
);

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT
  'mk:zro',
  'Закон за работните односи',
  'ЗРО',
  'law',
  'MK',
  '62/2005; consolidated through 111/2023',
  '2005-08-05',
  'pending',
  'pending',
  (SELECT id FROM sources WHERE url='https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf'),
  'Phase-1 instrument. Instrument-level status remains pending while article-level rows carry needs_version_review where affected. Historical snapshot is parseable; 2025 amendments and Constitutional Court effects must be resolved before current status.'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zro'
);

UPDATE legal_instruments
SET canonical_key='mk:zro'
WHERE title='Закон за работните односи'
  AND canonical_key IS NULL
  AND id=(SELECT MIN(id) FROM legal_instruments WHERE title='Закон за работните односи');

-- Keep this insert compatible with both the legacy production instrument_versions
-- schema (which uses source_id) and the newer clean schema (which uses source_url).
-- Provenance remains available through legal_instruments.canonical_source_id and
-- article-level source_url/source_sha256 fields.
INSERT OR IGNORE INTO instrument_versions
(instrument_id,version_label,valid_from,valid_to,is_current,checksum_sha256,text_content,human_review_status)
SELECT
  id,
  'official-consolidated-snapshot-through-111/2023',
  NULL,
  NULL,
  0,
  'f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655',
  NULL,
  'pending'
FROM legal_instruments
WHERE canonical_key='mk:zro';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('14', 'Stable legal-instrument canonical keys and ZRO historical snapshot metadata');
