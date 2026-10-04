# AI Advokat — Guides Catalogue Normalisation V2

**Date:** 4 October 2026  
**Scope:** public catalogue structure and UX only; no substantive legal or authorship decision  
**Status:** historical catalogue-normalisation record

> **Status update — 4 October 2026:** This document records the earlier catalogue-normalisation pass. Its open Human Review Queue items were subsequently resolved through the approved Human Gate Pack 1–7, and Administrative V2.0 FINAL MASTER was later activated as the 39th public catalogue record. The underlying PDF/DOCX and AI/production gates remain separate and closed.

## Purpose

This pass addresses catalogue-level inconsistencies without changing the legal substance of any guide and without deciding disputed authorship/provenance questions.

## Implemented

1. Controlled top-level taxonomy: 12 source labels are mapped into 8 stable public categories while preserving each original source label as `category_original`.
2. Verification is no longer flattened into one “checked” bucket. The public catalogue distinguishes:
   - legal review pending;
   - sources checked;
   - specific source/deadline checked;
   - specific statutory provision checked;
   - base version legally reviewed;
   - editorial review;
   - archive.
3. Explicit related-guide links were added across series for the known overlapping topics:
   - Guide 02 ↔ Guide 45;
   - Guide 21 ↔ Guide 44;
   - Guide 17 ↔ Guides 41/42;
   - Guide 10 ↔ Guide 40;
   - Guide 26 ↔ Guides 53/54 and Administrative V1.
4. Public record URLs use readable stable slugs. Legacy `?id=` links remain accepted by the detail page but are no longer advertised or indexed.
5. Public pages no longer print raw machine IDs.
6. The detail page no longer hard-codes Zoran Stojankich as Schema.org author while authorship/editorial roles remain under review.
7. The 26 DOCX source records no longer display a fixed “3 pages” value; page count is not treated as a stable Word metadata field.
8. The FULL Word source-format wording is separated from the public guide type: public label = “Практичен водич”; DOCX remains visible only as source provenance.
9. Source ALL-CAPS titles are preserved in `title`, while a citizen-facing `display_title` is used in the catalogue.
10. The numbering gap is explained without inventing the status of absent numbers.
11. Citizen-facing language replaces unnecessary technical jargon such as “metadata”, “version history”, “reference-only”, “RAG” and “permanent link” in the main explanatory UX.
12. A visible catalogue build marker and `cache:"no-store"` data fetch were added to make stale live deployments/caches easier to diagnose.

## Explicitly NOT changed

The following remain in a separate Human Review Queue and are not resolved by this catalogue PR:

- consistency of the silence-of-administration warning for Guide 54, Guide 26 and Administrative V1;
- guide-level effect of the ZPP 151/2026 transition;
- identification of the statute behind Guide 05 Articles 18 and 22(4);
- exact SHA binding of the free-legal-aid legal review;
- authorship/editorial-role normalization;
- YUCOM provenance for Administrative V1/V2;
- Paragraf.mk / Lex AI branding decision.

See `data/guides-human-review-queue.json`.

## Gates

This pass does not authorize:
- a public DOCX/PDF;
- RAG / AI-corpus ingestion;
- production corpus write;
- legal-corpus promotion;
- legal approval of any guide;
- authorship change;
- provider activation.

Existing Human Gates remain independent and fail-closed.
