-- 0030: Extend judicial source graph for European case law and licensed secondary discovery.
-- Public/official metadata and authorized/licensed imports only.
-- No paywall bypass, credential reuse, session scraping, or proprietary bulk-copying.

ALTER TABLE court_registry ADD COLUMN jurisdiction TEXT NOT NULL DEFAULT 'MK';
ALTER TABLE court_registry ADD COLUMN authority_scope TEXT;
ALTER TABLE court_registry ADD COLUMN source_identifier_scheme TEXT;

UPDATE court_registry
   SET jurisdiction='MK',
       authority_scope=CASE
         WHEN court_level='constitutional' THEN 'constitutional_review'
         ELSE 'domestic_case_law'
       END,
       source_identifier_scheme=CASE
         WHEN court_level='constitutional' THEN 'court_reference'
         ELSE 'domestic_case_number'
       END
 WHERE jurisdiction='MK';

INSERT OR IGNORE INTO court_registry
(canonical_key,official_name,court_level,specialization,seat_city,portal_root,discovery_status,human_review_status,jurisdiction,authority_scope,source_identifier_scheme)
VALUES
('echr-hudoc','European Court of Human Rights','other','human_rights','Strasbourg','https://hudoc.echr.coe.int/','verified','reviewed','ECHR','convention_case_law','application_number'),
('cjeu-infocuria','Court of Justice of the European Union','other','eu_law','Luxembourg','https://curia.europa.eu/','verified','reviewed','EU','eu_case_law_reference','ecli_or_case_number');

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
('HUDOC - European Court of Human Rights','https://hudoc.echr.coe.int/','court_database','European Court of Human Rights','ECHR','official','Official Convention case-law database. For North Macedonia, preserve application number, decision/judgment type, date, Convention provisions, finality and authoritative language.'),
('InfoCuria - Court of Justice of the European Union','https://curia.europa.eu/','court_database','Court of Justice of the European Union','EU','official','Official EU case-law source. EU-law authority must be classified separately from domestic and ECHR authority; do not label CJEU material as automatically binding domestic precedent.'),
('Paragraf.mk / LexAI','https://paragraf.mk/','secondary_legal_platform','Paragraf.mk','MK','verified','Commercial/legal AI platform and secondary discovery source. Public pages may be linked and manually verified; subscriber-only law/case-law corpora require lawful licensed access or user-provided authorized export. No credential bypass or automated copying of restricted content.');

INSERT OR REPLACE INTO source_ingest_policies
(source_url,authority_level,ingest_mode,automated_access,article_chunking,current_text_priority,terms_checked_on,notes)
VALUES
('https://hudoc.echr.coe.int/','court_official','public_metadata',1,0,1,'2026-10-10','Official ECHR source. Ingest public case metadata/full text only through permitted public access; preserve application number, document type, date, Article(s), language, source URL and source hash.'),
('https://curia.europa.eu/','court_official','public_metadata',1,0,0,'2026-10-10','Official CJEU source. Use as EU-law authority/reference with explicit jurisdiction/authority labels; never silently classify as Macedonian domestic precedent.'),
('https://paragraf.mk/','secondary_reference','link_only',0,0,0,'2026-10-10','Commercial secondary platform. No scraping of subscriber-only LexAI/Lex/Nova content, no password/session reuse and no paywall bypass. Import is allowed only from a separately authorized/licensed export supplied by the rights holder or licensed user, with provenance retained.');

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('30', 'European judicial source graph and licensed secondary-source boundary');
