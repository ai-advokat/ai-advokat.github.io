-- 0034: Close nullable issue_key uniqueness gap for active CasePilot authority classifications.
-- SQLite UNIQUE indexes treat NULL values as distinct, so the 0032 index can allow
-- multiple active rows for the same case/case-law pair when issue_key is NULL.
-- Normalize the uniqueness key through COALESCE(issue_key,'') and supersede any
-- pre-existing duplicates deterministically before creating the expression index.

UPDATE casepilot_authority_classifications AS current
   SET status='superseded',
       updated_at=CURRENT_TIMESTAMP
 WHERE current.status='active'
   AND EXISTS (
     SELECT 1
       FROM casepilot_authority_classifications newer
      WHERE newer.case_id=current.case_id
        AND newer.case_law_id=current.case_law_id
        AND COALESCE(newer.issue_key,'')=COALESCE(current.issue_key,'')
        AND newer.status='active'
        AND (
          COALESCE(newer.updated_at,'') > COALESCE(current.updated_at,'')
          OR (
            COALESCE(newer.updated_at,'') = COALESCE(current.updated_at,'')
            AND newer.id > current.id
          )
        )
   );

DROP INDEX IF EXISTS idx_casepilot_authority_active_unique;

CREATE UNIQUE INDEX idx_casepilot_authority_active_unique_v2
ON casepilot_authority_classifications(
  case_id,
  case_law_id,
  COALESCE(issue_key,'')
)
WHERE status='active';

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('34','CasePilot active authority classification uniqueness normalizes nullable issue_key');
