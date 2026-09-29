-- Extend Paragraf migration landing zone with explicit knowledge-corpus eligibility.
-- Separate migration because v4 has already been applied to staging.

ALTER TABLE legacy_documents
  ADD COLUMN knowledge_eligible INTEGER NOT NULL DEFAULT 0
  CHECK (knowledge_eligible IN (0,1));

ALTER TABLE legacy_documents
  ADD COLUMN corpus_role TEXT NOT NULL DEFAULT 'reference'
  CHECK (corpus_role IN (
    'primary_law',
    'case_law',
    'publication',
    'commentary',
    'template',
    'reference',
    'commercial',
    'account',
    'private_case'
  ));

CREATE INDEX IF NOT EXISTS idx_legacy_documents_knowledge
  ON legacy_documents(knowledge_eligible, corpus_role);

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('5', 'Add knowledge eligibility and corpus-role gates for Paragraf migration');
