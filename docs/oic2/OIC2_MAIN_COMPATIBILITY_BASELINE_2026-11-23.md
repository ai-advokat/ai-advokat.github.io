# OIC-2 — Independent Main Compatibility Baseline

**Date:** 2026-11-23  **State:** AUDIT / DEVELOPMENT PREPARATION ONLY  **Decision:** NO-GO for merge, staging or production

**Repository:** https://github.com/ai-advokat/ai-advokat.github.io
**Verified base main:** `b83350fb9079f3780a03c540d6faa8d99b2aa54a`
**Isolated branch:** `integration/oic2-tech-handover-20261123`
**Prohibited without a separate Human Gate:** changes to `main`, protected/public deployments, staging activation, real-case processing, remote D1 migrations, Cloudflare secrets/bindings and any paid provider activation.

## Evidence classification

- VERIFIED: GitHub `main` commit and referenced source paths, relevant Wrangler configurations, existing workflow triggers, source-level routes, and creation of the isolated branch.
- VERIFIED: GitHub Actions full test suite and security workflow concluded `success` on 2026-11-19 for this main SHA. Not rerun by this audit; not evidence of OIC-2 end-to-end behaviour.
- AVAILABLE SECONDARY INPUT: `AI_ADVOKAT_OIC2_TECHNICAL_HANDOVER_2026-11-23.md` (earlier handover overview). It is not a substitute for byte-level candidate source.
- BLOCKER: The claimed OIC-1 and OFFLINE V5.15 archives and their SHA-256 manifests are not present as inspectable attachments in the current task. No hash comparison or candidate-vs-main diff was performed. DO NOT mark them compatible.
- NOT TESTED: browser OCR, private storage in a new environment, cross-account access live UAT, document fidelity, AI costs, concurrent load and staging isolation.

## Components that MUST be reused rather than cloned

| Capability | Existing main component | Integration rule |
|---|---|---|
| Unified case UI, multiple files and drag/drop | `casepilot-workspace.html`, `assets/casepilot-workspace-ui.js` | Wrap/reuse UI with a thin adapter; do not create independent login or data store |
| Case membership, access and case APIs | `src/index.js` (`handleCaseWorkspaceApi`), `src/case-workspace.js`, migrations `0029`, `0035` | Preserve account membership, active case access and owner/lawyer write restrictions |
| Private upload + multipart | `src/index.js`, `src/case-workspace.js`, migration `0044` | Reuse existing server SHA, MIME/signature checks and role guards; add batch idempotency only if needed |
| Private file storage | `caseObjectPut/Get/Head/Delete` in `src/index.js`; migration `0045` | Use a dedicated, separately authorised OIC-2 R2 binding; never use production D1/R2 for tests |
| Extraction and source-first analysis | `src/case-intelligence-runtime.js`, `src/case-intelligence.js`, `src/index.js` | Reuse extraction contract, source locators and legal source gates; validate scanned Macedonian OCR separately |
| Deterministic text classification | `src/document-ingest-router.js` | This is a classifier for already extracted text, NOT an OCR or PDF parser |
| Working draft + professional export | `src/case-export.js`, `src/legal-document-export.js`, `src/professional-docx-engine.js` | Use a shared versioned AST and server-approved export mode; keep court pleading distinct from internal reviewer annex |
| Professional Human Gate | `caseProfessionalFingerprint`, `latestCaseHumanGate`, `/api/cases/{id}/human-gate`, `/exports` in `src/index.js` | The server, not the browser, decides whether professional export is permitted |

## Independent findings, prioritized

**P0 — D1/R2 resource isolation.** Standard `wrangler.jsonc` has `DB`, AI and preview settings but no `CASE_FILES`; `wrangler.r2.jsonc` adds an R2 bucket while still naming the existing production DB. Never use it as an OIC-2 UAT config. `CASE_D1_FALLBACK_ENABLED=true` allows Base64 private file chunks in `case_private_object_chunks` (see `src/index.js` around lines 3960–4055). `casepilot-workspace.html` says D1 is metadata-only: reconcile this inaccurate operational description before any sensitive test. Preview URLs do not themselves prove separate storage.

**P0 — Candidate provenance.** OIC-1/OFFLINE V5.15 source archives, manifests, and hashes are missing from this review. Require file-by-file SHA-256 verification, ZIP traversal and secret scanning, source diff against exact base, and a component ownership map before code transplantation.

**P0 — OCR versus upload.** UI permits 20 files and advertises multipart up to 500 MiB, but `CASE_INTELLIGENCE_PROVIDER_MAX_BYTES` is 15 MiB; a successful multipart upload is NOT successful extraction. Workers AI `toMarkdown` and conditional OpenAI `input_file` / `input_image` exist, but no independent Macedonian scanned-page OCR, page-confidence and provenance benchmark has been run. Do not promise 500 MiB OCR or perfect transcription.

**P0 — Authorization / tenant boundary.** Existing `caseWorkspaceMembership` and `caseWorkspaceAccess` perform membership and case-scoped access checks; owner/lawyer permissions guard mutations. OIC-2 must use these checks unchanged, reject revoked users, and test guessed IDs, cross-case reads/writes, URL/path swaps and reviewer-only attempts. No parallel authentication layer.

**P0 — AI spend / concurrency.** Private extraction can invoke external OpenAI and then Workers AI fallback; execution and retries must be constrained by atomic per-account and global limits and a fail-closed cost policy. Draft PRs #733, #736, #737, #738 remain open and must NOT be blindly cherry-picked or merged; #737 is stacked on #736 and #738 on #733. Require independent security and cost review, with separate controlled verification of leased concurrency and no hidden paid UI fallback.

**P0 — Human Gate extension.** Existing server fingerprint covers case metadata, document IDs/hashes/states, and authority classifications, while professional export checks the current gate. New draft revisions must add immutable parent revision, diff, revision hash, analysis/source-version manifest, audit, rollback, and gate re-locking on each material change. Client-provided approval is never authority. Preserve WORKING DRAFT until a lawyer approves the exact current revision.

**P1 — GitHub governance.** GitHub reported `main` `protected=false` and no repository rulesets in this read. Production and Pages sync workflows are triggered by pushes to `main`, while legacy staging workflow is fail-closed. A separate repository-governance Human Gate should evaluate branch protection, required reviews/checks and release controls. This audit does NOT change settings.

## Acceptance evidence required (all NOT TESTED by this review unless specified)

| Gate | Objective | State |
|---|---|---|
| A00 | Source `main` SHA, isolated branch, no runtime mutation | PASS (GitHub source/branch inspection) |
| A01 | OIC-1/V5.15 file SHA-256 manifest, code diff and no hidden secrets | BLOCKED: source archive unavailable |
| A02 | Dedicated non-production D1 and R2; no shared resource ID/bucket or secret | NOT TESTED; staging forbidden |
| A03 | 20 synthetic mixed files, stable IDs/hashes, rejection + retries, no cross-case mixing | NOT TESTED |
| A04 | Digital PDF, scanned MK-Cyrillic PDF, DOCX, images, page locators, OCR uncertainty | NOT TESTED |
| A05 | Correct source-first legal analysis, contradictory facts, missing-law versions | NOT TESTED; lawyer review required |
| A06 | Immutable conversational revision, diff, rollback and new fingerprint-bound gate | NOT IMPLEMENTED / NOT TESTED |
| A07 | DOCX editable + PDF parity from the same version, no internal-note leakage | NOT TESTED |
| A08 | Revocation, cross-tenant, 429/503, budget exhaust, provider fallback, lease contention | NOT TESTED |
| A09 | Existing full unit/security test suites unchanged + new OIC-2 regression tests | BASELINE CI SUCCESS on 2026-11-19; NOT RERUN here |
| A10 | Separate owner infrastructure approval, lawyer approval, controlled UAT | HOLD |

## Safe next sequence

1. Attach original OIC-1 and OFFLINE V5.15 ZIP(s) plus canonical SHA-256 manifest; record byte hashes and source revision/date.
2. Create a file-by-file reuse/diff matrix, preserving the existing API and law corpus and avoiding parallel backend/auth.
3. Implement only a thin adapter and, if genuinely absent, immutable upload-batch/draft-revision contract in this branch. Keep new modules disabled by default.
4. Add synthetic tests for D1/R2 separation, case auth, OCR uncertainty, provider budget/concurrency, revisions, and fingerprint-bound Human Gate.
5. Run `npm ci`, `npm test`, focused case-workspace/casepilot/case-intelligence/security suites in isolated CI with no production secrets or remote writes. Capture exact counts and logs.
6. Request independent security/cost and lawyer review before proposing any PR; do not activate staging or merge without a distinct written Human Gate.

## Stop conditions

No production deploy; no staging unlock; no Cloudflare resource creation; no real client document uploads; no paid AI activation; no migration against the existing remote DB; no unchecked copying from draft PR stacks.

**Conclusion:** Existing main supplies reusable identity, case-scoped storage and document intelligence foundations. OIC-2 is a DEVELOPMENT CANDIDATE, not a verified integrated or deployable release. This commit is documentation-only.
