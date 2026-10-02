-- AI Advokat legacy corpus version-backfill READ-ONLY preflight
-- Date: 2026-10-02
-- This file contains SELECT statements only. It must not mutate D1.

-- A. Legacy article groups and exact counts.
SELECT li.canonical_key,
       COUNT(*) AS article_count,
       SUM(CASE WHEN lav.instrument_version_id IS NULL THEN 1 ELSE 0 END) AS legacy_null_version_count,
       COUNT(DISTINCT lav.instrument_version_id) AS distinct_bound_versions
  FROM legal_article_versions lav
  JOIN legal_instruments li ON li.id = lav.instrument_id
 WHERE li.canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 GROUP BY li.canonical_key
 ORDER BY li.canonical_key;

-- Expected before backfill:
-- mk:zi  = 258 total / 258 NULL version
-- mk:zro = 298 total / 298 NULL version
-- mk:zkp = 570 total / 570 NULL version
-- STOP on any mismatch.

-- B. Candidate instrument versions.
SELECT li.canonical_key,
       v.id AS instrument_version_id,
       v.version_label,
       v.version_class,
       v.valid_from,
       v.application_from,
       v.valid_to,
       v.is_current,
       v.human_review_status,
       v.checksum_sha256,
       v.source_issue_number,
       v.source_issue_date
  FROM instrument_versions v
  JOIN legal_instruments li ON li.id = v.instrument_id
 WHERE li.canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 ORDER BY li.canonical_key, v.id;

-- C. Duplicate article-number guard.
SELECT li.canonical_key,
       lav.article_number_normalized,
       COUNT(*) AS n
  FROM legal_article_versions lav
  JOIN legal_instruments li ON li.id = lav.instrument_id
 WHERE li.canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 GROUP BY li.canonical_key, lav.article_number_normalized
HAVING COUNT(*) > 1
 ORDER BY li.canonical_key, lav.article_number_normalized;

-- Expected: zero rows.

-- D. Source/provenance distribution on the actual article rows.
SELECT li.canonical_key,
       lav.source_url,
       lav.source_sha256,
       COUNT(*) AS n
  FROM legal_article_versions lav
  JOIN legal_instruments li ON li.id = lav.instrument_id
 WHERE li.canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 GROUP BY li.canonical_key, lav.source_url, lav.source_sha256
 ORDER BY li.canonical_key, n DESC;

-- Each instrument should reconcile to the source snapshot expected by its import history.
-- Multiple unexpected hashes or URLs require STOP and manual investigation.

-- E. Status distribution: backfill must not silently promote legal status.
SELECT li.canonical_key,
       lav.status,
       lav.human_review_status,
       COUNT(*) AS n
  FROM legal_article_versions lav
  JOIN legal_instruments li ON li.id = lav.instrument_id
 WHERE li.canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 GROUP BY li.canonical_key, lav.status, lav.human_review_status
 ORDER BY li.canonical_key, lav.status, lav.human_review_status;

-- F. ZI structural invariants.
SELECT
  COUNT(*) AS zi_count,
  MIN(CAST(article_number_normalized AS INTEGER)) AS min_numeric,
  MAX(CAST(article_number_normalized AS INTEGER)) AS max_numeric,
  SUM(CASE WHEN article_number_normalized IN ('240','241','242','243','244') THEN 1 ELSE 0 END) AS abolished_240_244
FROM legal_article_versions
WHERE instrument_id=(SELECT id FROM legal_instruments WHERE canonical_key='mk:zi');

-- Expected: zi_count=258, min_numeric=1, max_numeric=269, abolished_240_244=0.

-- G. Corpus audit view created by migration 0023.
SELECT *
  FROM corpus_legacy_unversioned_articles
 WHERE canonical_key IN ('mk:zi','mk:zro','mk:zkp')
 ORDER BY canonical_key;
