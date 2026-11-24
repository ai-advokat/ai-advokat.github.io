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
