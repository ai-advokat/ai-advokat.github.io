-- Official Gazette open-data issue metadata source (1944-2017)
-- Registers the official data.gov.mk dataset as an issue-level provenance backbone only.
-- This migration does NOT import Gazette full text and does NOT establish current-law status.

INSERT OR IGNORE INTO sources
  (title, url, source_type, issuing_body, jurisdiction, source_status, publication_date, notes)
VALUES
  (
    'data.gov.mk · ЈП Службен весник на РСМ — Изданија на Службен весник до 2017',
    'https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017',
    'official_gazette_issue_metadata',
    'ЈП Службен весник на РСМ',
    'MK',
    'official',
    NULL,
    'Official issue-level metadata dataset covering 1944-2017 by issue number, issue date and publication type. Dataset/resource IDs: 05342c32-f4a6-49c3-b8fa-5a555a6df6ff / 9a039791-1abb-411f-bc04-bf136776a83a. Metadata only: never treat as Gazette full text, act text or current law.'
  );

INSERT OR REPLACE INTO open_legal_source_rights
  (source_key, canonical_url, jurisdiction, authority_status, public_access_status, reuse_status, ingest_status, automated_bulk_ingest, human_review_status, rights_checked_on, evidence_url, notes)
VALUES
  (
    'mk-official-gazette-data-gov-2017',
    'https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017',
    'MK',
    'primary_official',
    'public_confirmed',
    'terms_review_required',
    'metadata_only',
    0,
    'reviewed',
    '2026-10-18',
    'https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017',
    'Official Gazette issue metadata. Dataset says isopen=true / Друго (Отворено), while CKAN QA reports openness_score=0 / License not open. Use for source registration and reconciliation only; bulk raw republication remains fail-closed until licence terms are reconciled.'
  );

INSERT OR IGNORE INTO schema_migrations(version, description)
VALUES ('46', 'Register official Gazette data.gov.mk issue metadata backbone for 1944-2017');
