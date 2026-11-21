# ZOKI AI ДОГОВОРИ RC81–RC84 · Review-only integration candidate

**Date:** 14 November 2026  
**Source:** user-provided 111.zip and local AI_Advokat_Zoki_RC84_Integration_ReviewOnly.zip.  
**GitHub scope:** static, preview-first, no raw contract text or archived proprietary clauses copied to repository.  
**Release status:** REVIEW-ONLY CANDIDATE · LEGAL HOLD · clause activation NO-GO.

## Evidence and two distinct baselines

- DPRO-14R remains the canonical existing AI Contract PRO generator, with **50 archival findings** (28 HIGH, 20 MEDIUM, 2 LOW), previously **0/28 lawyer approved**. This integration **does not overwrite it**.
- RC81–RC84 add a later **review queue of 28 items**, split **8 CRITICAL and 20 HIGH**, across six profiles (NDA 2, cooperation 7, services 6, lease 6, loan 3, debt 4).
- Upload provenance: 111.zip SHA-256 a449afe67c9eb1d6493d06f23998068a2849a0a1f3b7d27b744784771037dbcc.
- The local intake package reports 86/86 matching archive manifests and 28/28 matching draft-review fingerprints; these are *archive consistency*, **not** verified law, licensing or legal signoff.
- **0/28 legally approved; rights to republish Paragraf-labelled materials are unconfirmed.** No raw legal text, private files, credentials, client data or localhost AI server are imported.

## Implementation

- ai-contract-rc84-review.html: public read-only aggregate status plus local JSON selector, no 28 detailed records served to visitors.
- assets/ai-contract-rc84-review.mjs: validate exact schema, SHA fingerprint, 28 HOLD records, model/severity counts and lack of legal approval. Display local metadata using textContent, not executable HTML.
- Internal portal (index.html), external bot (bot/index.html), AI Contract PRO (ai-contract.html), and contract-intelligence.html link to the same intake viewer.
- test/ai-contract-rc84-review-only.test.mjs: automated fail-closed and no-provider regression tests.
- No provider calls, fetch, telemetry, localStorage, D1, signing, negotiation or release mutations.

## Use by lawyer Zoki

1. In preview, open the RC84 LEGAL HOLD link from either bot.
2. Locally extract rc84-review-gate.json from the separate owner-held ReviewOnly ZIP. Do **not** upload 111.zip, contract text or client documents into the public site.
3. Select this sanitized JSON locally. See 28 archival IDs, priority, missing factual fields, and items needing separate legal verification.
4. Real confidential cases belong in Secure Case Workspace; this local viewer is not lawyer authentication or official decision recording.
5. Independently verify current official legal versions/dates, cross-clauses, rights and individual lawyer decisions. Each later clause requires separately signed review and Human Gate.

## Acceptance and release gates

| Boundary | Requirement |
|---|---|
| GitHub | DRAFT PR; separate merge approval |
| Internal/external UI | Static review-only; no proprietary source published |
| Cloudflare | Preview-only if available; production requires separate Human Gate |
| D1 | No schema or data writes |
| Billing & AI | No AI calls; quotas unchanged |
| Legal | All 28 HOLD; no legal effect represented |
| Validation | Exact-head CI and code review before merge; browser QA independent |
| Rollback | Revert one feature PR; DPRO-14R untouched |

## Not part of this change

- No promotion of 28 clauses into legal corpus, chat answers or generated contracts.
- No automatic lawyer approval, contract signing, submission or legal validity claims.
- No action on microphone, translation, R3 or ZPP corpus blockers.
- No assurance of Paragraf publication rights.

**Human Gate:** legal reviewer plus owner approval required before any merge and production change. Per-clause legal approvals are additional, separate gates.
