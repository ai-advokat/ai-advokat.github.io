# AI Advokat — 38 Practical Guides public experience implementation

**Date:** 4 October 2026  
**Scope:** exactly the 38 previously approved public catalogue metadata records  
**Status:** implementation candidate; merge remains a separate decision

## Implemented public experience

All 38 approved catalogue records now receive a governed public metadata route through:

`/guides/record.html?id={record_id}`

The catalogue includes:
- full-text search across title/category/scope/guide number/edition;
- category filter;
- legal-review status filter;
- sorting by guide number, title, category or date;
- exact live result count;
- Human Gate badge on every card;
- individual detailed record view;
- full SHA-256 fingerprint;
- attribution and source filename;
- supersedes / superseded-by navigation where applicable;
- provenance details where present;
- related guides from the same category;
- permanent share/copy link;
- print-friendly metadata record;
- schema.org CreativeWork metadata generated from the governed record.

## Scope protection

This implementation does **not** expand the existing Human Gate decision.

- Public catalogue scope remains exactly **38 records**.
- Administrative V2 remains record 39, `catalog_public:false`, and receives no public detail route.
- Public PDF/DOCX downloads remain **0**.
- RAG eligibility remains **false**.
- Production corpus write remains **false**.
- Legal-corpus promotion remains **false**.
- Per-guide legal review states are preserved exactly as registered.

## Why metadata-only

The repository has governed metadata and audit state for all 38 public records, but public release of each source document remains separately Human-Gated. The UI therefore exposes the complete controlled bibliographic/provenance record without implying that the underlying document has been legally cleared for public download or professional reliance.

## Verification target

The deterministic Guides test suite now asserts:
1. exactly 38 public records have governed public detail routes;
2. Administrative V2 has none;
3. the detail route is metadata-only and fail-closed;
4. the catalogue exposes search, sort, detail links and Human Gate badges;
5. no document/RAG/production/legal-corpus gate is opened by this implementation.
