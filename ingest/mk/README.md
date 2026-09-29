# North Macedonia legal corpus ingestion

This pipeline is **staging-first** and **public-source only**.

## Flow

1. Obtain a publicly accessible official legal text.
2. Preserve the original source URL and calculate SHA-256 for the exact source file.
3. Extract text without changing legal content.
4. Prepare metadata JSON.
5. Parse to article-level NDJSON.
6. Review parser warnings.
7. Convert NDJSON to SQL.
8. Import only into staging D1.
9. Sample-check article boundaries, dates and provenance.
10. Promote to production only after Human Gate.

## Commands

```bash
node scripts/parse-mk-legal-text.mjs input.txt metadata.json output.ndjson
node scripts/legal-ndjson-to-sql.mjs output.ndjson output.sql
node --test scripts/test-legal-parser.mjs
```

## Non-negotiable rules

- Never scrape or bypass subscriber-only material.
- Never mark automatically assembled text as current/consolidated without version verification.
- One authoritative retrieval chunk = one article.
- Preserve paragraph/item structure below the article.
- Preserve exact source URL, Gazette issue/date and SHA-256.
- If extraction is OCR-derived, mark it and require Human Gate.
- A new amendment invalidates the affected article's current-version status until re-reviewed.
