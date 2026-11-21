# Zoki 3-law source library: source-text implementation (14 November 2026)

**Release scope:** `/official-law-library.html` plus original-Služben-Vesnik page-transcription chunks and a browsable article index. **Not a certified consolidated text, current-law promotion, D1 migration or production release.**

## User authorization and primary evidence

On 14 November 2026 user explicitly authorised implementation on the basis of the official Gazette source. This authorises adding the **three published texts as source-referenced research material** to the draft candidate. It does not certify that a mechanically consolidated statute is complete, nor overrule the legal temporal status. Do not treat an API deployment as explicitly authorized based only on that instruction.

Original source PDFs received via user-provided archive in conversation:
- Gazette **101/2019** (source PDF 120 pages, relevant MK base law pages **92–105**, article headings **1–50**, sha256 `028f63f0a07393c464941a0069cb9e0d51e02ade8caf856ed7bc280d47f21568`).
- Gazette **194/2024** (source PDF 144 pages, relevant MK amendment page **3**, BPP Article 13(6) amendment + inserts **34-а/34-б/34-в**, sha256 `38d7391de8ab33d6f3a1936b52cdf2eea13d8080063463282df0b87f3e4951aa`).
- Gazette **151/2026** (123 pages, new ZPP **519** headings, sha256 `8312c7b3a1c7d9f59d73d48ffddd820b1aa0774a7f5e4afb7515819d6be49553`).

Unlike the previous review-only-only RC16 page, this feature actually commits all relevant extracted PDF **page transcriptions** to the GitHub RC branch, with source IDs and PDF fingerprints, and provides a usable searchable read-only interface. Original official PDF bytes remain in private handoff, not in the public repo.

All page text is **machine extracted** and for research/cross-checking. Two-column Gazette pages 92–105 and 3 may interleave lines in the plain-text extraction, so no article-level normalized BPP citation or updated 53-article consolidated text can be claimed from those display chunks. The original PDF page is the controlling source. Statutory original texts are not the same thing as independently edited/consolidated collections.

## Implementation

- `data/official-law-texts/manifest.json`: each instrument, exact Gazette issue, original SHA-256 and LDBIS link, explicit version/application status.
- `data/official-law-texts/mk-bpp-101-2019-pages-*.json`: 14 relevant original-Gazette pages.
- `data/official-law-texts/mk-bpp-amend-194-2024-pages-*.json`: 1 original-Gazette page.
- `data/official-law-texts/zpp-151-2026-pages-*.json`: complete 123-page new-law source text.
- `data/official-law-texts/zpp-151-2026-article-index.json`: independent check 519/519 contiguous headings, with exact document PDF pages (e.g., Article 184 is page 47; Article 519 page 123).
- `official-law-library.html` + `assets/official-law-library.mjs` + `assets/official-law-library.css`: static accessible same-origin browser viewer, phrase / article / PDF-page search, visible provenance, copy citation or page text with qualification, no API/auth/DB writes.
- Links added from AI Contract PRO, Quick Contract Review, Consolidator v10.4, internal home and external bot.
- The existing v10.4 source import and output editor remain separate. This library is a read-only legal SOURCE aid, not the canonical D1 active legal corpus.

## Temporal/version safety

The new ZPP 151/2026 was promulgated on 8 July 2026, entered into force 16 July 2026. Official Ministry of Justice LDBIS lists application 18 January 2027; secondary practitioner sources sometimes state 16 January. The text of Article 519 provides general six-month delay and Article 103 eighteen-month exception. No automatic date-based current-law promotion; the existing source-of-truth ZPP timeline is not overwritten. The 2005–2015 applicable ZPP and 2026 Article 184 are **distinct**. Ongoing cases can have transitional provisions (Articles 517–518).

The BPP 101/2019 + amendment 194/2024 are intentionally shown separately, not as an authorized 53-article consolidation. 53 is a structural count only.

## Verification and acceptance

- Confirm source manifest and 16 JSON chunks cover exactly 14 + 1 + 123 pages with correct original document SHA-256 and without truncation/omission; `node --test test/official-law-library.test.mjs`.
- Confirm new ZPP 519 headings map bijectively to PDF pages and original source text; `node --test test/official-law-library.test.mjs`.
- Confirm navigation from all five site surfaces.
- Check static JS syntax and no unsanitized source HTML insertion; user content never leaves browser.
- **Browser/UI E2E still NOT TESTED** until Cloudflare preview deployment on exact HEAD has finished and interactive browser inspection completed. GitHub unit tests do not substitute for manual/browser acceptance.
- **Legal BPP consolidation certification NOT DONE**; no 53-article amended text is promoted.
- **Production deployment NOT DONE**; PR remains Draft. The native Cloudflare Git integration is independent from GitHub environment protections and still requires specific release planning. Tests passing does not approve production.
- **No customer files, secrets, bank data, or real case content** in source chunks.

## User workflow

1. Open the proposed `/official-law-library.html` page in the PR branch Preview when the exact-head deployment is verified.
2. Select Gazette 101/2019 (base BPP), 194/2024 (BPP amendment), or 151/2026 (future ZPP).
3. Search a word or choose `член 184` with ZPP 151/2026 to jump to PDF page 47.
4. Copy a **qualified citation** and compare the displayed machine text with the original PDF source. Use the citation for AI Contract research, never as automated legal approval.
5. Use original PDFs and Zoki's private source pack for the controlled Consolidator session and manual BPP 2019+2024 amendment verification. New ZPP is a separate instrument.

## Human Gate and rollback

- User's implementation authorization is recorded; no unilateral merge, content-as-current-law activation, or Cloudflare production release.
- To remove the read-only library, revert the feature's files/link additions in the PR branch and verify versioned preview deployment. No database migrations or secrets involved.
- Preserve private source pack for evidentiary traceability.
