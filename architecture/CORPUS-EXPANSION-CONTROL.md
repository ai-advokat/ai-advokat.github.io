# AI Advokat — Corpus Expansion Control Plan
Date: 2026-10-02
Status: working control document
Owner: AI Advokat / Human Gate

## 1. Objective

Expand AI Advokat from the current article-level corpus into a broad North Macedonian legal corpus without weakening source provenance, version control, citation discipline, or the mandatory Human Gate.

The target is not "more text at any cost". The target is: every imported article is bound to exactly one instrument version, every version has verifiable provenance, and the assistant may answer only from retrieved material whose version can be resolved safely.

## 2. Current safe baseline

- D1 is the authoritative corpus store.
- /api/assistant is source-backed and quota protected.
- The citation guard rejects unsupported article citations.
- Corpus Safety Foundation migration 0023 requires a version for new article rows.
- ZRO, ZKP and ZI are legacy corpora imported before version binding and must be backfilled only after Human Gate review.
- New corpora must pass parser + validator + provenance + version checks before import.

## 3. Non-negotiable ingestion gate

A law may enter the searchable article-level corpus only after all of the following are true:

1. Canonical instrument identity established.
2. Official source URL recorded.
3. Source file/text SHA-256 recorded.
4. Gazette issue/date metadata recorded where available.
5. Version class assigned.
6. Validity/application dates recorded or explicitly marked unresolved.
7. Parser produces no structural STOP findings.
8. Validator returns PASS.
9. Lettered/repealed/transitional provisions are reconciled.
10. Human Gate approves the version for the claimed public status.
11. Import is executed against a version-bound instrument_version row.
12. Post-import counts and article-number integrity are checked.

If any item is unresolved, the corpus remains staged and the assistant must not represent it as current law.

## 4. Work order

### Phase A — repair the three legacy corpora
Priority A1: ZKP
Priority A2: ZRO
Priority A3: ZI

For each:
- identify the exact source snapshot previously imported;
- reconstruct source provenance;
- create the matching instrument_versions row;
- run duplicate/article-number audit;
- run version-window audit;
- only then backfill instrument_version_id;
- do not mark current_consolidated unless Human Gate approves the legal currency claim.

### Phase B — high-use procedural and professional laws
Create staged manifests and import only from official sources. Suggested operational order:
- Law on Civil Procedure
- Law on Enforcement
- Law on Notariat
- Law on Advocacy
- Law on Mediation
- Law on Administrative Disputes
- Law on General Administrative Procedure
- Law on Courts
- Law on Public Prosecution
- Law on Criminal Procedure amendments / current verified version lane

This is an engineering priority list, not a legal-status claim. Each instrument still requires source and currency verification.

### Phase C — substantive private/public law
Build the same gated lane for:
- Obligations
- Property and other real rights
- Family
- Inheritance
- Trade companies
- Labour relations
- Consumer protection
- Personal data protection
- Access to public information
- Misdemeanours
- Prevention of corruption / conflict of interests
- relevant tax and financial-crime instruments

### Phase D — secondary legislation and case-law linkage
Only after primary legislation coverage is stable:
- subordinate regulations;
- Constitutional Court decisions;
- Supreme Court / appellate / first-instance decision metadata where lawful and available;
- ECHR/HUDOC and EU source links.

## 5. Operational assistant rule

The assistant must continue to:
- require an instrument when a bare article number is ambiguous;
- resolve exactly one version per answer;
- refuse/return controlled version errors when currency is unresolved;
- cite only retrieved articles;
- clearly distinguish current, historical, preview and version-review material;
- never fabricate a DOI, case, article, gazette reference, amendment, or source.

## 6. Parallel-work ownership

### ChatGPT lane — DO NOT modify concurrently from another agent
- src/index.js
- src/corpus-versions.js
- src/security.js
- scripts/parse-mk-legal-text.mjs
- scripts/validate-legal-corpus.mjs
- scripts/legal-ndjson-to-sql.mjs
- migrations affecting legal corpus/versioning
- corpus manifests and article-level imports
- assistant routing/retrieval/citation guard
- D1 corpus migrations and production activation

### Claude lane — safe parallel scope
Claude may work on:
- public-facing UX copy and layout;
- membership page copy and non-secret client-side UX;
- publication/scholar presentation;
- accessibility and responsive design;
- SEO/schema.org metadata;
- documentation that does not change corpus semantics;
- static visual cleanup;
- user help/onboarding;
- non-corpus tests for UI regressions.

Claude must not change legal-corpus semantics, version resolution, assistant prompt boundaries, quota/security logic, D1 migrations, or article-level source data.

## 7. Branch discipline

- Corpus work uses dedicated branches and PR review.
- Never commit unverified legal text directly to main.
- Never mix a UI redesign with a corpus import in the same PR.
- One instrument/version per import PR where practicable.
- Every corpus PR must state source URL, source hash, version label, legal-status claim, validator result and Human Gate state.

## 8. Definition of "operational AI Advokat bot"

The bot is operational only when:
- the production Worker AI binding is deliberately enabled after cost/security approval;
- RATE_LIMIT_SALT is configured;
- D1 is reachable and schema-ready;
- assistant retrieval returns at least one eligible article;
- citation guard passes or the response falls back to retrieval-only;
- the UI accurately shows the live corpus coverage;
- production smoke tests confirm quota, version resolution, citation checking and fail-closed behaviour.

Until production AI binding is approved, the source-backed retrieval pipeline may be operational while generative synthesis remains intentionally gated.

## 9. Immediate next actions

1. Audit ZKP/ZRO/ZI legacy rows and determine their exact source/version provenance.
2. Prepare version-bound backfill migrations, one law at a time.
3. Add the next law only through a manifest + validator PASS.
4. Keep /api/capabilities as the public truth for corpus coverage.
5. Activate production AI only after the corpus and cost Human Gate are both satisfied.
