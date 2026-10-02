-- AI Advokat 0024: ZI legacy corpus -> exact version binding.
--
-- PURPOSE
--   Bind the already-imported 258-row Execution Act corpus to the exact
--   instrument_versions row that represents the source snapshot used during
--   the original production activation.
--
-- SAFETY
--   * no legal text is inserted, deleted or rewritten;
--   * no status is promoted to current_consolidated;
--   * the migration is a no-op on fresh databases with no ZI article rows;
--   * if ZI rows exist, every expected invariant must match or the migration
--     aborts before schema_migrations records version 24.
--
-- Exact source snapshot from the governed production workflow:
--   URL: https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf
--   SHA-256: 15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55
--   article rows: 258
--   terminal article: 269
--   240-244 absent
--
-- The snapshot is deliberately classified as dated_snapshot and remains
-- Human-Gate pending. Binding provenance is NOT a claim of current 2026 law.

CREATE TABLE _guard_0024_zi_backfill (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

-- PRECONDITION.
-- Fresh DB: zero ZI articles -> pass/no-op.
-- Legacy DB: exactly the governed 258-row snapshot + exactly one target version.
INSERT INTO _guard_0024_zi_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM legal_instruments WHERE canonical_key='mk:zi') <= 1
  AND (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')) = 0
    OR
    (
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')) = 258
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND instrument_version_id IS NULL) = 258
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND version_label='official-editorial-consolidated-through-154/2023') = 1
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND version_label='official-editorial-consolidated-through-154/2023'
          AND is_current=0
          AND human_review_status='pending'
          AND (checksum_sha256 IS NULL OR checksum_sha256='15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55')
          AND (version_class IS NULL OR version_class='dated_snapshot')) = 1
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND source_url='https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf'
          AND source_sha256='15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55') = 258
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND article_number_normalized='1') = 1
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND article_number_normalized='269') = 1
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
          AND article_number_normalized IN ('240','241','242','243','244')) = 0
      AND NOT EXISTS (
        SELECT 1
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
         GROUP BY article_number_normalized
        HAVING COUNT(*) > 1
      )
    )
  )
THEN 1 ELSE 0 END;

-- Normalize only VERSION metadata that is already proven by the exact snapshot.
UPDATE instrument_versions
   SET version_class='dated_snapshot',
       checksum_sha256='15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55',
       source_issue_number='72/2016; 142/2016; 178/2017; 26/2018; 233/2018; 14/2020; 136/2020; 154/2023',
       source_issue_date='2023-07-20',
       is_current=0,
       human_review_status='pending'
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
   AND version_label='official-editorial-consolidated-through-154/2023'
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
           AND instrument_version_id IS NULL)=258;

-- The only article-row mutation: bind the legacy rows to the proven version.
UPDATE legal_article_versions
   SET instrument_version_id=(
     SELECT id
       FROM instrument_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
        AND version_label='official-editorial-consolidated-through-154/2023'
   )
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
   AND instrument_version_id IS NULL
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi'))=258;

DELETE FROM _guard_0024_zi_backfill;

-- POSTCONDITION.
-- Either fresh/no corpus, or all 258 rows are bound to exactly the target version.
INSERT INTO _guard_0024_zi_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*)
     FROM legal_article_versions
    WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')) = 0
  OR
  (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')) = 258
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
        AND instrument_version_id IS NULL) = 0
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
        AND instrument_version_id=(
          SELECT id FROM instrument_versions
           WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
             AND version_label='official-editorial-consolidated-through-154/2023'
        )) = 258
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi')
        AND status='current_consolidated') = 0
  )
THEN 1 ELSE 0 END;

DROP TABLE _guard_0024_zi_backfill;

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('24', 'Bind governed 258-row ZI legacy corpus to dated snapshot version; no legal-status promotion');
