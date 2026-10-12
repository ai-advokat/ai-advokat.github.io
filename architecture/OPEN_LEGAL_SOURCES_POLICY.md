# AI Advokat · Open Legal Sources Policy

Version: 1.0  
Date: 2026-10-12  
Registry: `data/open-legal-sources-registry-2026.json`

## Purpose

This policy governs how AI Advokat discovers, evaluates, ingests and reuses legal material that is publicly accessible or openly licensed.

The core rule is simple:

> **Public access is not the same as permission to bulk copy, mirror or republish.**

A source can be public and still have unclear, mixed, record-level or restrictive reuse conditions. In that case AI Advokat fails closed.

## Source classes

The registry distinguishes:

- **primary_official** — official publication or official current-law/version source;
- **court_official** — originating domestic court source;
- **official_supporting** — ministry or public-body supporting source;
- **official_legislative_history** — parliamentary/adoption history source;
- **international_court_official** — originating international court source;
- **eu_official** — official EU legal source;
- **official_foreign_comparative** — official foreign source used for comparative research;
- **open_scholarly_metadata** — open bibliographic/provenance metadata;
- **open_repository** — repository where each record's licence controls reuse.

Authority class and reuse class are separate. A highly authoritative source can still require a reuse review.

## Fail-closed reuse states

### verified_reuse_allowed
Reuse has been verified from the source's own official terms/licence. Conditions and exceptions still apply.

### metadata_reuse_verified
Structured metadata reuse is verified, while abstracts/full text may remain protected.

### record_level_license_required
Each individual record or file must be checked for its licence before full-text reuse.

### mixed_rights
Different parts of the same source have different rights. Example: official-language case material and third-party translations.

### terms_review_required
The source is public, but this registry does not yet record a sufficiently clear blanket reuse basis for automated bulk ingestion or republication.

### restricted
Automated ingestion/reuse is blocked unless a separate lawful authorization exists.

## Ingest rules

1. **No subscription bypass.** Authentication, paywall or subscriber-only content is never bypassed.
2. **No public-site mirroring by assumption.** A public website is not copied wholesale merely because pages can be opened in a browser.
3. **Metadata-first where rights are unclear.** URLs, identifiers, dates, version metadata and provenance may be retained where lawful and necessary; full-text bulk ingestion remains closed until reviewed.
4. **Current-law verification is independent of reuse.** A text being reusable does not make it current law. Publication, amendments, entry into force, application date and later constitutional/judicial effects still need resolution.
5. **Record-level licences control repositories.** Zenodo or similar repositories do not confer one blanket licence over all uploaded files.
6. **Translations are separate works.** Non-official translations, summaries or editorial additions can have different rights from the originating judgment or legal act.
7. **Privacy minimisation applies to case law.** Public availability does not authorize unnecessary personal-data profiling.
8. **Comparative law is labelled.** Serbian, Slovenian or other foreign materials cannot silently become North Macedonian controlling authority.
9. **Human Gate before automation.** A new source cannot be promoted to automated ingest until the authority, access, reuse and ingest statuses are reviewed.
10. **Provenance survives every transformation.** Source URL, identifier, retrieval time, checksum and rights state travel with the derived record.

## Status contract

A source is eligible for automated full-text ingestion only when:

- its `reuse_status` is compatible with reuse;
- its `ingest_status` explicitly permits full text;
- any source-specific conditions are enforced;
- `human_review_status` is `reviewed`;
- the concrete record itself does not carry a conflicting licence or rights notice.

If any of these facts is missing, automated full-text ingestion is not approved.

## Initial verified lanes

### EUR-Lex
The official EUR-Lex legal notice states that EU legal documents are generally reusable for commercial or non-commercial purposes unless otherwise specified. EUR-Lex metadata is CC0. EU-owned editorial content, summaries and consolidated texts are identified as CC BY 4.0, subject to stated conditions and third-party rights.

This is the initial source in the registry with a verified automated bulk-ingest lane, subject to its documented exceptions.

### Crossref
Bibliographic metadata and Crossref-generated data are reusable; abstracts remain subject to publisher or author copyright. AI Advokat therefore treats Crossref as a metadata lane, not an open-full-text lane.

### Zenodo
Each record has its own licence. Full text is reusable only when the record-level licence allows the intended use.

### HUDOC
HUDOC is the official ECHR case-law source. Non-official translations can be protected by separate copyright and must not be bulk republished merely because they are visible in HUDOC.

### North Macedonian public legal sources
LDBIS, ENER, the courts, the Judicial Portal, Parliament, the Ministry of Justice and the Official Gazette are authoritative or official public sources. Their legal authority does not by itself establish a blanket bulk-reuse licence. AI Advokat therefore preserves their existing research/provenance use while keeping automated bulk mirroring closed unless terms are separately verified.

## Relationship to existing AI Advokat registries

This policy is a **rights-and-ingest overlay**, not a replacement for:

- `corpus/mk/source-registry.json`;
- `data/case-law-source-registry-2026.json`;
- the official-source graph;
- current-law readiness gates;
- case-law authority classification;
- response provenance and Human Gate controls.

Those registries answer **what the source is and how much legal authority it has**.  
This registry additionally answers **what may be retrieved, reused, automated or republished**.

## Change control

Any promotion from a restrictive/conditional state to automated full-text ingestion must include:

1. an official terms/licence URL or other lawful authorization;
2. a dated rights review;
3. a registry change;
4. regression-test coverage;
5. Human Review;
6. where production ingestion is involved, the existing corpus Human Gate.

No source is promoted by inference or convenience.
