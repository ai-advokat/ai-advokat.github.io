# AI Advokat legal chunking specification

Version: 0.1
Scope: Official Gazette public corpus

## Canonical hierarchy

Every legal text is normalized into this hierarchy:

1. legal_instrument
2. instrument_version
3. article
4. paragraph
5. item / subitem / indent when explicitly numbered or lettered

The primary retrieval unit is the **article**. Paragraphs/items are addressable sub-units, not independent legal instruments.

## Required identifiers

Each article receives a deterministic canonical key:

`MK:<instrument-id>:<version-date>:ART:<article-number>`

Examples:
- `MK:KZ:2026-01-15:ART:288`
- `MK:ZKP:2025-11-03:ART:300-a`

Paragraph/item suffixes:
- `:P:2`
- `:ITEM:3`
- `:SUBITEM:b`

No identifier is generated from page position alone.

## Article record

Each article record must contain:

- instrument_id
- instrument_title
- version_id
- version_effective_from
- version_effective_to (nullable)
- article_number
- article_heading (nullable)
- article_text
- paragraph_count
- source_issue_number
- source_issue_date
- source_pdf_url
- source_page_start
- source_page_end
- source_page_label where available
- source_sha256
- extraction_method
- extraction_confidence
- human_review_status
- supersedes_article_id (nullable)
- superseded_by_article_id (nullable)
- captured_at

## Paragraph structure

Article text is additionally segmented into ordered paragraphs:

```json
{
  "article_number": "288",
  "paragraphs": [
    {
      "paragraph_number": "1",
      "text": "...",
      "items": []
    },
    {
      "paragraph_number": "2",
      "text": "...",
      "items": [
        {"item_number": "1", "text": "..."},
        {"item_number": "2", "text": "..."}
      ]
    }
  ]
}
```

The original full article text is always retained so paragraph segmentation never destroys source context.

## Chunking rules

1. Never split an article across retrieval chunks unless it exceeds the technical size ceiling.
2. Never merge two different articles into one chunk.
3. Article number and heading are stored separately from body text.
4. Footnotes/endnotes are not silently merged into article text.
5. Amendment instructions ("во член 25 зборовите...") are stored as amendment events and are NOT automatically treated as consolidated text.
6. Renumbered articles keep provenance links to the source amendment event.
7. Deleted articles remain in version history and are marked repealed/deleted, never physically removed.
8. New article numbers such as 25-a, 25-б, 25-а are preserved exactly as printed, plus a normalized search key.
9. OCR-derived text is never marked authoritative without Human Gate verification.
10. Every answerable chunk must point back to the exact official source PDF and page range.

## Retrieval policy

Search ranking:
1. current verified article version
2. current official source metadata
3. earlier verified article versions
4. amendment event
5. secondary commentary

The bot must cite the article number and official source. If the current consolidated version is uncertain, return an explicit version warning rather than infer the law.

## Version assembly

A consolidated article version may be generated only when:
- base article is verified,
- every relevant amendment event is present,
- amendment order is deterministic,
- effective dates are known,
- no unresolved conflicting amendment exists.

Otherwise status = `needs_version_review`.

## Storage targets

D1:
- instruments
- versions
- articles
- article_paragraphs
- amendment_events
- provenance

R2:
- original public PDF files where permitted and intentionally mirrored
- extraction artifacts

Vectorize:
- article-level embeddings only after Human Gate / provenance checks

## Human Gate

No article is labeled CURRENT/CONSOLIDATED solely because it was the latest crawled text.
