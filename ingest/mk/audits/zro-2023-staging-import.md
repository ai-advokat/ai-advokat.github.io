# ZRO 2023 Historical Snapshot — Staging Import Audit

Date: 2026-09-29
Instrument key: `mk:zro`
Environment: **staging only**

## Source
- Title: Закон за работните односи
- Snapshot: official consolidated text through Official Gazette 111/2023
- Government source: https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf
- PDF pages: 108
- SHA-256: `f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655`

## Extraction
- Raw PDF text extraction: pdftotext layout mode
- Main-law boundary: through Article 273
- Amendment appendix: truncated from authoritative base-law article parse
- Parsed article records: **298**
- Duplicate article headers: **0**
- Parser warnings: **0**
- Parser: `mk-legal-article-v0.2.0`

## Staging D1
- Target binding: `PREVIEW_DB`
- Database: `ai-advokat-db-staging`
- Database ID: `eb560e98-9fc0-408e-9c81-9b823ffde44d`
- Workflow run: `36639450857`

Post-import verification:
- article_count: **298**
- status = `historical`: **298**
- human_review_status = `pending`: **298**
- status = `current_consolidated`: **0**
- ingest warning_count: **0**
- ingest status: `validated`

Run key:
`legal:mk:zro:official-consolidated-snapshot-2023-111:f0b178227052c960`

## Safety conclusion
- Production D1 was not targeted.
- No article has been promoted to current law.
- Human Gate remains pending for all 298 article records.
- The snapshot is historical and must not be used as the controlling 2026 text without resolving later amendments and Constitutional Court effects.

## Next version work
Resolve, parse and review:
- Official Gazette 39/2025
- Official Gazette 74/2025
- Official Gazette 124/2025
- relevant Constitutional Court effects

Only affected articles may advance through `VERSION_REVIEW_REQUIRED` toward a verified current version.
