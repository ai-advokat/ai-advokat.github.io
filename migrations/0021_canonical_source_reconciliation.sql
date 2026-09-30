-- Canonical official-source reconciliation for the production source schema.
-- Production accepts source_type values such as ministry/government/court/etc.
-- This migration backfills canonical source rows that older INSERT OR IGNORE statements
-- silently skipped because they used non-production source_type labels.

-- ZRO official consolidated snapshot
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','Ministry of Economy and Labour - ZRO consolidated snapshot through 111/2023',
       'Ministry of Economy and Labour','MK',
       'https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf','official',
       'Official government-hosted consolidated Labour Relations Act snapshot through Official Gazette 111/2023. Historical snapshot; not promoted as current 2026 law.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf');

-- ZKP official LDBIS metadata
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за кривичната постапка',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679','official',
       'Official LDBIS metadata page for the active Criminal Procedure Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679');

-- KZ base law + 2026 amendment/correction
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Кривичен законик',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4312','official',
       'Official LDBIS base-law metadata for the Criminal Code.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4312');

INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за изменување и дополнување на Кривичниот законик 16/2026',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72834','official',
       'Official LDBIS amendment metadata. Published 28.01.2026; application from 05.02.2026.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72834');

INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Исправка на Законот за изменување и дополнување на Кривичниот законик 17/2026',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72841','official',
       'Official LDBIS correction metadata. Published 29.01.2026; applies from 05.02.2026.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=72841');

-- ZPP current-applicable and future-application tracks
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за парничната постапка (2005 current-applicable track)',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692','official',
       'Current-applicable civil procedure track until 18 January 2027.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692');

INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за парничната постапка 151/2026',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=74234','official',
       'New civil procedure law; published in 2026 and scheduled for application from 18 January 2027.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=74234');

-- ZOO
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за облигационите односи',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6538','official',
       'Official LDBIS metadata for the Obligations Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6538');

-- ZOUP
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за општата управна постапка',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=37954','official',
       'Official LDBIS metadata for the General Administrative Procedure Act.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=37954');

-- ZI
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за извршување',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=41212','official',
       'Official LDBIS metadata for the Execution Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=41212');

INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','Ministry of Justice - Закони за извршување',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://www.pravda.gov.mk/mk-MK/resursi/zakoni-izvrsuvanje','official',
       'Official Ministry resource page exposing the consolidated Execution Act and amendment acts.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://www.pravda.gov.mk/mk-MK/resursi/zakoni-izvrsuvanje');

-- Family law
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за семејството',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057','official',
       'Official LDBIS metadata for the Family Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057');

-- Property law
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за сопственост и други стварни права',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6552','official',
       'Official LDBIS metadata for the Property and Other Real Rights Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6552');

-- Company law
INSERT INTO sources (source_type,title,issuing_body,jurisdiction,url,source_status,notes)
SELECT 'ministry','LDBIS - Закон за трговските друштва - current lineage',
       'Ministry of Justice of the Republic of North Macedonia','MK',
       'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=68788','official',
       'Official LDBIS metadata for the current Companies Act lineage.'
WHERE NOT EXISTS (SELECT 1 FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=68788');

-- Bind canonical sources.
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zro';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zkp';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4312'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:kz';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zpp';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6538'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zoo';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=37954'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zoup';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=41212'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zi';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zs';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6552'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:zsidp';
UPDATE legal_instruments SET canonical_source_id=(SELECT MIN(id) FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=68788'), updated_at=CURRENT_TIMESTAMP WHERE canonical_key='mk:ztd';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('21', 'Canonical official-source reconciliation for law registry');
