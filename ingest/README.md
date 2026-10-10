# AI Advokat public-corpus intake

These CSV files are templates for verified public legal information only.

Rules:
- Never place client secrets, privileged communications, health data, identity documents, or confidential evidence here.
- Verify every source against the current primary source before import.
- Mark draft or uncertain material conservatively.
- Load and test changes in the staging D1 database first.
- Human legal review is required before professional reliance or publication.


## Case-law bulk intake

Use `scripts/case-law-ndjson-to-sql.mjs` only for:

1. **official_public** — publicly available decisions/metadata from an approved official court source (North Macedonian courts, Constitutional/Supreme Court, HUDOC, InfoCuria); or
2. **licensed_secondary_export** — a separately authorised export lawfully supplied by the rights holder or licensed user, currently including Paragraf.mk exports.

Hard rules:

- Never put passwords, cookies, session IDs, bearer tokens, API keys or other credentials in an import file.
- Never use the importer to bypass a login, subscription, paywall, CAPTCHA or access control.
- A Paragraf/Lex/Nova/LexAI export is **secondary discovery material**, not an official judgment source by itself.
- Every imported case, authority classification and holding is forced to `human_review_status='pending'`.
- GPT legal synthesis only receives case-law records after independent official-source binding and reviewed/approved Human Gate status.
- Preserve the original source URL and a SHA-256 fingerprint for every imported record.
- Import first into staging D1. Production promotion requires a separate reviewed corpus/schema action and must never be inferred from file possession.
- Check supporting, adverse and distinguishing authority; do not build a one-sided precedent set.

Example format: `ingest/case_law.ndjson.example`.

Generate staging SQL:

```bash
node scripts/case-law-ndjson-to-sql.mjs ingest/cases.ndjson /tmp/cases.sql
```

The generated SQL is staging material. Generation does not authorize production import or professional reliance.


### Paragraf Lex / Nova / LexAI

If a lawful Paragraf export is later supplied, preserve the originating product as `source_product` (`Lex`, `Nova` or `LexAI`) and any platform identifier as `external_ids.paragraf_legacy_id`.

The import remains `licensed_secondary` with `discovery_only=1`. It is not eligible for governed GPT case-law context until the underlying decision is independently bound to an official court/HUDOC/CURIA/EUR-Lex source and reviewed under Human Gate.

### Official identifiers

Prefer stable identifiers whenever available:

- Macedonian domestic case number / Constitutional Court reference;
- ECHR application number + HUDOC item id;
- EU ECLI + CELEX + CJEU case number.

These identifiers are used for deduplication across official and licensed-secondary discovery records.
