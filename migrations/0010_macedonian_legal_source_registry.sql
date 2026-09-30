-- Macedonian legal source policy registry.
-- Safe metadata/policy layer: no private data, no paywall bypass, no bulk secondary-platform copying.

CREATE TABLE IF NOT EXISTS source_ingest_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url TEXT NOT NULL UNIQUE,
  authority_level TEXT NOT NULL CHECK (authority_level IN ('primary_official','official_supporting','court_official','proposal_registry','public_information','secondary_reference')),
  ingest_mode TEXT NOT NULL CHECK (ingest_mode IN ('public_fulltext','public_metadata','public_index_only','link_only','no_crawl')),
  automated_access INTEGER NOT NULL DEFAULT 0 CHECK (automated_access IN (0,1)),
  article_chunking INTEGER NOT NULL DEFAULT 0 CHECK (article_chunking IN (0,1)),
  current_text_priority INTEGER NOT NULL DEFAULT 0 CHECK (current_text_priority IN (0,1)),
  terms_checked_on TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_source_ingest_authority
ON source_ingest_policies(authority_level, ingest_mode);

INSERT OR IGNORE INTO sources
  (title, url, source_type, issuing_body, jurisdiction, source_status, notes)
VALUES
  ('Official Gazette chronological registers', 'https://slvesnik.com.mk/Issues/634836914B1C2C48A528E23A94A0CD4B.pdf/hronoloshki-registri.nspx', 'official_gazette_index', 'Official Gazette of the Republic of North Macedonia', 'MK', 'official', 'Public chronological registers. Use to discover official acts by year; never bypass subscriber-only services.'),
  ('ENER - Единствен национален електронски регистар на прописи', 'https://ener.gov.mk/', 'proposal_registry', 'Government of the Republic of North Macedonia', 'MK', 'official', 'Public registry for regulations, draft laws, comments and consolidated-text resources.'),
  ('Ministry of Justice - Regulativa', 'https://www.pravda.gov.mk/mk-MK/regulativa', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official regulatory resources.'),
  ('Constitutional Court - decisions and rulings', 'https://ustavensud.mk/mk/%D0%BE%D0%B4%D0%BB%D1%83%D0%BA%D0%B8-%D0%B8-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%98%D0%B0/', 'court_database', 'Constitutional Court of the Republic of North Macedonia', 'MK', 'official', 'Official constitutional-court decisions and rulings.'),
  ('Free Legal Aid portal', 'https://pravnapomos.mk/', 'public_legal_information', 'North Macedonia legal-aid programme', 'MK', 'verified', 'Public legal-aid information and regulatory resources; supporting information, not primary authority.'),
  ('deJure.mk', 'https://dejure.mk/', 'secondary_legal_platform', 'deJure.mk', 'MK', 'verified', 'Secondary reference only. Do not bulk-copy proprietary presentation or database content.'),
  ('Factum.mk', 'https://factum.mk/', 'secondary_legal_platform', 'FACTUM DOO Skopje', 'MK', 'verified', 'Secondary reference only. Do not ingest proprietary consolidated corpus; verify propositions against primary official sources.'),
  ('SamoDaPrasham.mk', 'https://samodaprasham.mk/', 'secondary_legal_information', 'NEKSA AMD DOOEL Skopje', 'MK', 'verified', 'Link-only secondary source. Terms prohibit automated scraping without approval.');

INSERT OR REPLACE INTO source_ingest_policies
  (source_url, authority_level, ingest_mode, automated_access, article_chunking, current_text_priority, terms_checked_on, notes)
VALUES
  ('https://slvesnik.com.mk/', 'primary_official', 'public_index_only', 1, 1, 1, '2026-09-29', 'Public/free Gazette material only. Public PDFs may be processed when directly accessible; no subscription/paywall bypass.'),
  ('https://slvesnik.com.mk/Issues/634836914B1C2C48A528E23A94A0CD4B.pdf/hronoloshki-registri.nspx', 'primary_official', 'public_index_only', 1, 0, 1, '2026-09-29', 'Chronological register discovery layer; titles of laws, bylaws and other acts by year.'),
  ('https://ldbis.pravda.gov.mk/Prebaruvanje.aspx', 'primary_official', 'public_metadata', 1, 1, 1, '2026-09-29', 'Official metadata and public legal text pages. Prefer active/consolidated versions with Gazette provenance.'),
  ('https://ldbis.pravda.gov.mk/Revidirani.aspx', 'primary_official', 'public_metadata', 1, 1, 1, '2026-09-29', 'Official consolidated-version directory; strongest public signal for purified/consolidated text.'),
  ('https://ener.gov.mk/', 'proposal_registry', 'public_metadata', 1, 0, 0, '2026-09-29', 'Draft/proposal and consultation source. Never confuse draft proposals with law in force.'),
  ('https://www.pravda.gov.mk/mk-MK/regulativa', 'official_supporting', 'public_metadata', 1, 1, 1, '2026-09-29', 'Official Ministry of Justice regulatory resources.'),
  ('https://ustavensud.mk/', 'court_official', 'public_metadata', 1, 0, 1, '2026-09-29', 'Official Constitutional Court source; decisions may affect validity/version chains.'),
  ('https://www.vrhoven.sud.mk/', 'court_official', 'public_metadata', 1, 0, 0, '2026-09-29', 'Official Supreme Court source.'),
  ('https://pravnapomos.mk/', 'public_information', 'public_metadata', 1, 0, 0, '2026-09-29', 'Supporting legal-aid information; do not rank above legislation/case-law primary sources.'),
  ('https://dejure.mk/', 'secondary_reference', 'link_only', 0, 0, 0, '2026-09-29', 'Reference/discovery only; no automated corpus copying.'),
  ('https://factum.mk/', 'secondary_reference', 'link_only', 0, 0, 0, '2026-09-29', 'Reference/discovery only; no automated corpus copying.'),
  ('https://samodaprasham.mk/', 'secondary_reference', 'no_crawl', 0, 0, 0, '2026-09-29', 'Terms prohibit automated access/scraping without approval. Link-only.');

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('10', 'Macedonian legal source policy registry and safe ingestion boundaries');
