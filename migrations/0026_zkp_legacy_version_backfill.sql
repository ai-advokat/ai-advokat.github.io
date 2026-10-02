-- AI Advokat 0026: ZKP legacy corpus -> exact reference-consolidation version binding.
--
-- Binds the existing 570-row Criminal Procedure Act corpus to the exact
-- secondary consolidated reference snapshot used during production activation.
--
-- IMPORTANT: this is NOT a current-law promotion.
-- The article-level source is a secondary/reference consolidation through
-- Official Gazette 198/2018 + Constitutional Court decision 193/2016.
-- Official LDBIS/Gazette lineage remains controlling.
--
-- Governed source:
--   https://glasprotivnasilstvo.org.mk/wp-content/uploads/2020/10/ZAKON-ZA-KRIVICHNATA-POSTAPKA.pdf
--   SHA-256 e6bf4588833752695a9b776b473ed9d504264effdfcd7917b8d6655bcfacaf45
--   195 pages
--   570 article records
--   terminal article 568
--   lettered article 567-а
--   issue lineage: 150/2010; 100/2012; 142/2016; 193/2016; 198/2018
--   source issue date: 2018-10-31
--
-- The backfill may bind instrument_version_id only. It must not rewrite legal
-- text/provenance or promote status/Human Gate/currentness.

CREATE TABLE _guard_0026_zkp_backfill (
  ok INTEGER NOT NULL CHECK (ok = 1)
);

INSERT INTO _guard_0026_zkp_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM legal_instruments WHERE canonical_key='mk:zkp') <= 1
  AND (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')) = 0
    OR
    (
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')) = 570
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND instrument_version_id IS NULL) = 570
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016') = 1
      AND
      (SELECT COUNT(*)
         FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
          AND is_current=0
          AND human_review_status='pending'
          AND (checksum_sha256 IS NULL OR checksum_sha256='e6bf4588833752695a9b776b473ed9d504264effdfcd7917b8d6655bcfacaf45')
          AND (version_class IS NULL OR version_class='reference_consolidation')) = 1
      AND
      (SELECT COUNT(*)
         FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND source_url='https://glasprotivnasilstvo.org.mk/wp-content/uploads/2020/10/ZAKON-ZA-KRIVICHNATA-POSTAPKA.pdf'
          AND source_sha256='e6bf4588833752695a9b776b473ed9d504264effdfcd7917b8d6655bcfacaf45'
          AND source_issue_number='150/2010; 100/2012; 142/2016; 193/2016; 198/2018'
          AND source_issue_date='2018-10-31'
          AND status='needs_version_review'
          AND human_review_status='pending') = 570
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND article_number_normalized='1') = 1
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND article_number_normalized='568') = 1
      AND
      (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND article_number_normalized IN ('567-а','567-a')) = 1
      AND NOT EXISTS (
        SELECT 1
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
         GROUP BY article_number_normalized
        HAVING COUNT(*) > 1
      )
    )
  )
THEN 1 ELSE 0 END;

UPDATE instrument_versions
   SET version_class='reference_consolidation',
       checksum_sha256='e6bf4588833752695a9b776b473ed9d504264effdfcd7917b8d6655bcfacaf45',
       source_issue_number='150/2010; 100/2012; 142/2016; 193/2016; 198/2018',
       source_issue_date='2018-10-31',
       is_current=0,
       human_review_status='pending'
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
   AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
           AND instrument_version_id IS NULL)=570;

UPDATE legal_article_versions
   SET instrument_version_id=(
     SELECT id
       FROM instrument_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
   )
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
   AND instrument_version_id IS NULL
   AND (SELECT COUNT(*)
          FROM legal_article_versions
         WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp'))=570;

DELETE FROM _guard_0026_zkp_backfill;

INSERT INTO _guard_0026_zkp_backfill(ok)
SELECT CASE WHEN
  (SELECT COUNT(*)
     FROM legal_article_versions
    WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')) = 0
  OR
  (
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')) = 570
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND instrument_version_id IS NULL) = 0
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND instrument_version_id=(
          SELECT id FROM instrument_versions
           WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
             AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
        )) = 570
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND status='needs_version_review'
        AND human_review_status='pending') = 570
    AND
    (SELECT COUNT(*)
       FROM legal_article_versions
      WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
        AND status='current_consolidated') = 0
  )
THEN 1 ELSE 0 END;

DROP TABLE _guard_0026_zkp_backfill;

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('26', 'Bind governed 570-row ZKP 2018 reference consolidation to exact version; no current-law promotion');
