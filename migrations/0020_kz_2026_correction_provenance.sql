-- KZ 2026 provenance correction.
-- Adds the 16/2026 amendment and 17/2026 correction as explicit official sources.

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
(
  'LDBIS - Закон за изменување и дополнување на Кривичниот законик 16/2026',
  'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72834',
  'ministry_database',
  'Ministry of Justice of the Republic of North Macedonia',
  'MK',
  'official',
  'Official LDBIS amendment metadata. Published 28.01.2026; entry into force and application 05.02.2026.'
),
(
  'LDBIS - Исправка на Законот за изменување и дополнување на Кривичниот законик 17/2026',
  'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72841',
  'ministry_database',
  'Ministry of Justice of the Republic of North Macedonia',
  'MK',
  'official',
  'Official LDBIS correction metadata. Published 29.01.2026; applies from 05.02.2026 and corrects the 16/2026 amendment.'
);

UPDATE legal_instruments
SET gazette_reference='37/1996; amendments through 16/2026; correction 17/2026',
    notes='Active criminal code lineage. The 16/2026 amendment is followed by correction 17/2026. Article-level corpus must converge all amendments and the correction before current-verified promotion.',
    updated_at=CURRENT_TIMESTAMP
WHERE canonical_key='mk:kz';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('20', 'Criminal Code 16/2026 amendment and 17/2026 correction provenance');
