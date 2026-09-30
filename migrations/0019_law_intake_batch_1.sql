-- Law Intake Batch 1: core Macedonian statutes and scalable alias registry.
-- Metadata-first. Article corpora are imported only after source/version validation.

CREATE TABLE IF NOT EXISTS legal_instrument_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instrument_id INTEGER NOT NULL,
  alias TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'mk',
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(instrument_id) REFERENCES legal_instruments(id) ON DELETE CASCADE,
  UNIQUE(instrument_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_legal_instrument_aliases_instrument
ON legal_instrument_aliases(instrument_id, priority DESC);

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
('LDBIS - Кривичен законик','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4312','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS base-law metadata. Active lineage includes amendments through Official Gazette 16/2026.'),
('LDBIS - Закон за парничната постапка (2005 current-applicable track)','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Current-applicable track until 18 January 2027.'),
('LDBIS - Закон за парничната постапка 151/2026','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=74234','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','New law published 8 July 2026; entry into force 16 July 2026; application begins 18 January 2027.'),
('LDBIS - Закон за облигационите односи','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6538','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS base-law metadata. Lineage includes amendments through 154/2023 and Constitutional Court effects.'),
('LDBIS - Закон за општата управна постапка','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=37954','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS metadata for the 124/2015 law; Constitutional Court lineage includes 65/2018.'),
('LDBIS - Закон за извршување','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=41212','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS metadata. Lineage includes 72/2016, 142/2016, 233/2018, 14/2020 and 154/2023.'),
('Ministry of Justice - Закони за извршување','https://www.pravda.gov.mk/mk-MK/resursi/zakoni-izvrsuvanje','ministry_regulation','Ministry of Justice of the Republic of North Macedonia','MK','official','Official Ministry resource page exposing a consolidated Execution Act and amendment acts.'),
('LDBIS - Закон за семејството','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS purified-version metadata; later amendment lineage includes Official Gazette 192/2025.'),
('LDBIS - Закон за сопственост и други стварни права','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6552','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS base-law metadata; amendment and Constitutional Court lineage requires version convergence before current-verified status.'),
('LDBIS - Закон за трговските друштва - current lineage','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=68788','ministry_database','Ministry of Justice of the Republic of North Macedonia','MK','official','Official LDBIS amendment page linked to the 28/2004 base law; current lineage includes Official Gazette 272/2024.');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:kz','Кривичен законик','КЗ','law','MK','37/1996; amendments through 16/2026','1996-08-06','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4312'),
 'Active criminal code lineage. Article-level corpus must converge all amendments through 16/2026 before current-verified promotion.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:kz');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zpp','Закон за парничната постапка','ЗПП','law','MK','79/2005; 110/2008; 83/2009; 116/2010; 124/2015; transition to 151/2026','2005-09-29','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692'),
 'Temporal dual-track: the 2005 law remains applicable until 18 January 2027; the new 151/2026 law is in force but begins application on 18 January 2027. Do not collapse versions.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zpp');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zoo','Закон за облигационите односи','ЗОО','law','MK','18/2001; amendments through 154/2023; Constitutional Court effects through 2024','2001-03-13','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6538'),
 'Active obligations-law lineage. Article-level corpus remains Human-Gate pending until amendment and Constitutional Court effects are converged.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zoo');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zoup','Закон за општата управна постапка','ЗОУП','law','MK','124/2015; Constitutional Court 65/2018','2015-07-31','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=37954'),
 'Active general administrative procedure law. Prefer official consolidated text before article-level current promotion.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zoup');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zi','Закон за извршување','ЗИ','law','MK','72/2016; 142/2016; 233/2018; 14/2020; 154/2023','2016-04-22','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=41212'),
 'Official Ministry resources expose a consolidated text. This law is first priority for Batch-1 article-level ingestion.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zi');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zs','Закон за семејството','ЗС','law','MK','purified 153/2014; later amendments including 192/2025','2014-08-09','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=34057'),
 'Purified 2014 text has later amendments; latest lineage must be converged before current-verified status.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zs');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:zsidp','Закон за сопственост и други стварни права','ЗСДСП','law','MK','18/2001; later amendments and Constitutional Court effects','2001-03-13','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=6552'),
 'Property-law lineage requires amendment convergence before article-level current promotion.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zsidp');

INSERT INTO legal_instruments
(canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT 'mk:ztd','Закон за трговските друштва','ЗТД','law','MK','28/2004; current lineage including 272/2024','2004-05-08','pending','pending',
 (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=68788'),
 'Company-law lineage. Article-level current promotion requires convergence of the long amendment chain.'
WHERE NOT EXISTS (SELECT 1 FROM legal_instruments WHERE canonical_key='mk:ztd');

-- Temporal version placeholders for ZPP.
INSERT OR IGNORE INTO instrument_versions
(instrument_id,version_label,valid_from,valid_to,is_current,checksum_sha256,text_content,human_review_status)
SELECT id,'applicable-track-79/2005-through-124/2015',NULL,'2027-01-17',1,NULL,NULL,'pending'
FROM legal_instruments WHERE canonical_key='mk:zpp';

INSERT OR IGNORE INTO instrument_versions
(instrument_id,version_label,valid_from,valid_to,is_current,checksum_sha256,text_content,human_review_status)
SELECT id,'future-application-151/2026','2027-01-18',NULL,0,NULL,NULL,'pending'
FROM legal_instruments WHERE canonical_key='mk:zpp';

-- Aliases used by the assistant and UI.
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗРО','mk',200 FROM legal_instruments WHERE canonical_key='mk:zro';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за работните односи','mk',180 FROM legal_instruments WHERE canonical_key='mk:zro';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗКП','mk',200 FROM legal_instruments WHERE canonical_key='mk:zkp';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за кривичната постапка','mk',180 FROM legal_instruments WHERE canonical_key='mk:zkp';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'КЗ','mk',200 FROM legal_instruments WHERE canonical_key='mk:kz';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Кривичен законик','mk',180 FROM legal_instruments WHERE canonical_key='mk:kz';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗПП','mk',200 FROM legal_instruments WHERE canonical_key='mk:zpp';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за парничната постапка','mk',180 FROM legal_instruments WHERE canonical_key='mk:zpp';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗОО','mk',200 FROM legal_instruments WHERE canonical_key='mk:zoo';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за облигационите односи','mk',180 FROM legal_instruments WHERE canonical_key='mk:zoo';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗОУП','mk',200 FROM legal_instruments WHERE canonical_key='mk:zoup';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за општата управна постапка','mk',180 FROM legal_instruments WHERE canonical_key='mk:zoup';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗИ','mk',200 FROM legal_instruments WHERE canonical_key='mk:zi';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за извршување','mk',180 FROM legal_instruments WHERE canonical_key='mk:zi';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗС','mk',200 FROM legal_instruments WHERE canonical_key='mk:zs';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за семејството','mk',180 FROM legal_instruments WHERE canonical_key='mk:zs';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗСДСП','mk',200 FROM legal_instruments WHERE canonical_key='mk:zsidp';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за сопственост и други стварни права','mk',180 FROM legal_instruments WHERE canonical_key='mk:zsidp';

INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'ЗТД','mk',200 FROM legal_instruments WHERE canonical_key='mk:ztd';
INSERT OR IGNORE INTO legal_instrument_aliases(instrument_id,alias,language,priority)
SELECT id,'Закон за трговските друштва','mk',180 FROM legal_instruments WHERE canonical_key='mk:ztd';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('19', 'Law Intake Batch 1 metadata, temporal ZPP versions and scalable instrument aliases');
