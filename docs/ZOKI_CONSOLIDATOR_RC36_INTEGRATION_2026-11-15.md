# AI Advokat · Zoki Consolidator RC36 bridge · technical integration register
Date: 2026-11-15
Status: DRAFT / REVIEW ONLY / NOT DEPLOYED TO PRODUCTION
Repository PR: #704 (based on #703, #702, #701)

## Mandate and source
Zoki supplied `10-1-КОНСОЛИДАТОР.zip` (221 entries, ZIP CRC PASS). This archive contains historical RC8–RC41 candidates. Source selected for the functional integration: `PARAGRAF_RC36_OFFLINE_INTEGRATED.zip`, which reports the RC36 archival integrity fix and still explicitly lists HG11/HG35 OPEN, Article 48 LEGAL HOLD and PRODUCTION NO-GO.

## Delivered in the existing product
1. Original `/consolidator/` Legal Formatter v10.4 remains present and unchanged at the core-engine layer.
2. Owner-supplied `RC8_CORE.js` is integrated into a **new panel of the same page** to perform exact replace/delete/insert-after operations. Every operation is checked for an exactly-once match; original provision is preserved.
3. User-entered publication / in-force / application / as-of date classification. No machine claim of legal effect.
4. Local SHA-256 of selected evidence file (browser only, no API call or upload).
5. Export and guarded reopen of technical-review JSON. Imported status may NOT claim approval, closed human gates or production go.
6. Both internal and external chat shells offer an optional one-question-at-a-time assistant prompt and a direct link back to the functional consolidator; no automatic API call or source promotion.
7. Synthetic QA fixture and browser tests cover successful editing, import/export, illegal approval tampering, invalid chronology, local SHA and two chat entry surfaces.

## Source and copyright isolation
No Paragraf PDFs, original Gazette documents, 53-article legal collection or client data are published by this PR. This bridge does not automatically import unlicensed or legally unreviewed corpora. Source metadata without independently verified authenticity cannot be promoted to current law.

## Explicit scope and limitations
This is an **RC36 controlled functional bridge**, not full transfer of every RC8–RC41 historical module. The RC8 exact-operation core is the only legacy module carried into the public candidate. The temporal classification is a deterministic preview based on dates the user enters, **not RC10–RC17 legal-source certification**. Full RC36 offline package is kept as a separate owner-held archive.
No D1 database schema changes, new Cloudflare model calls, subscription activation, signatures, bulk corpus ingestion or production deployment.
`HG11 = OPEN`, `HG35 = OPEN`, `ARTICLE_48 = LEGAL_HOLD`, `PRODUCTION = NO_GO` remain release blockers.
The existing v10.4 PDF/DOCX import uses its governed server endpoint; the **new SHA-only evidence upload** does not. In the owner offline package, choose TXT/MD for v10.4 imports without a live server.

## Acceptance / Human Gate
- Node full repository and security tests PASS on the exact latest GitHub commit.
- Independent Chromium regression on complete `/consolidator/` and bot entry surfaces PASS.
- Owner Zoki checks Windows/Edge local usability and official source provenance.
- Independent legal review verifies actual texts, amendments, deferred application, 53 articles and Article 48.
- Source publication rights are verified before distributing original third-party materials.
- Separate explicit approval needed before merging/deploying production.

## Rollback
Revert PR #704. The previous v10.4 and R25 chat code are not overwritten. No migration or secret changes.
