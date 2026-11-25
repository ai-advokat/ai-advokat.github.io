# OIC-2 TASK REGISTER v1.0
Date: 2026-11-24. Owner labels: LEGAL = lawyer workflow team; INFRA = Worker/infrastructure team; JOINT = joint review. Status is not a release authorization. Dependencies use task IDs.

| ID | Phase | Owner | Work / reuse | Depends | Status | Required evidence |
|---|---|---|---|---|---|---|
| OIC-00 | I/II | INFRA | Pin main, existing branch, single plan/contract | — | BASELINE SOURCE VERIFIED | GitHub ref, source links; verify documentation commit after write |
| OIC-01 | I | LEGAL | Reuse CasePilot UI; multiple upload, status and error display | OIC-00 | OPEN | UI tests on v1 fixtures; no independent auth |
| OIC-02 | I | LEGAL | Synthetic decision + appeal, fact/locator matrix, legal issues and adverse arguments | OIC-00 | SCENARIO SPECIFIED; FILES PENDING | Lawyer-reviewed synthetic PDFs/DOCX + expected facts, hashes |
| OIC-03 | I | LEGAL | Appeal-response working draft structure and edit/diff/rollback UX; propose dedicated semantic draft type | OIC-02,OIC-04 | OPEN | Lawyer review and fixture tests; no false legal authority |
| OIC-04 | II | INFRA | Adapt DEV-C/D adapter to real IDs, raw upload, snake_case rows, strict envelopes, binary/JSON export; close all legacy imports/regressions | OIC-00 | OPEN | Source-aligned contract tests; reconcile two import failures and latest reported 18 legacy mismatches, not assumed disjoint |
| OIC-05 | II | INFRA | Reuse membership and caseWorkspaceAccess, strict owner/lawyer gates, authorization and hold policy | OIC-04 | OPEN | Local Worker cross-case/revoked/reviewer/hold negative tests |
| OIC-06 | II | INFRA | Private storage isolation, extraction, MK OCR, versioned source manifests, quotas | OIC-05 | OPEN | Local/provider synthetic benchmark; no paid activation without approval |
| OIC-07 | II | INFRA | Existing analysis/draft paths; versioned question and appeal response contract | OIC-04,OIC-06 | OPEN | Source-bound analysis and draft fixture; no invented law |
| OIC-08 | II | INFRA | Durable immutable revisions, unique CAS parent identity, rollback-as-new, epochs, idempotency | OIC-05,OIC-07 | OPEN | Local D1/Worker concurrency and crash tests; review-only SQL proposal |
| OIC-09 | II | INFRA | Extend existing Human Gate exact revision/snapshot/epoch binding, revocation and audit | OIC-08 | HOLD | Negative and positive synthetic tests under authorized policy, server actor |
| OIC-10 | I | LEGAL | Canonical pleading AST; editable DOCX and PDF layout, no reviewer annex leakage | OIC-03 | OPEN | Matched reference output and semantic parity checks |
| OIC-11 | II | INFRA | Existing case-export/other verified export engines; server-derived approved AST, receipt and artifact hashes | OIC-09,OIC-10 | HOLD | Working export tests, professional negative tests, exact approval parity |
| OIC-12 | III | JOINT | Integrated local Worker synthetic case and regression suite | OIC-01..11 | NOT TESTED | Single commit, local logs, two artifacts, acceptance matrix |
| OIC-13 | III | INFRA | Prepare isolated HTTPS UAT prerequisites; D1/R2/permissions/Access/cost separation | OIC-12 | HOLD | Resource isolation proof and explicit environment authorization |
| OIC-14 | III | JOINT | Authorized synthetic HTTPS UAT and lawyer sign-off | OIC-13 | HOLD | E2E proof; separate release decision required |

Historical claims/reference evidence: DEV-D and DEV-C 20/20 and 33/33 special tests, two inherited import failures; later revision-gate 22/22 local; Atomic Gate Preflight report 128/128 local (103 inherited + 25 new), 18 historical legacy mismatches remain reported. These are prior candidate evidence, not integrated Worker PASS. Preserve original archives and rerun applicable tests against candidate pin; no totals across overlapping suites. The 0033/0034/0035/0049 migration review remains open. No code changes, PR, merge, remote operations or approval are authorized by this register.

Update rule: never replace an OPEN/HOLD with PASS without immutable commit, precise test command, logs/artifact hashes, environment, and assigned reviewer. A failed test is not deleted; close with corrective evidence.

## 24 November 2026 — RAPID 07 / P16 / P02 integration update
Exact supplied P16+P02 source changes reconstructed on the pinned main, 17 pre/post blob transitions validated across 13 final files. Candidate tree matches supplied P02 tree `fb6f85b022684b13c38b89b6fa720955213029cd`. See [integration evidence](RAPID07_P16_P02_INTEGRATION.md). Candidate is prepared for a single draft PR, not merged or deployed.
- OIC-01/OIC-03: candidate existing CasePilot editor, working response and save/history/rollback wired into Worker routes. Owner-reported RAPID 07 6/6; candidate browser results supplied. Independent browser rerun pending.
- OIC-02: supplied synthetic decision-digital + appeal-scanned files; mapping to canonical case fixture and legal review pending.
- OIC-04: RAPID handoff adapter independently rerun 31/31 local mock tests. Historical DEV-C failures/18 mismatches remain open until reconciled; not necessarily the same suite.
- OIC-07/OIC-08: P16/P02 working response and server revision code reconstructed exactly. Real provider OCR/AI, atomic authorization/snapshot persistence, retention and real R2 not verified.
- OIC-10/OIC-11: working DOCX/PDF only, local browser rendering after server preflight. Professional mode and exact approval remain HOLD.
- OIC-12: supplier reports 2,217/2,217 local tests and 7/7 browser checks on exact candidate tree. Independent full checkout/build blocked by DNS in review container. No integrated live test.
All existing OPEN/HOLD tasks remain open where the full acceptance evidence is missing. No migration execution, staging activation, paid provider activation, merge or production.

## 25 November 2026 — incremental independent verification
OIC-06/A03: both SIM-24/26 PDF inputs independently verified, parsed/OCR and normalized text matches; configured Worker OCR still unverified. TEST-P16/26 is a distinct fixture, exact input PDFs still needed. OIC-08/A06: 9/9 new independent module-only regression tests (see acceptance evidence and test/revision-helper-independent.test.mjs); persistent CAS, real concurrent Worker, rollback endpoint and atomic source/authorization checks remain OPEN. OIC-09/OIC-11: HOLD unchanged; legacy approval/export path requires exact-revision release guard before merge. No runtime changes, no remote migrations or deployment. Continue on PR #739 only.

## 25 November 2026 — legal act heading correction
OIC-03/OIC-07/OIC-10/A05/A09: corrective source candidate implemented; helper 14/14 independently verified, lawyer and integrated runtime acceptance HOLD. Preserve existing source assertions; no auto rewrite of old revision. OIC-09/OIC-11 exact revision professional approval and claim-to-source navigation remain OPEN/HOLD. See acceptance matrix. Newer supplier P02 working-export archive includes additional comparison/export commits not included in b7c4670; do not reapply the first two commits or overwrite this correction. Reconcile the new two commits separately with exact-revision guards and test evidence.

## 25 November 2026 — package dependency correction
OIC-03/OIC-10/A05/A09: lawyer reports LOCAL PASS on 4db93ea for both act identities and HTTP 422 mismatch. OIC-04/OIC-12/A10: independently derived explicit public-module packaging correction for Cloudflare/Pages and regression checks; supplied 2,246/2,246 result not independently reproduced. Full suite, deployed asset parity, source navigation and exact-revision Human Gate remain OPEN/HOLD. No new deployment permission.

## 25 November 2026 — reconstructed evidence navigation
OIC-03/OIC-07/A04-A06: source candidate for exact saved response evidence lookup; 7/7 independent helper tests. Original supplier patch missing; 10/10 Chromium reported on unavailable working copy. Full local Worker and browser acceptance on exact new commit pending. OIC-09/OIC-11: exact revision/authority approval and professional release remain HOLD; no online activation, migration or merge.
