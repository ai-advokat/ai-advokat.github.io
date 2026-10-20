-- 0049: Case-law source-binding and text-extraction audit provenance.
-- Stores only bounded audit metadata. Original public documents remain governed by source/reuse policy.

ALTER TABLE case_law_provenance ADD COLUMN remote_content_hash_verified INTEGER NOT NULL DEFAULT 0
  CHECK (remote_content_hash_verified IN (0,1));
ALTER TABLE case_law_provenance ADD COLUMN binding_verification_method TEXT;
ALTER TABLE case_law_provenance ADD COLUMN binding_reviewed_by TEXT;
ALTER TABLE case_law_provenance ADD COLUMN binding_reviewed_at TEXT;
ALTER TABLE case_law_provenance ADD COLUMN extraction_method TEXT;
ALTER TABLE case_law_provenance ADD COLUMN extracted_text_sha256 TEXT;

CREATE INDEX IF NOT EXISTS idx_case_provenance_binding_audit
ON case_law_provenance(case_law_id,official_binding_verified,remote_content_hash_verified,human_review_status);

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('49','Case-law source-binding and extracted-text fingerprint audit provenance');
