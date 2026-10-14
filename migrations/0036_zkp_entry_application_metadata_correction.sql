-- AI Advokat 0036: ZKP entry/application metadata correction.
--
-- Official-source classification:
-- * OG 51/2011 item 1381 amends the predecessor ZKP 15/1997 chain.
-- * OG 100/2012 item 2624 amends the new ZKP 150/2010 and moves full
--   application to 2013-12-01.
-- * The new ZKP 150/2010 entered into force on 2010-11-26.
--
-- This migration corrects metadata only. It does not modify article text,
-- current-law status, Human Gate status or is_current.

CREATE TABLE _guard_0036_zkp_metadata (
  ok INTEGER NOT NULL CHECK (ok=1)
);

INSERT INTO _guard_0036_zkp_metadata(ok)
SELECT CASE WHEN
  (SELECT COUNT(*) FROM legal_instruments WHERE canonical_key='mk:zkp')=1
  AND (SELECT current_status FROM legal_instruments WHERE canonical_key='mk:zkp')='pending'
  AND (SELECT human_review_status FROM legal_instruments WHERE canonical_key='mk:zkp')='pending'
  AND (SELECT effective_date FROM legal_instruments WHERE canonical_key='mk:zkp') IN ('2012-11-26','2010-11-26')
  AND (SELECT COUNT(*) FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
          AND is_current=0
          AND human_review_status='pending')=1
THEN 1 ELSE 0 END;

UPDATE legal_instruments
   SET effective_date='2010-11-26',
       notes=CASE
         WHEN instr(COALESCE(notes,''),'Full application from 2013-12-01')>0 THEN notes
         ELSE trim(COALESCE(notes,'') || ' Entry into force: 2010-11-26. Full application from 2013-12-01 after OG 100/2012 Article 2 amended Article 568. OG 51/2011 is a predecessor-law transitional amendment, not a direct amendment of 150/2010.')
       END
 WHERE canonical_key='mk:zkp';

UPDATE instrument_versions
   SET valid_from='2018-10-31'
 WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
   AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
   AND (valid_from IS NULL OR valid_from='2018-10-31')
   AND is_current=0
   AND human_review_status='pending';

DELETE FROM _guard_0036_zkp_metadata;

INSERT INTO _guard_0036_zkp_metadata(ok)
SELECT CASE WHEN
  (SELECT effective_date FROM legal_instruments WHERE canonical_key='mk:zkp')='2010-11-26'
  AND (SELECT current_status FROM legal_instruments WHERE canonical_key='mk:zkp')='pending'
  AND (SELECT human_review_status FROM legal_instruments WHERE canonical_key='mk:zkp')='pending'
  AND (SELECT COUNT(*) FROM instrument_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND version_label='consolidated-reference-through-198/2018-and-CC-193/2016'
          AND valid_from='2018-10-31'
          AND is_current=0
          AND human_review_status='pending')=1
  AND (SELECT COUNT(*) FROM legal_article_versions
        WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zkp')
          AND status='current_consolidated')=0
THEN 1 ELSE 0 END;

DROP TABLE _guard_0036_zkp_metadata;

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('36','Correct ZKP entry/application metadata and 2018 reference version valid_from; no current-law promotion');
