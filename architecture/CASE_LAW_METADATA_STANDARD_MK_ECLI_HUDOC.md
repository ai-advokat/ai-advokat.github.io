# AI Advokat case-law metadata profile: MK + ECLI + HUDOC

Status date: 2026-10-20

## Purpose

This profile governs metadata extracted from Macedonian judicial decisions before they can enter the AI Advokat Case Law corpus.

It combines three distinct layers and does not conflate them:

1. Macedonian publication/privacy review;
2. ECLI-compatible case-law metadata;
3. ECtHR/HUDOC interoperability metadata.

## 1. Macedonian publication/privacy layer

The processor records source provenance and flags material requiring Human Gate review, including:

- address / residence / seat fields;
- possible personal identifiers;
- possible legal-entity registry identifiers;
- witnesses, injured parties, minors and victims;
- party-identity fields.

The processor does not claim that automatic detection or redaction is legally sufficient.

The active review profile is:

`MK_CASE_PUBLICATION_ART9_POST_U5_2025`

This reflects the need to review Article 9 of the Law on Management of the Movement of Cases in the Courts after Constitutional Court decision U.br.5/2025 of 04.03.2026. The application must always be rechecked against the current consolidated law before public release.

## 2. ECLI layer

AI Advokat follows the five-part ECLI structure:

`ECLI : country : court : year : ordinal-number`

The domestic court code and ordinal number are never inferred by AI Advokat unless a competent national ECLI allocation scheme is officially verified.

Therefore:

- literal ECLI in a source may be preserved;
- verified official-registry ECLI may later be bound;
- a missing ECLI remains null;
- `generatedOfficialIdentifier=false`.

A Dublin Core-aligned working profile is populated independently of ECLI assignment:

- `dcterms:identifier` — source URL;
- `dcterms:isVersionOf` — literal/verified ECLI only;
- `dcterms:creator` — court;
- `dcterms:coverage` — MK;
- `dcterms:date` — ISO 8601 decision date;
- `dcterms:language` — mk;
- `dcterms:type` — judgment/ruling/decision/order/etc.;
- `dcterms:subject` — legal area and extracted legal references.

## 3. HUDOC / ECtHR interoperability layer

HUDOC metadata is stored separately from domestic identifiers. Supported interoperability fields include:

- case title;
- application number;
- respondent state;
- document type;
- date;
- importance;
- conclusion;
- Convention articles;
- keywords;
- domestic law;
- Strasbourg case-law;
- ECLI where present in the HUDOC/ECtHR source.

Domestic decisions may contain references to these fields, but AI Advokat does not pretend that a domestic decision is a HUDOC record.

## 4. Extended professional metadata

The governed processor also extracts working metadata useful for research and review:

- court and domestic case number;
- decision date and record kind;
- legal area;
- judge / reporting judge / panel signals;
- party roles (review-only);
- cited laws and articles;
- operative disposition;
- finality wording as stated in the source;
- dispute value and costs;
- criminal sanction wording;
- appeal/remedy wording and deadline;
- prior-decision references;
- ECtHR application numbers, HUDOC item IDs and Convention articles;
- SHA-256 source fingerprint;
- duplicate hash relationship;
- deterministic metadata completeness.

These fields are working metadata until Human Gate.

## 5. Direct Supreme Court intake

The direct pipeline is:

```
Supreme Court public portal
  -> bounded discovery (50 default / 100 max)
  -> robots + official-host check
  -> bounded retrieval after rights review
  -> SHA-256 + manifest
  -> HTML/text extraction
  -> case-law metadata processor
  -> privacy/publication review
  -> official source binding
  -> Human Gate
  -> Case Law corpus
```

Command:

```bash
node scripts/collect-and-stage-mk-supreme-decisions.mjs --limit 50 --dry-run
```

After a documented retrieval-rights review:

```bash
node scripts/collect-and-stage-mk-supreme-decisions.mjs \
  --limit 50 \
  --execute \
  --rights-review data/mk-supreme-rights-review.json
```

The GitHub workflow `Supreme Court case-law intake` provides the same 50/100 workflow through `workflow_dispatch`.

PDF/DOC/DOCX/RTF content is never decoded by pretending binary bytes are text. The direct intake uses deterministic extractors: Poppler `pdftotext` for PDF, ZIP/XML parsing for DOCX, `antiword` for legacy DOC and `unrtf` for RTF. If the required extractor is unavailable, fails, or returns no text, the record remains `needs_text_extraction` and cannot silently enter metadata staging.

## 6. Why the Industrial v5 prototype is not copied directly

The supplied Industrial v5 prototype contains useful metadata categories and UI ideas, but its unsafe assumptions are intentionally excluded from AI Advokat:

- generated domestic ECLI values;
- Word binary files read through `file.text()`;
- deterministic field presence presented as percentage accuracy;
- an offline claim while loading external CDN resources.

AI Advokat retains the useful metadata categories but routes them through provenance, standards separation and Human Gate.
