# Paragraf.mk / Lex / Nova / LexAI full migration runbook

Status: **READY FOR AUTHORITATIVE EXPORT PACKAGE · STAGING FIRST**

This runbook governs migration of an owner-authorized or otherwise lawfully supplied Paragraf/Lex/Nova/LexAI export into AI Advokat.

## Non-negotiable controls

1. No credential bypass, session reuse, paywall bypass, CAPTCHA bypass, or security-control circumvention.
2. Do not place passwords, API keys, cookies, private keys, session IDs, recovery codes or authentication material in the corpus.
3. Obtain the export through an authorized account recovery, provider backup/snapshot, database dump, application export, storage archive, or rights-holder/licensed export.
4. Preserve the original package read-only before transformation.
5. Hash every source package and every normalized record.
6. Import into **staging only** first.
7. Keep public/professional legal knowledge separate from private client matters, user accounts and billing.
8. Case-law material from Paragraf remains licensed-secondary discovery until independently bound to an official court/HUDOC/InfoCuria/EUR-Lex source and approved through Human Gate.
9. Production promotion requires count/checksum/parity audit, rollback plan and Human Gate approval.

## Intake package

Preferred package:

- database dump (SQL/PostgreSQL/MySQL/SQLite, whichever exists);
- uploaded/source files archive;
- application export (JSON/JSONL/CSV/XML);
- original PDFs/DOCX where available;
- metadata mapping/document IDs;
- product lineage: Lex, Nova or LexAI;
- source URLs and original identifiers;
- separate account/billing export only if operationally required (never knowledge-eligible).

## Classification map

| Material | AI Advokat role | Default knowledge eligibility |
|---|---|---|
| Legislation / consolidated texts | primary_law | yes after provenance/version review |
| Judgments / case law | case_law | discovery-only until official binding + Human Gate |
| Zoran Stojankich publications | publication | yes after ownership/provenance review |
| Authorized legal commentary | commentary | yes after provenance/review |
| Legal templates/forms | template | yes if intended for professional knowledge use |
| General legal reference | reference | yes after review |
| Private client/case files | private_case | no public corpus |
| User/account data | account | never |
| Billing/subscription/payment | commercial | never |
| Credentials/tokens/sessions | forbidden | reject |

## Execution sequence

### Phase 0 — preserve
- Copy authoritative export to immutable/read-only storage.
- Record export date, provider/product, operator, file count, byte count and package SHA-256.
- Do not edit the original.

### Phase 1 — inventory
Create a manifest with:
- run_id
- source_provider
- source_product
- authorized_export=true
- license_or_access_basis
- package SHA-256
- expected item counts by category

### Phase 2 — normalize
Run:

```bash
node scripts/normalize-paragraf-full-export.mjs export.json normalized.ndjson
node scripts/validate-paragraf-import.mjs normalized.ndjson
```

The normalizer rejects credential/session fields and marks private/account/billing material as non-knowledge.

### Phase 3 — case-law split
Route normalized `case_law` records through the governed case-law importer:

```bash
node scripts/case-law-ndjson-to-sql.mjs ingest/cases.ndjson /tmp/cases.sql
```

Paragraf case law is `licensed_secondary`, `discovery_only=1`, Human Gate pending.

### Phase 4 — staging import
- Load metadata into the Paragraf landing tables.
- Store source/original files only in the designated private/object storage layer, not the public repository.
- Run deduplication using legacy ID + SHA-256 + official identifiers.
- Run corpus safety tests.

### Phase 5 — official-source binding
For every case-law record where possible:
- Macedonian courts: bind by case number/court/date to official court source.
- ECHR: bind by application number + HUDOC item.
- EU: bind by ECLI/CELEX/InfoCuria.
- Preserve Paragraf as provenance/discovery source, not controlling authority.

### Phase 6 — parity audit
Compare source vs staging:
- total records;
- counts by material class;
- missing/duplicate IDs;
- checksum mismatches;
- files without metadata;
- metadata without files;
- encoding failures;
- unbound case law;
- rejected credential/session material.

### Phase 7 — Human Gate
Human reviewer approves:
- provenance;
- classification;
- current-law/version state;
- official-source binding;
- visibility;
- knowledge eligibility.

### Phase 8 — production promotion
Only reviewed/approved eligible records are promoted. Private material stays in the authenticated workspace path. Account/billing material never enters legal retrieval.

## Recovery path when credentials are unavailable

Use the provider's official recovery route. For Hetzner, current official documentation states that if the customer number or primary email is no longer known, the customer should contact `info@hetzner.com` and be prepared to provide customer/account information for verification. Recovery must remain provider-mediated; no technical bypass is part of this runbook.

## Completion definition

The migration is complete only when:
- authoritative export is preserved;
- every source item is inventoried;
- normalized corpus count matches the export within documented exclusions;
- all eligible records have provenance and SHA-256;
- private/account/billing data is segregated;
- case-law official binding status is visible;
- staging passes tests;
- Human Gate signs off;
- production import passes post-import parity checks.
