-- Open Legal Sources rights-and-ingest overlay.
-- This migration does not authorize any corpus import by itself.
-- Public accessibility is not treated as blanket permission for bulk copying or republication.

CREATE TABLE IF NOT EXISTS open_legal_source_rights (
  source_key TEXT PRIMARY KEY,
  canonical_url TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  authority_status TEXT NOT NULL,
  public_access_status TEXT NOT NULL,
  reuse_status TEXT NOT NULL,
  ingest_status TEXT NOT NULL,
  automated_bulk_ingest INTEGER NOT NULL DEFAULT 0 CHECK (automated_bulk_ingest IN (0,1)),
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  rights_checked_on TEXT,
  evidence_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_open_legal_source_rights_url
  ON open_legal_source_rights(canonical_url);

INSERT OR REPLACE INTO open_legal_source_rights
  (source_key, canonical_url, jurisdiction, authority_status, public_access_status, reuse_status, ingest_status, automated_bulk_ingest, human_review_status, rights_checked_on, evidence_url, notes)
VALUES
  ('mk-official-gazette','https://slvesnik.com.mk/','MK','primary_official','public_partial','terms_review_required','public_retrieval_conditional',0,'reviewed','2026-10-12',NULL,'Official publication provenance; bulk reuse remains closed pending a separate terms/licence review.'),
  ('mk-ldbis','https://ldbis.pravda.gov.mk/','MK','primary_official','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12','https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=4515','Public Ministry of Justice legal database; copyright notice is visible and no blanket bulk-reuse licence is recorded here.'),
  ('mk-ener','https://ener.gov.mk/','MK','official_supporting','public_confirmed','terms_review_required','public_retrieval_conditional',0,'reviewed','2026-10-12','https://ener.gov.mk/Default.aspx?item=newspublic','Use for regulatory history and public documents; preserve unofficial-text labels and third-party rights.'),
  ('mk-sobranie','https://www.sobranie.mk/','MK','official_legislative_history','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Legislative history and adoption metadata; not current law by itself.'),
  ('mk-constitutional-court','https://ustavensud.mk/','MK','court_official','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Official constitutional-review source.'),
  ('mk-supreme-court','https://www.vrhoven.sud.mk/','MK','court_official','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Official highest domestic case-law source.'),
  ('mk-judicial-portal','https://www.sud.mk/','MK','court_official','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Public judicial discovery; authenticated e-delivery/private files and personal-data bulk profiling excluded.'),
  ('mk-ministry-justice','https://www.pravda.gov.mk/mk-MK/regulativa','MK','official_supporting','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Official supporting regulatory and justice-sector resources.'),
  ('echr-hudoc','https://hudoc.echr.coe.int/','ECHR','international_court_official','public_confirmed','mixed_rights','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12','https://www.echr.coe.int/en/case-law-translations','Non-official translations can carry separate copyright; do not bulk republish them without permission.'),
  ('eu-eurlex','https://eur-lex.europa.eu/','EU','eu_official','public_confirmed','verified_reuse_allowed','fulltext_and_metadata_allowed_with_conditions',1,'reviewed','2026-10-12','https://eur-lex.europa.eu/content/legal-notice/legal-notice.html?locale=en','Legal documents generally reusable unless otherwise specified; metadata CC0; source-specific exceptions remain binding.'),
  ('eu-curia','https://curia.europa.eu/','EU','eu_official','public_confirmed','terms_review_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12',NULL,'Official CJEU source; bulk reuse remains closed until a specific reuse review is recorded.'),
  ('crossref','https://www.crossref.org/','GLOBAL','open_scholarly_metadata','public_confirmed','metadata_reuse_verified','metadata_only',1,'reviewed','2026-10-12','https://www.crossref.org/documentation/retrieve-metadata/','Bibliographic metadata is reusable; abstracts remain subject to publisher/author copyright.'),
  ('zenodo','https://zenodo.org/','GLOBAL','open_repository','record_level','record_level_license_required','metadata_allowed_fulltext_conditional',0,'reviewed','2026-10-12','https://about.zenodo.org/principles/','Full-text reuse depends on each record-level licence.'),
  ('rs-pravno-informacioni-sistem','https://pravno-informacioni-sistem.rs/','RS','official_foreign_comparative','public_partial','terms_review_required','public_retrieval_conditional',0,'reviewed','2026-10-12','https://fp.pravno-informacioni-sistem.rs/api/prins/GetStaticPageByCode/MM0301','Comparative use only; public and subscriber lanes remain distinct; no bulk mirror.'),
  ('si-pisrs','https://pisrs.si/','SI','official_foreign_comparative','public_confirmed','terms_review_required','public_retrieval_conditional',0,'reviewed','2026-10-12','https://pisrs.si/pregledNpb?idPredpisa=URED8183&idPredpisaChng=URED8183','Free public access confirmed; bulk reuse remains closed pending a dedicated terms review.');

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('37', 'Add rights-aware Open Legal Sources registry overlay');
