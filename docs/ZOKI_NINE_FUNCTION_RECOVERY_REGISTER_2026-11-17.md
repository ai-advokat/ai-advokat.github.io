# ZOKI AI ADVOKAT — nine-function recovery register
Date: 2026-11-17
Mode: RESCUE / REVIEW-ONLY
Basis: isolated R26 #705 commit c7d0737742f921bb42eb702733a8fd74f81f67f1
Owner release authority: Human Gate (no automatic merge/deploy)

## Scope, evidence and status
This branch integrates **verified source changes** for bounded external bot UI translation and timestamp-only GitHub Pages watcher churn. CI does source-level checks for nine user-important features. Source success does not prove real browser microphone permission, genuine paid or free AI translations, legal correctness, browser export output, or production deployment.

| Gate | User acceptance criterion | Source candidate | Evidence required beyond CI | Current release status |
| --- | --- | --- | --- | --- |
| 1 | EN→MK and MK→EN produce meaningful translated text; 33 UI targets handle quota and errors | #705 Worker + direct translator; #684 external bot ID-mapped bounded batches ported | Real staged Cloudflare 2-way call, then live after approval | HOLD / live not tested |
| 2 | Both bots accept two consecutive questions; composer never traps or silently drops second message | #700/#701 client-side R25 recovery selectively applied to both bots; #694/#695 semantic enhancements remain Draft | Real two-turn Chromium + live provider, error recovery | SOURCE PATCHED / LIVE NOT TESTED |
| 3 | Microphone records permission, produces transcript, and refuses gracefully on denial | Existing mic path; source checks only | Real Chrome permission allow/deny + live transcription | NOT TESTED |
| 4 | PDF, DOCX, JSON, MD, CSV and JPG are downloadable and readable, no truncated legal text or CSV formula injection | #696 remains Draft | Real browser files, content/print and formula checks | NOT INTEGRATED |
| 5 | Official sources identify document, provision, dates, effective/applicable status and provenance | #691 remains Draft (LEGAL HOLD); current source tests | Independent legal source verification by lawyer | LEGAL HOLD |
| 6 | All existing navigation and modules remain accessible desktop/mobile, with full functionality | Existing shell; source parity tests | Real viewport, links and accessible keyboard tests | NOT TESTED LIVE |
| 7 | No sensitive case, history, or private data is sent to UI translator; controlled case access | #684 bot privacy exclusions ported; existing security tests | Browser network inspection with synthetic data | HOLD |
| 8 | Quota/provider errors visible; no implicit paid UI fallback, no infinite AI retry | #705 + #684 bounded batches, cooldown and explicit opt-in | 429/503 live-safe negative tests; review billing | HOLD / not tested live |
| 9 | Pages watcher avoids timestamp-only commits; Pages and Worker publish in parity | #698 workflow copied (source), #705 Worker candidate | Review failed Pages logs, staging and deployment health | HOLD / live not tested |

## Integration safety
- Do not merge #684 wholesale. It conflicts with isolated R26 candidate; ported only its external bot file and three matching regression tests.
- Keep RC36, RC84, AI Contract, unapproved consolidated law and legal-source publication out of P0 rollout.
- No secrets, client case uploads, D1 migration, paid provider fallback or new payments.
- #700/#701 client-side recovery was patch-applied selectively; the shared external bot keeps the R26 UI translation safeguards. #696 still requires conflict-checked export integration.
- The new CI workflow `.github/workflows/zoki-nine-function-source-acceptance.yml` must not be used as a declaration of production readiness.
- Human Gate review + exact head SHA + rollback SHA required before production release.

## Regressions / acceptance
1. Source CI matrix: 9 checks report per-gate PASS / FAIL as provided by GitHub Actions.
2. Separate actual Chromium tests from mocked provider tests.
3. Run real Cloudflare staged test only with explicit provider/consumption authorization.
4. Confirm legal authority separately from AI-generated claims.
5. Record an actual production deployment ID and rollback SHA only after the owner approves release.

Status: RELEASE CANDIDATE WITH BLOCKERS, NOT DEPLOYED.
