-- Expand AI Advokat official-source registry for legal corpus ingestion.
-- Metadata/source registry only; no bulk copyrighted secondary text is imported.

INSERT OR IGNORE INTO sources
  (title, url, source_type, issuing_body, jurisdiction, source_status, notes)
VALUES
  ('LDBIS consolidated versions', 'https://ldbis.pravda.gov.mk/Revidirani.aspx', 'ministry_database', 'Ministry of Justice', 'MK', 'official', 'Official consolidated-version directory. Prefer current consolidated text with amendment/effective-date verification.'),
  ('Constitutional Court decisions and rulings', 'https://ustavensud.mk/mk/%D0%BE%D0%B4%D0%BB%D1%83%D0%BA%D0%B8-%D0%B8-%D1%80%D0%B5%D1%88%D0%B5%D0%BD%D0%B8%D1%98%D0%B0/', 'court_database', 'Constitutional Court of the Republic of North Macedonia', 'MK', 'official', 'Official database of decisions, rulings and separate opinions.'),
  ('Ministry of Justice regulations', 'https://www.pravda.gov.mk/mk-MK/regulativa', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official directory for laws, bylaws, instructions, reports, strategies and related regulatory resources.'),
  ('Ministry of Justice bylaws', 'https://www.pravda.gov.mk/mk-MK/regulativa/podzakonski-akti', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official list of bylaws and rulebooks.'),
  ('Ministry of Justice enforcement resources', 'https://www.pravda.gov.mk/mk-MK/resursi/izvrsuvanje', 'ministry_resource', 'Ministry of Justice', 'MK', 'official', 'Official enforcement-law resources including laws, bylaws, chamber acts and disciplinary decisions.'),
  ('Ministry of Justice enforcement bylaws', 'https://www.pravda.gov.mk/mk-MK/resursi/podzakonski-akti-izvrsuvanje', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official enforcement bylaws and tariff/rulebook references.'),
  ('Ministry of Justice notary bylaws', 'https://www.pravda.gov.mk/mk-MK/resursi/podzakonski-akti-notarijat', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official notary bylaws and rulebooks.'),
  ('Ministry of Justice expert-witness bylaws', 'https://www.pravda.gov.mk/mk-MK/resursi/podzakonski-akti-vestaci', 'ministry_regulation', 'Ministry of Justice', 'MK', 'official', 'Official expert-witness instructions and rulebooks.'),
  ('Ministry of Justice judicial exam resources', 'https://www.pravda.gov.mk/mk-MK/resursi/pravosuden', 'ministry_resource', 'Ministry of Justice', 'MK', 'official', 'Official judicial-exam laws, bylaws and information.'),
  ('Ministry of Justice court-translator resources', 'https://www.pravda.gov.mk/mk-MK/resursi/sudski-preveduvaci', 'ministry_resource', 'Ministry of Justice', 'MK', 'official', 'Official court-translator laws, bylaws, documents and registry links.');

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('6', 'Expand official legal-source registry for Paragraf/AI Advokat corpus ingestion');
