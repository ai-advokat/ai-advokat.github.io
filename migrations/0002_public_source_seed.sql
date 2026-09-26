-- AI Advokat public source directory and publication metadata seed v1.3
-- Safe to re-run: sources are inserted only when the same URL is absent;
-- publications rely on the unique DOI constraint from schema v1.0.
-- Public legal-information metadata only. No client data.

PRAGMA foreign_keys = ON;

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'official_gazette',
  'Official Gazette of the Republic of North Macedonia',
  'JP Sluzben vesnik na RSM',
  'MK',
  'https://slvesnik.com.mk/',
  'mk',
  'official',
  'Official gazette source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://slvesnik.com.mk/'
);

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'ministry',
  'LDBIS - legal database',
  'Ministry of Justice',
  'MK',
  'https://ldbis.pravda.gov.mk/Prebaruvanje.aspx',
  'mk',
  'official',
  'Official legal database source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://ldbis.pravda.gov.mk/Prebaruvanje.aspx'
);

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'court',
  'Constitutional Court of the Republic of North Macedonia',
  'Constitutional Court',
  'MK',
  'https://ustavensud.mk/',
  'mk',
  'official',
  'Official constitutional-court source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://ustavensud.mk/'
);

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'court',
  'Supreme Court of the Republic of North Macedonia',
  'Supreme Court',
  'MK',
  'https://www.vrhoven.sud.mk/',
  'mk',
  'official',
  'Official supreme-court source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://www.vrhoven.sud.mk/'
);

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'international_court',
  'European Court of Human Rights - HUDOC',
  'European Court of Human Rights',
  'ECHR',
  'https://hudoc.echr.coe.int/',
  'en',
  'official',
  'Official ECHR case-law database source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://hudoc.echr.coe.int/'
);

INSERT INTO sources (
  source_type, title, issuing_body, jurisdiction, url, language, source_status, notes
)
SELECT
  'international_organization',
  'EUR-Lex',
  'European Union',
  'EU',
  'https://eur-lex.europa.eu/',
  'en',
  'official',
  'Official EU legal-information source directory entry.'
WHERE NOT EXISTS (
  SELECT 1 FROM sources WHERE url = 'https://eur-lex.europa.eu/'
);

INSERT OR IGNORE INTO publications (
  title, author_name, publication_type, publication_date, venue, language, version,
  doi, zenodo_record_id, canonical_url, abstract, keywords, license,
  publication_status, human_review_status
) VALUES (
  'Kocani - Puls: individual criminal, institutional and political responsibility',
  'Zoran Stojankich',
  'research_article',
  '2026',
  'World Protocol Academy',
  'mk',
  '1.0',
  '10.5281/zenodo.22981554',
  '22981554',
  NULL,
  'Draft publication metadata. The Zenodo record is not public until formal publication.',
  'criminal law; institutional accountability; ECHR',
  'CC BY-NC-ND 4.0',
  'draft',
  'pending'
);

INSERT OR IGNORE INTO publications (
  title, author_name, publication_type, publication_date, venue, language, version,
  doi, zenodo_record_id, canonical_url, abstract, keywords, license,
  publication_status, human_review_status
) VALUES (
  'SINDZIR - plea bargaining, admission of guilt and the limits of criminal justice',
  'Zoran Stojankich',
  'working_paper',
  '2026',
  'World Protocol Academy',
  'mk',
  '1.0',
  '10.5281/zenodo.22981744',
  '22981744',
  NULL,
  'Draft publication metadata. The Zenodo record is not public until formal publication.',
  'criminal law; plea bargaining; financial crime; confiscation',
  'CC BY-NC-ND 4.0',
  'draft',
  'pending'
);

CREATE INDEX IF NOT EXISTS idx_sources_title ON sources(title);
CREATE INDEX IF NOT EXISTS idx_instruments_title ON legal_instruments(title);
CREATE INDEX IF NOT EXISTS idx_case_law_title_number ON case_law(case_title, case_number);
CREATE INDEX IF NOT EXISTS idx_publications_title_doi ON publications(title, doi);

INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES ('0002', 'Public source directory, publication draft metadata and search-support indexes');
