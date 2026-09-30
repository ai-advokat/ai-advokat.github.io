-- 0013: Judicial ecosystem and official institutional source graph.
-- Public-source metadata only. No authenticated/private case documents or restricted bulk registry copies.

CREATE TABLE IF NOT EXISTS court_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_key TEXT NOT NULL UNIQUE,
  official_name TEXT NOT NULL,
  court_level TEXT NOT NULL
    CHECK (court_level IN ('basic','appellate','administrative','higher_administrative','supreme','constitutional','other')),
  specialization TEXT,
  seat_city TEXT,
  portal_root TEXT,
  source_status TEXT NOT NULL DEFAULT 'official',
  discovery_status TEXT NOT NULL DEFAULT 'seeded'
    CHECK (discovery_status IN ('seeded','discovered','verified','inactive')),
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS court_public_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_id INTEGER,
  resource_type TEXT NOT NULL
    CHECK (resource_type IN (
      'decision','judgment','ruling','legal_opinion','principled_position',
      'bulletin','collection','professional_paper','form','calendar',
      'report','statistics','press_release','public_notice','other'
    )),
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_date TEXT,
  case_number TEXT,
  decision_date TEXT,
  authority_class TEXT NOT NULL DEFAULT 'context'
    CHECK (authority_class IN ('primary_case_law','strong_authority','professional_reference','procedural_resource','context')),
  public_only INTEGER NOT NULL DEFAULT 1 CHECK (public_only IN (0,1)),
  ingest_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (ingest_status IN ('discovered','metadata_only','queued','ingested','reviewed','rejected')),
  source_sha256 TEXT,
  human_review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES court_registry(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS court_ingest_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_key TEXT NOT NULL UNIQUE,
  portal_root TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  discovered_courts INTEGER NOT NULL DEFAULT 0,
  discovered_resources INTEGER NOT NULL DEFAULT 0,
  ingested_decisions INTEGER NOT NULL DEFAULT 0,
  skipped_private INTEGER NOT NULL DEFAULT 0,
  skipped_context_only INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged','validated','rejected','imported')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_court_registry_level
ON court_registry(court_level, seat_city);

CREATE INDEX IF NOT EXISTS idx_court_resources_case
ON court_public_resources(case_number, decision_date);

CREATE INDEX IF NOT EXISTS idx_court_resources_authority
ON court_public_resources(authority_class, resource_type, ingest_status);

INSERT OR IGNORE INTO court_registry
(canonical_key,official_name,court_level,specialization,seat_city,portal_root,discovery_status,human_review_status)
VALUES
('mk-basic-criminal-skopje','Основен кривичен суд Скопје','basic','criminal','Скопје','https://www.sud.mk/','verified','reviewed'),
('mk-appellate-bitola','Апелационен суд Битола','appellate',NULL,'Битола','https://www.sud.mk/','seeded','pending'),
('mk-appellate-gostivar','Апелационен суд Гостивар','appellate',NULL,'Гостивар','https://www.sud.mk/','verified','reviewed'),
('mk-appellate-skopje','Апелационен суд Скопје','appellate',NULL,'Скопје','https://www.sud.mk/','seeded','pending'),
('mk-appellate-stip','Апелационен суд Штип','appellate',NULL,'Штип','https://www.sud.mk/','seeded','pending'),
('mk-administrative-court','Управен суд','administrative',NULL,'Скопје','https://www.sud.mk/','seeded','pending'),
('mk-higher-administrative-court','Виш управен суд','higher_administrative',NULL,'Скопје','https://www.sud.mk/','seeded','pending'),
('mk-supreme-court','Врховен суд на Република Северна Македонија','supreme',NULL,'Скопје','https://www.vrhoven.sud.mk/','verified','reviewed'),
('mk-constitutional-court','Уставен суд на Република Северна Македонија','constitutional',NULL,'Скопје','https://ustavensud.mk/','verified','reviewed');

INSERT OR IGNORE INTO sources
(title,url,source_type,issuing_body,jurisdiction,source_status,notes)
VALUES
('Ministry of Justice','https://www.pravda.gov.mk/','justice_hub','Ministry of Justice','MK','official','Justice hub for LDBIS, execution, mediation, notariat, free legal aid, translators, experts, mediators, legal clinics, international legal assistance and public regulations.'),
('Judicial Portal of the Republic of North Macedonia','https://www.sud.mk/','court_portal','Judiciary of the Republic of North Macedonia','MK','official','Public court system portal for decisions, reports, forms, publications, bulletins and collections. Authenticated e-delivery is excluded.'),
('State Attorney Office','https://dprsm.gov.mk/wp/','state_attorney','State Attorney Office of the Republic of North Macedonia','MK','official','Public laws, decisions, rulebooks, reports and institutional materials.'),
('Central Registry','https://www.crm.com.mk/','official_registry','Central Registry of the Republic of North Macedonia','MK','official','Official company/pledge/register verification source. Published reuse restrictions require link/user-initiated verification unless separate permission exists.'),
('National e-Services Portal','https://uslugi.gov.mk/','public_service_portal','Ministry of Digital Transformation','MK','official','Public service catalogue only. Authenticated eID/profile/submission data are excluded.'),
('Public Revenue Office','https://www.ujp.gov.mk/','tax_authority','Public Revenue Office','MK','official','Public tax regulation, guides, forms, calendar and guidance; taxpayer-specific/eTax data excluded.'),
('Agency for Real Estate Cadastre','https://www.katastar.gov.mk/','property_registry','Agency for Real Estate Cadastre','MK','official','Public property/cadastre services, regulation and permitted public-register outputs; authenticated professional systems are not mirrored.'),
('Chamber of Enforcement Agents','https://kirm.mk/','professional_chamber','Chamber of Enforcement Agents','MK','official','Public regulations, directory and procedural materials; no bulk ingestion of personal data from notices/search results.'),
('Notary Chamber','https://www.nkrm.org.mk/','professional_chamber','Notary Chamber','MK','official','Public notarial regulation, tariff, ethics, directory and professional publications.'),
('Bar Association','https://www.mba.org.mk/','professional_chamber','Bar Association','MK','official','Public Bar acts, lawyer directory/lists, training and professional materials.'),
('Economic Chamber of North Macedonia','https://www.mchamber.mk/','business_regulatory_monitor','Economic Chamber of North Macedonia','MK','verified','Public monitoring of ENER, parliamentary bills and Gazette-published regulation. Proposals are not law in force.'),
('Ministry of Economy and Labour','https://www.economy.gov.mk/','sector_ministry','Ministry of Economy and Labour','MK','official','Public economic, labour, insolvency, consumer, safety, licensing and business regulation materials.'),
('Health Insurance Fund','https://fzo.org.mk/','health_insurance_authority','Health Insurance Fund of the Republic of North Macedonia','MK','official','Public health-insurance legislation, consolidated-text signals, amendment chains, Constitutional Court links, procedures and guidance.'),
('PRAKSIS','https://praksis.mk/','secondary_legal_platform','PRAKSIS','MK','verified','Commercial legal database. Public feature benchmark/discovery only; no proprietary/subscriber corpus copying.'),
('PraVI','https://pravi.mk/','secondary_ai_legal_platform','PRAKSIS / CodeChem / ACT!','MK','verified','Commercial AI legal assistant. Public feature benchmark only.');

INSERT OR REPLACE INTO source_ingest_policies
(source_url,authority_level,ingest_mode,automated_access,article_chunking,current_text_priority,terms_checked_on,notes)
VALUES
('https://www.sud.mk/','court_official','public_metadata',1,0,1,'2026-09-29','Index public decisions, judgments, rulings, bulletins, collections and professional materials. Press releases/statistics are context-only. e-Delivery/private documents excluded.'),
('https://www.pravda.gov.mk/','official_supporting','public_metadata',1,1,1,'2026-09-29','Public justice regulations/register metadata only; personal register data used for verification, not bulk profiling.'),
('https://dprsm.gov.mk/wp/','official_supporting','public_metadata',1,1,0,'2026-09-29','Public institutional documents; legal text re-verified against Gazette/LDBIS.'),
('https://www.crm.com.mk/','official_supporting','link_only',0,0,0,'2026-09-29','Published terms restrict registry-data reuse; use official user-initiated verification and separately licensed open data only.'),
('https://uslugi.gov.mk/','public_information','public_metadata',1,0,0,'2026-09-29','Public service catalogue only; eID/private data excluded.'),
('https://www.ujp.gov.mk/','official_supporting','public_metadata',1,1,1,'2026-09-29','Public tax regulation/guidance/forms/calendar; taxpayer-specific/eTax data excluded.'),
('https://www.katastar.gov.mk/','official_supporting','public_metadata',1,0,1,'2026-09-29','Permitted public property/cadastre materials only; authenticated/professional systems not mirrored.'),
('https://kirm.mk/','official_supporting','public_metadata',1,1,0,'2026-09-29','Public chamber acts/regulations; no bulk personal-data ingestion from notices/search results.'),
('https://www.nkrm.org.mk/','official_supporting','public_metadata',1,1,0,'2026-09-29','Public notarial regulation/tariff/ethics/publications; directory for verification.'),
('https://www.mba.org.mk/','official_supporting','public_metadata',1,1,0,'2026-09-29','Public Bar acts/materials; directory for verification; case-law references re-verified against originating court.'),
('https://www.mchamber.mk/','public_information','public_metadata',1,0,0,'2026-09-29','Regulatory monitoring only; proposals never classified as law in force.'),
('https://www.economy.gov.mk/','official_supporting','public_metadata',1,1,1,'2026-09-29','Public sector regulations/documents; controlling legal text re-verified against Gazette/LDBIS.'),
('https://fzo.org.mk/','official_supporting','public_metadata',1,1,1,'2026-09-29','Public health-law versioning/procedures; controlling legal text re-verified against Gazette/LDBIS.'),
('https://praksis.mk/','secondary_reference','link_only',0,0,0,'2026-09-29','Commercial database; feature benchmark/discovery only.'),
('https://pravi.mk/','secondary_reference','link_only',0,0,0,'2026-09-29','Commercial AI legal platform; feature benchmark only.');

INSERT OR IGNORE INTO schema_migrations(version,description)
VALUES ('13','Judicial ecosystem registry and official institutional source graph');
