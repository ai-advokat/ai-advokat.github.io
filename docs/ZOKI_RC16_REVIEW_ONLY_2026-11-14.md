# ZOKI / PARAGRAF RC16 — Review-only navigation intake (2026-11-14)

## Mandate / restriction
Integrate a shared, informational review-only waypoint across AI Advokat surfaces, without bundling or running third-party RC16 code or legal content. Existing Consolidator v10.4 remains the functioning production candidate. RC16 remains private.

## Grounded source
User-supplied private archive `10-КОНСОЛИДАТОР.7z`, RC16 nested ZIP, `REPORT/RC16_STATUS.json`, `EVIDENCE/RC16_SOURCE_REQUIREMENTS.json`, `README_RC16.txt`.
RC16 self-report: 185 reported test passes; browser E2E NOT_TESTED; HG11/HG35 OPEN; release NO_GO; production NO_GO.
Original RC16 intake had no authenticated 101/2019, 194/2024 BPP official source PDFs and no validated ZPP 151/2026 archived copy. **Update 14 Nov 2026:** Zoki provided three readable original Gazette PDFs. Their exact 64-character SHA-256 fingerprints have been independently computed; they are registered only as metadata in `data/zoki-rc16-official-source-evidence-2026-11-14.json`. All original PDFs, source excerpts, machine text and article-to-page maps are stored in a **private conversation handoff ZIP**, not the public repository. Structural checks: 2019 BPP 50 original articles + 2024 three inserted 34-а/34-б/34-в = 53 candidate article headings; 2026 new ZPP 519 sequential headings. **No clause-by-clause independent legal consolidation, copyright clearance, applicability sign-off or source publication approval.** The 53-article BPP candidate is **not independently validated** as a legally accurate consolidated text. Structural article counting is only an intake prerequisite, not legal certification.

## Architectural boundary
- New static no-script page `/consolidator/zoki-rc16-review.html`, CSP `connect-src 'none'`, no uploads, client data, provider calls or D1.
- Navigation links from root, external bot, existing Consolidator, AI Contract PRO and Contract Intelligence.
- No transfer of private ZIP, RC16 source, PDFs, client matter, secret, or legal corpus into public GitHub.
- No replacement of v10.4, no migration, no cloud billing.
- This PR is DRAFT; do not merge into `main` without independent checks and explicit confirmation that GitHub/Cloudflare automatic deploy hooks are safely gated. PR #689 RC84 / #686 R22 / #684 R20 remain separate and may need conflict reconciliation.

## Required acceptance evidence
1. CI and security checks pass on exact HEAD.
2. UI navigation and same-origin preview routes independently tested.
3. External legal review checks full source/version chain and publisher rights.
4. Explicit Human Gate for merge and separate Human Gate for production; legal approval is per instrument/article.
5. Rollback: revert only this navigation PR; no D1 rollback.

Status: REVIEW-ONLY CANDIDATE / NOT LEGALLY APPROVED / NOT PRODUCTION DEPLOYED.

## Received source package — addendum (14 Nov 2026)

- Original Gazette 101/2019 SHA-256: `028f63f0a07393c464941a0069cb9e0d51e02ade8caf856ed7bc280d47f21568`; BPP Macedonian part: original PDF pages 92–105.
- Original Gazette 194/2024 SHA-256: `38d7391de8ab33d6f3a1936b52cdf2eea13d8080063463282df0b87f3e4951aa`; BPP amendment: original PDF page 3; replaces Article 13(6) wording and inserts 34-а/б/в.
- New ZPP 151/2026 SHA-256: `8312c7b3a1c7d9f59d73d48ffddd820b1aa0774a7f5e4afb7515819d6be49553`; 123 PDF pages, 519 article headings. 2026 new-law Article 184 is NOT the current applicable old ZPP Article 184 for the 2026 live `zoki-test15` case.
- LDBIS reports new ZPP application 18 Jan 2027 and old ZPP termination the same day; secondary legal commentary also gives 16 Jan 2027. **Do not override the existing vetted ZPP timeline or enable a new date switch without explicit lawyer review.** Articles 517–519 govern the transition, and Article 103 has a longer exception.
- Local-source conversion in the previous v10.4 UI and Worker returned only the first 180,000 characters. This branch now preserves up to 750,000 characters and reports an explicit 413 if the source is larger; this change is **candidate code only**, not a verified live legal import.
- Distinct law families require separate consolidator sessions: BPP 2019+2024 as base+amendment; 2026 ZPP separately as new/future source; no cross-law merge.
- The current old-ZPP source corpus chain 7/2011+124/2015 remains unresolved, as do HG11/HG35. Source upload does not remove LEGAL NO-GO.
