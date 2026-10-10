-- 0031: Case-law identifiers and provenance lineage.
-- Official case-law stays authoritative; commercial/secondary discovery never self-promotes.
-- No credentials, sessions, paywall bypass or restricted bulk copying.

CREATE TABLE IF NOT EXISTS case_law_external_ids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL,
  id_scheme TEXT NOT NULL
    CHECK (id_scheme IN (
      'ecli','celex','echr_application_number','hudoc_item_id',
      'domestic_case_number','constitutional_reference','paragraf_legacy_id','other'
    )),
  id_value TEXT NOT NULL,
  source_url TEXT,
  is_primary_identifier INTEGER NOT NULL DEFAULT 0 CHECK (is_primary_identifier IN (0,1)),
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE,
  UNIQUE (id_scheme,id_value)
);

CREATE TABLE IF NOT EXISTS case_law_provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_law_id INTEGER NOT NULL,
  source_class TEXT NOT NULL
    CHECK (source_class IN ('official_primary','official_mirror','licensed_secondary','public_secondary')),
  source_provider TEXT NOT NULL,
  source_product TEXT,
  source_url TEXT NOT NULL,
  source_sha256 TEXT,
  source_record_id TEXT,
  discovery_only INTEGER NOT NULL DEFAULT 1 CHECK (discovery_only IN (0,1)),
  official_binding_verified INTEGER NOT NULL DEFAULT 0 CHECK (official_binding_verified IN (0,1)),
  license_or_access_basis TEXT,
  imported_batch_key TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (human_review_status IN ('pending','reviewed','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_law_id) REFERENCES case_law(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_case_external_id_case
ON case_law_external_ids(case_law_id,id_scheme);

CREATE INDEX IF NOT EXISTS idx_case_provenance_case
ON case_law_provenance(case_law_id,source_class,official_binding_verified,human_review_status);

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
('EUR-Lex EU case-law','https://eur-lex.europa.eu/collection/eu-law/eu-case-law.html','court_database','Publications Office of the European Union','EU','official','Official EU case-law access with ECLI/CELEX metadata. Use CURIA/EUR-Lex as official sources and preserve ECLI/CELEX identifiers.'),
('Ministry of Justice court directory','https://www.pravda.gov.mk/mk-MK/resursi/sudovi','court_directory','Ministry of Justice','MK','official','Official directory for court identity and portal discovery. Decision authority remains the originating court source.');

INSERT OR REPLACE INTO source_ingest_policies
(source_url,authority_level,ingest_mode,automated_access,article_chunking,current_text_priority,terms_checked_on,notes)
VALUES
('https://eur-lex.europa.eu/collection/eu-law/eu-case-law.html','court_official','public_metadata',1,0,0,'2026-10-10','Official EU case-law source. Preserve ECLI, CELEX, court, chamber, case number, date, language and canonical URL.'),
('https://www.pravda.gov.mk/mk-MK/resursi/sudovi','official_supporting','public_metadata',1,0,0,'2026-10-10','Court directory/discovery only. Do not treat directory metadata as the decision text.');

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('31','Case-law external identifiers, official binding and licensed secondary provenance');
