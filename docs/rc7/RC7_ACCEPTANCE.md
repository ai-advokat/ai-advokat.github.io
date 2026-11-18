# AI ADVOKAT RC7 — controlled integration / legal gate

**Date:** 2026-11-18. **Status:** REVIEW-ONLY INTEGRATION CANDIDATE. **Release:** NO-GO.

## Authority and baseline

- Owner: attorney Zoran Stojankich; technical coordinator: Sande Smiljanov.
- Explicit mandate: RC7 integration branch and candidate tests ONLY; NO merge into `main`, NO staging activation, NO production release.
- Verified GitHub `main` HEAD at start: `c5e07e37e38cba246a6ac1ed7c3dc6b651837160`. Pin the branch exactly here. If `main` changes, record drift; do not silently rebase.
- Reference PR #716 head: `a718dee62e470641baef1943f6a2693e5b9ad9fa` (Draft, not merged). Its four files are cherry-picked as source candidates, not merged by commit.
- RC6 source: SHA-256 `821830f250020ef2d6af25d2d3a841bb54dc93612d390b215f773596f291130a`.
- FAST36 / RC2 comparison archive: SHA-256 `8e6a780775f9f79d3458ae66b39dd69016bea3f91fe78f074b90cf30c085433d`.

## Baseline Integrity

One review-only branch rooted at the exact pinned SHA. Source-only additive files; no `src/index.js`, live bot UI, routes, migrations, build deployments, model configuration, payment providers or baseline legalSources rewritten. The GitHub Actions CI gate must `git merge-base`-verify the pinned parent and allowlisted delta (see `scripts/rc7-integrity-check.mjs`). Full snapshot is checked out inside GitHub Actions; earlier local audit could not independently verify all repository files.

## A3.19 Reconciliation

The original RC6 `src/experimental/rc4/a319-held-corpus-discovery.mjs` SHA-256 `838b459a660eac400586e2b2692228359eabe7e3755d5c4adddc20ccae0a135e` is **exactly identical in bytes** to the extracted RC2 algorithm (`src/a319-held-corpus-discovery.js`), but resided at a second path. RC7 **replaces the duplicated algorithm** with a re-export compatibility module: one authoritative implementation (`src/a319-held-corpus-discovery.js` from PR #716, Git blob `e4d6cad998582675b0cc2f116958a2e9ad26a749`), plus stable import path for RC4.

The bridge and response-integrity tests from RC6 stay isolated. Direct `retrieveA319` may return raw held content when passed a corpus; it MUST NEVER be exposed through any public route, worker import, model context or legal citation without attorney item-level approval. No raw statutory corpus or original PDFs are added.

## Regression Evidence

- A3.19 exact article numbers and lettered references; reject `101→10`, `34-г→34`, malformed/mixed references.
- 53 synthetic units validated with SHA-256 and status `LEGAL_HOLD`, `PENDING`, forbidden for AI citation.
- Preserves independent `legalSources`, `legalSourceVerification`, answer and input object immutability.
- Rejects synthetic/mock/quota-rejected provider envelopes; test harness does not connect to Cloudflare, OpenAI or staging.
- RC4 offline Node tests; RC6 Python private-UAT synthetic tests; standalone RC7 reconciliation tests.
- Full main-repo CI/security checks must be reported against **exact RC7 head**; prior RC6 63/63 is historical reference, not RC7 PASS.

## Release Gate — attorney Human Gate

**Decision at integration preparation: NO-GO for merge, staging and production.** All **53 statutory entries are LEGAL_HOLD** pending Zoran's independent legal validity, textual amendment and rights/republication review. Provider usage incidents are separate (Cloudflare daily free capacity and OpenAI project spend cap); successful source CI does not prove live chatbot acceptance. An isolated code review candidate is not a published AI law service.

Owner review must include exact commit SHA, complete code diff, SHA-256 manifest, automated/safety CI results, residual risks, and a new explicit written approval before any consequential merge or activation. Rollback: delete/revert only RC7 additive review branch; no data migration or production rollback required because none is authorized.

## GitHub candidate scope limitation

The GitHub review branch carries the A3.19 and RC4 JS reconciliation modules, Node regressions, and pinned-baseline SHA-256 gate only. The offline Python private-UAT harness and its 20-scenario manifest are available in the separately supplied local RC7 ZIP but **are not in this GitHub branch**. The external intake of that archival manifest was not accepted; it is not represented as committed or tested on GitHub. Python 7/7 PASS is local-package evidence only, not exact-head GitHub evidence. This is an explicit release blocker, not a reason to weaken the code gate.
