-- ZKP instrument metadata and source provenance.
-- Text import is handled separately after parse/validation.

INSERT OR IGNORE INTO sources
  (title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
  (
    'LDBIS - Закон за кривичната постапка',
    'https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679',
    'ministry_database',
    'Ministry of Justice of the Republic of North Macedonia',
    'MK',
    'official',
    'Official LDBIS metadata page. Active base law: Official Gazette 150/2010; linked amendments include 100/2012, 142/2016, Constitutional Court decision 193/2016, and 198/2018.'
  ),
  (
    'ZKP consolidated reference snapshot through 198/2018',
    'https://glasprotivnasilstvo.org.mk/wp-content/uploads/2020/10/ZAKON-ZA-KRIVICHNATA-POSTAPKA.pdf',
    'secondary_consolidated_reference',
    'Public legal-resource consolidated reference',
    'MK',
    'verified',
    '195-page consolidated reference text citing Official Gazette 150/2010, 100/2012, 142/2016, 198/2018 and Constitutional Court decision 193/2016. Used as article-level reference snapshot; official LDBIS/Gazette lineage remains controlling.'
  );

INSERT INTO legal_instruments
  (canonical_key,title,short_title,instrument_type,jurisdiction,gazette_reference,effective_date,current_status,human_review_status,canonical_source_id,notes)
SELECT
  'mk:zkp',
  'Закон за кривичната постапка',
  'ЗКП',
  'law',
  'MK',
  '150/2010; 100/2012; 142/2016; 193/2016; 198/2018',
  '2012-11-26',
  'pending',
  'pending',
  (SELECT id FROM sources WHERE url='https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679'),
  'LDBIS lists the law as active. Article-level text is imported from a consolidated reference snapshot matching the cited official lineage, but remains Human-Gate pending until article/version verification is completed.'
WHERE NOT EXISTS (
  SELECT 1 FROM legal_instruments WHERE canonical_key='mk:zkp'
);

INSERT OR IGNORE INTO instrument_versions
  (instrument_id,version_label,valid_from,valid_to,is_current,checksum_sha256,text_content,human_review_status)
SELECT
  id,
  'consolidated-reference-through-198/2018-and-CC-193/2016',
  NULL,
  NULL,
  0,
  NULL,
  NULL,
  'pending'
FROM legal_instruments
WHERE canonical_key='mk:zkp';

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('18', 'ZKP instrument metadata and official/secondary provenance sources');
