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
- Keep the authoritative package outside the public GitHub repository.

### Phase 1 — inventory

Create a manifest with:

- `run_id`
- `source_provider`
- `source_product`
- `authorized_export=true`
- `license_or_access_basis`
- `package_sha256`
- expected item counts by category

Template: `migration/paragraf/full-export-manifest.template.json`.

### Phase 2 — normalize and validate

Run:

```bash
node scripts/normalize-paragraf-full-export.mjs export.json normalized.ndjson
node scripts/validate-paragraf-import.mjs normalized.ndjson
```

The normalizer:

- preserves the original package SHA-256 when supplied;
- computes a SHA-256 over the normalized payload;
- rejects credential/session fields;
- assigns corpus roles;
- marks private/account/billing material as non-knowledge;
- keeps all records Human Gate pending.

The validator understands the normalized manifest, verifies record counts and checksums, and fails closed if the manifest is production-eligible or lacks the Human Gate requirement.

### Phase 3 — generate landing-zone SQL

Generate rerun-resistant SQL for the Paragraf landing tables:

```bash
node scripts/paragraf-full-ndjson-to-sql.mjs normalized.ndjson /tmp/paragraf-staging.sql
```

Important behavior:

- every imported record remains `provenance_status='pending'`;
- every imported record remains `human_review_status='pending'`;
- private/client/account/billing records are forced to `knowledge_eligible=0`;
- private/account/billing text is not written into the D1 landing table;
- original private material remains only in the preserved export / designated secure object-storage path;
- inserts are rerun-resistant.

### Phase 4 — staging D1 import

Only after the generated SQL has been reviewed:

```bash
npx wrangler d1 execute PREVIEW_DB \
  --remote \
  --config wrangler.preview-migrations.jsonc \
  --file /tmp/paragraf-staging.sql
```

Then run read-only checks:

```bash
npx wrangler d1 execute PREVIEW_DB --remote --config wrangler.preview-migrations.jsonc \
  --command "SELECT import_status, item_count, source_export_id, source_export_sha256 FROM legacy_import_batches ORDER BY id DESC LIMIT 5;"

npx wrangler d1 execute PREVIEW_DB --remote --config wrangler.preview-migrations.jsonc \
  --command "SELECT corpus_role, visibility, knowledge_eligible, COUNT(*) AS n FROM legacy_documents GROUP BY corpus_role, visibility, knowledge_eligible ORDER BY corpus_role;"
```

Do not mark a batch production-ready merely because the SQL executed successfully.

### Phase 5 — case-law bridge and official-source binding

Paragraf case-law is a licensed-secondary discovery layer. Build the governed case-law package and the official-source binding queue:

```bash
node scripts/paragraf-case-law-bridge.mjs normalized.ndjson /tmp/paragraf-cases.ndjson

node scripts/case-law-ndjson-to-sql.mjs \
  /tmp/paragraf-cases.ndjson \
  /tmp/paragraf-cases-staging.sql

node scripts/paragraf-case-law-binding-queue.mjs \
  /tmp/paragraf-cases.ndjson \
  /tmp/paragraf-binding-queue.ndjson
```

The bridge preserves, where supplied:

- Paragraf legacy ID;
- product lineage (Lex / Nova / LexAI);
- court;
- case number;
- decision date;
- legal area;
- source URL and SHA-256;
- official identifiers such as domestic case number, ECLI, CELEX or HUDOC/application number;
- authority metadata, summaries and holdings.

The binding queue marks every case `binding_status=pending` and `human_review_status=pending`. Records with a usable official identifier are labelled `identifier_ready`; weaker records are labelled `metadata_search_required`.

For every case-law record where possible:

- Macedonian courts: bind by case number/court/date to the official court source;
- ECHR: bind by application number + HUDOC item;
- EU: bind by ECLI/CELEX/InfoCuria;
- preserve Paragraf as provenance/discovery source, not controlling authority.

The dedicated case-law importer keeps Paragraf records `licensed_secondary`, `discovery_only=1`, and Human Gate pending until official binding and review. If an export record lacks a direct Paragraf URL, the bridge uses the Paragraf root only as a secondary-source locator; that does not count as official binding.

### Phase 6 — parity audit

Generate a machine-readable parity report after normalization and binding-queue generation:

```bash
node scripts/paragraf-parity-audit.mjs \
  normalized.ndjson \
  /tmp/paragraf-binding-queue.ndjson \
  /tmp/paragraf-parity-report.json
```

The audit fails closed on hard mismatches and checks:

- total normalized record count against the manifest;
- expected counts by material class;
- missing or malformed source SHA-256 values;
- duplicate legacy IDs and duplicate source fingerprints (surfaced as warnings for review);
- private/account/billing knowledge-eligibility violations;
- case-law count against the official-source binding queue;
- binding queue fail-closed state (`binding_status=pending`, `human_review_status=pending`).

The report always records `production_promotion_authorized=false`. A passing parity audit is necessary but not sufficient for production promotion.

Also compare source vs staging operationally:

- files without metadata;
- metadata without files;
- encoding failures;
- rejected credential/session material;
- unbound case law;
- any documented exclusions from the authoritative source package.

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

Use the provider's official recovery route. Provider-mediated identity/ownership verification is required. Do not attempt technical bypasses. Once an authoritative backup/export is supplied, preserve it unchanged and begin at Phase 0.

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
