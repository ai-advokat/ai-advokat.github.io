INSERT OR IGNORE INTO sources
  (title, url, source_type, issuing_body, jurisdiction, source_status, notes)
VALUES
  ('Official Gazette of the Republic of North Macedonia', 'https://slvesnik.com.mk/', 'official_gazette', 'Official Gazette of the Republic of North Macedonia', 'MK', 'official', 'Primary official publication source. Verify the current consolidated text and effective date before reliance.'),
  ('Ministry of Justice LDBIS legal database', 'https://ldbis.pravda.gov.mk/Prebaruvanje.aspx', 'ministry_database', 'Ministry of Justice', 'MK', 'official', 'Official legal database directory. Verify the current instrument text and amendment history.'),
  ('Constitutional Court of the Republic of North Macedonia', 'https://ustavensud.mk/', 'court', 'Constitutional Court of the Republic of North Macedonia', 'MK', 'official', 'Official court source.'),
  ('Supreme Court of the Republic of North Macedonia', 'https://www.vrhoven.sud.mk/', 'court', 'Supreme Court of the Republic of North Macedonia', 'MK', 'official', 'Official court source.'),
  ('European Court of Human Rights - HUDOC', 'https://hudoc.echr.coe.int/', 'international_court', 'European Court of Human Rights', 'ECHR', 'official', 'Official ECHR case-law database.'),
  ('EUR-Lex', 'https://eur-lex.europa.eu/', 'international_organization', 'European Union', 'EU', 'official', 'Official access point for European Union law.');

INSERT OR IGNORE INTO publications
  (title, author_name, publication_type, publication_status, doi, canonical_url, abstract, keywords, human_review_status)
VALUES
  ('Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност', 'Zoran Stojankich', 'journal_article', 'draft', '10.5281/zenodo.22981554', NULL, 'Unpublished draft record. The reserved DOI is metadata only until formal Zenodo publication.', 'criminal law; institutional accountability; public safety; North Macedonia', 'pending_publication'),
  ('„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда', 'Zoran Stojankich', 'working_paper', 'draft', '10.5281/zenodo.22981744', NULL, 'Unpublished working-paper draft. The reserved DOI is metadata only until formal Zenodo publication.', 'plea bargaining; criminal justice; financial crime; confiscation; equality in sentencing', 'pending_publication');

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('2', 'Seed verified public source directory and unpublished publication metadata');
