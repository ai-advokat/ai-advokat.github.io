-- AI Advokat 0025: ZRO legacy corpus -> exact historical snapshot version binding.
--
-- Binds the existing 298-row Labour Relations Act corpus to the exact
-- 111/2023 ministry-hosted snapshot used during the original production import.
--
-- This migration does NOT claim current 2026 law. The snapshot remains
-- version_class=dated_snapshot, is_current=0, human_review_status=pending.
--
-- Governed source:
--   https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf
--   SHA-256 f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655
--   298 article rows
--   issue lineage through 111/2023
--   source issue date 2023-05-30

CREATE TABLE _guard_0025_zro_backfill (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

INSERT INTO _guard_0025_zro_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM legal_instruments WHERE canonical_key='mk:zro') <= 1
  AND (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')) = 0
    OR
    (
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')) = 298
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND instrument_version_id IS NULL) = 298
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND version_label='official-consolidated-snapshot-through-111/2023') = 1
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND version_label='official-consolidated-snapshot-through-111/2023'
          AND is_current=0
          AND human_review_status='pending'
          AND (checksum_sha256 IS NULL OR checksum_sha256='f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655')
          AND (version_class IS NULL OR version_class='dated_snapshot')) = 1
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND source_url='https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf'
          AND source_sha256='f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655'
          AND source_issue_number='through-111/2023'
          AND source_issue_date='2023-05-30'
          AND status='historical'
          AND human_review_status='pending') = 298
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND article_number_normalized='1') = 1
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND article_number_normalized='25-а') = 1
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
          AND article_number_normalized='298') = 1
      AND NOT EXISTS (
        SELECT 1
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
         GROUP BY article_number_normalized
        HAVING COUNT(*) > 1
      )
    )
  )
THEN 1 ELSE 0 END;

UPDATE instrument_versions
   SET version_class='dated_snapshot',
       checksum_sha256='f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655',
       source_issue_number='through-111/2023',
       source_issue_date='2023-05-30',
       is_current=0,
       human_review_status='pending'
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
   AND version_label='official-consolidated-snapshot-through-111/2023'
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
           AND instrument_version_id IS NULL)=298;

UPDATE legal_article_versions
   SET instrument_version_id=(
     SELECT id
       FROM instrument_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND version_label='official-consolidated-snapshot-through-111/2023'
   )
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
   AND instrument_version_id IS NULL
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro'))=298;

DELETE FROM _guard_0025_zro_backfill;

INSERT INTO _guard_0025_zro_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*)
     FROM legal_article_versions
    WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')) = 0
  OR
  (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')) = 298
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND instrument_version_id IS NULL) = 0
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND instrument_version_id=(
          SELECT id FROM instrument_versions
           WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
             AND version_label='official-consolidated-snapshot-through-111/2023'
        )) = 298
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND status='historical'
        AND human_review_status='pending') = 298
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zro')
        AND status='current_consolidated') = 0
  )
THEN 1 ELSE 0 END;

DROP TABLE _guard_0025_zro_backfill;

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('25', 'Bind governed 298-row ZRO 111/2023 legacy corpus to dated snapshot version; no current-law promotion');
