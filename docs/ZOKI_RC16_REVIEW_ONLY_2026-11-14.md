# ZOKI / PARAGRAF RC16 — Review-only navigation intake (2026-11-14)

## Mandate / restriction
Integrate a shared, informational review-only waypoint across AI Advokat surfaces, without bundling or running third-party RC16 code or legal content. Existing Consolidator v10.4 remains the functioning production candidate. RC16 remains private.

## Grounded source
User-supplied private archive `10-КОНСОЛИДАТОР.7z`, RC16 nested ZIP, `REPORT/RC16_STATUS.json`, `EVIDENCE/RC16_SOURCE_REQUIREMENTS.json`, `README_RC16.txt`.
RC16 self-report: 185 reported test passes; browser E2E NOT_TESTED; HG11/HG35 OPEN; release NO_GO; production NO_GO.
101/2019 and 194/2024 BPP original official source PDFs absent; ZPP 151/2026 archived copy provenance unverified. The 53-article BPP candidate not independently validated.

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
