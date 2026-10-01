-- AI Advokat 0023: Corpus Safety Foundation (forward-only, additive).
--
-- Staged constraint strategy (no table rebuild):
--   1. audit legacy rows        -> view corpus_legacy_unversioned_articles
--   2. guard NEW inserts        -> triggers below (existing rows are not touched)
--   3. backfill legacy rows     -> later, only after Human Gate (not in this migration)
--   4. final NOT NULL constraint -> later, once the audit view is empty
--
-- Preflight (run read-only on staging/production BEFORE applying; must return 0 rows,
-- otherwise the partial UNIQUE index below fails and the migration is not recorded):
--   SELECT instrument_version_id, article_number_normalized, COUNT(*) AS n
--     FROM legal_article_versions
--    WHERE instrument_version_id IS NOT NULL
--    GROUP BY 1, 2 HAVING COUNT(*) > 1;
--
-- Rollback (if ever needed): DROP the triggers, the index and the two views by name.
-- The added columns are nullable and unused by older Worker code, so they can stay.

-- 1. Version-level metadata ---------------------------------------------------
ALTER TABLE instrument_versions ADD COLUMN version_class TEXT
  CHECK (version_class IS NULL OR version_class IN (
    'original_text',           -- Изворен текст (base act as published)
    'official_consolidated',   -- official consolidated/purified text (LDBIS / Official Gazette)
    'dated_snapshot',          -- consolidated text known to predate later amendments
    'reference_consolidation', -- non-official consolidation used only as a reference
    'amendment_text',          -- Текст измена/дополна
    'other'
  ));
-- Start of application when it differs from entry into force (e.g. ZPP 151/2026).
ALTER TABLE instrument_versions ADD COLUMN application_from TEXT;
ALTER TABLE instrument_versions ADD COLUMN source_issue_number TEXT;
ALTER TABLE instrument_versions ADD COLUMN source_issue_date TEXT;

-- 2. Legacy audit -------------------------------------------------------------
CREATE VIEW IF NOT EXISTS corpus_legacy_unversioned_articles AS
SELECT li.canonical_key, COUNT(*) AS article_count
  FROM legal_article_versions lav
  JOIN legal_instruments li ON li.id = lav.instrument_id
 WHERE lav.instrument_version_id IS NULL
 GROUP BY li.id;

-- 3. Guards for new rows ------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_article_versions_version_required_insert
BEFORE INSERT ON legal_article_versions
WHEN NEW.instrument_version_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'instrument_version_id is required for new article rows (0023 corpus safety)');
END;

CREATE TRIGGER IF NOT EXISTS trg_article_versions_version_not_cleared
BEFORE UPDATE OF instrument_version_id ON legal_article_versions
WHEN NEW.instrument_version_id IS NULL AND OLD.instrument_version_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'instrument_version_id cannot be cleared (0023 corpus safety)');
END;

CREATE TRIGGER IF NOT EXISTS trg_article_versions_version_same_instrument_insert
BEFORE INSERT ON legal_article_versions
WHEN NEW.instrument_version_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM instrument_versions v WHERE v.id = NEW.instrument_version_id AND v.instrument_id = NEW.instrument_id)
BEGIN
  SELECT RAISE(ABORT, 'instrument_version_id belongs to a different instrument (0023 corpus safety)');
END;

CREATE TRIGGER IF NOT EXISTS trg_article_versions_version_same_instrument_update
BEFORE UPDATE OF instrument_version_id, instrument_id ON legal_article_versions
WHEN NEW.instrument_version_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM instrument_versions v WHERE v.id = NEW.instrument_version_id AND v.instrument_id = NEW.instrument_id)
BEGIN
  SELECT RAISE(ABORT, 'instrument_version_id belongs to a different instrument (0023 corpus safety)');
END;

-- current_consolidated is a Human Gate outcome, never an import default.
CREATE TRIGGER IF NOT EXISTS trg_article_versions_current_requires_approval_insert
BEFORE INSERT ON legal_article_versions
WHEN NEW.status = 'current_consolidated' AND NEW.human_review_status <> 'approved'
BEGIN
  SELECT RAISE(ABORT, 'current_consolidated requires human_review_status=approved (0023 corpus safety)');
END;

CREATE TRIGGER IF NOT EXISTS trg_article_versions_current_requires_approval_update
BEFORE UPDATE OF status, human_review_status ON legal_article_versions
WHEN NEW.status = 'current_consolidated' AND NEW.human_review_status <> 'approved'
BEGIN
  SELECT RAISE(ABORT, 'current_consolidated requires human_review_status=approved (0023 corpus safety)');
END;

-- Impossible validity windows on versions.
CREATE TRIGGER IF NOT EXISTS trg_instrument_versions_dates_insert
BEFORE INSERT ON instrument_versions
WHEN (NEW.application_from IS NOT NULL AND NEW.valid_from IS NOT NULL AND NEW.application_from < NEW.valid_from)
  OR (NEW.valid_to IS NOT NULL AND COALESCE(NEW.application_from, NEW.valid_from) IS NOT NULL
      AND NEW.valid_to <= COALESCE(NEW.application_from, NEW.valid_from))
BEGIN
  SELECT RAISE(ABORT, 'impossible validity window on instrument version (0023 corpus safety)');
END;

CREATE TRIGGER IF NOT EXISTS trg_instrument_versions_dates_update
BEFORE UPDATE OF valid_from, valid_to, application_from ON instrument_versions
WHEN (NEW.application_from IS NOT NULL AND NEW.valid_from IS NOT NULL AND NEW.application_from < NEW.valid_from)
  OR (NEW.valid_to IS NOT NULL AND COALESCE(NEW.application_from, NEW.valid_from) IS NOT NULL
      AND NEW.valid_to <= COALESCE(NEW.application_from, NEW.valid_from))
BEGIN
  SELECT RAISE(ABORT, 'impossible validity window on instrument version (0023 corpus safety)');
END;

-- 4. Duplicate protection: one row per article number per version -------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_article_versions_version_article
ON legal_article_versions(instrument_version_id, article_number_normalized)
WHERE instrument_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_article_versions_version
ON legal_article_versions(instrument_version_id);

-- 5. Alias collisions (resolved at runtime as instrument_ambiguous; listed here for audit)
CREATE INDEX IF NOT EXISTS idx_legal_instrument_aliases_alias
ON legal_instrument_aliases(alias);

CREATE VIEW IF NOT EXISTS legal_instrument_alias_collisions AS
SELECT a.alias,
       COUNT(DISTINCT a.instrument_id) AS instrument_count,
       GROUP_CONCAT(DISTINCT li.canonical_key) AS canonical_keys
  FROM legal_instrument_aliases a
  JOIN legal_instruments li ON li.id = a.instrument_id
 GROUP BY a.alias
HAVING COUNT(DISTINCT a.instrument_id) > 1;

-- Explicit, collision-free alias for family law ("ЗС" is ambiguous with the Law on Courts).
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id, alias, language, priority)
SELECT id, 'ЗСем', 'mk', 200 FROM legal_instruments WHERE canonical_key = 'mk:zs';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('23', 'Corpus safety foundation: version metadata, new-row version guard, per-version article uniqueness, alias collision audit');
