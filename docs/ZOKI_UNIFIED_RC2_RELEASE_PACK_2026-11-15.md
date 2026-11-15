# AI Advokat · ZOKI UNIFIED RC2 · Candidate release pack

**Date:** 15 November 2026 (Europe/Skopje)
**Product:** AI Advokat — internal professional bot, external public bot, bounded proactive agents, translator, voice, legal sources and exports
**Version:** ZOKI-UNIFIED-RC2-CANDIDATE-20261115
**STATUS:** RELEASE CANDIDATE WITH BLOCKERS · **NOT MERGED / NOT PRODUCTION-APPROVED / LEGAL HOLD**

## 1. Mandate and source of truth

Prepare one coherent, reviewable candidate for Zoran Stojankich's safe testing. Maintain source-first legal output, natural multilingual semantic conversation, bounded/free AI quota, privacy, and explicit human decisions. No autonomous litigation, signing, client messaging, amendment consolidation or release without approval.

Parent / subordinate work, not six independent production releases:

| Source | Deliverable now included | Boundary |
| --- | --- | --- |
| PR #691 (base) | Unified RC1 portal, public law source browser; source pages for BPP 101/2019, BPP 194/2024 and new ZPP 151/2026 | Legal review-only; new ZPP is not a certified applicable old ZPP |
| PR #693 | Bounded Workers AI translation, local reviewed navigation, separate full-page click, privacy exclusions and retired legacy translation cache | Live provider 503/capacity not cured by UI code |
| PR #694 | Natural conversation context for two bots, bounded specialists and proactive next-turn prompts; user correction overrides rejected topic | Static tests are not a model-quality certificate |
| PR #692 | Single five-function regression matrix | Source tests only; no microphone/user acceptance claim |

All changes are staged against RC1 in the combined candidate branch `release/zoki-unified-rc2-candidate-20261115`. This source tree is the **candidate snapshot**, not a production or legally certified release.

## 2. User-facing acceptance (each must be tested on exact Cloudflare Preview commit)

| Gate | Test | Success evidence required | State at authoring |
| --- | --- | --- | --- |
| F1 — Translator | MK→SQ and MK→English; select several of 33; navigate; explicit full-page button; try model unavailable | Correct locale, verified legal terms, no false “fully translated” label, bounded requests | SOURCE CI ONLY; real Workers AI translation PENDING |
| F2 — Voice | Chrome microphone permission; actual Macedonian dictation; speech transcript; denial; provider exhausted | Correct transcript, accessible failure and no fabricated transcription | SOURCE CI ONLY; real mic/Whisper PENDING |
| F3 — AI conversation | Both bots: ask, correct, compare, “А зошто?”, “А што со рокот?”, Latin “A zosto?”, English “Why is that?” | Substantive relevant answer to **current user intent**, no invented previous history, language preserved, no ungrounded statute/date | SOURCE CI ONLY; LIVE MODEL EVALUATION PENDING |
| F4 — Official law | Open BPP sources and ZPP 151/2026; inspect article 184, page 47, and article 519, page 123; check citation date and old-law question | Source fidelity and application date, explicit historical/current distinction; no automatic promotion of 2026 old ZPP | VIEWER/INDEX AUTOMATED; HUMAN LEGAL REVIEW PENDING |
| F5 — Documents | Export DOCX/PDF/TXT working example with fictitious details; open in respective readers | Actual document opens, text readable, no client PII leak or fictitious legal citations | SOURCE CI ONLY; REAL FILE RENDER/OPEN PENDING |
| F6 — Proactive agents | Propose follow-up for corrections and legal source verification; never auto-send or file | User click required; source provenance; no copied client identifiers; Human Gate | SOURCE CI ONLY; HUMAN UAT PENDING |
| F7 — Provider/cost | Exhaust free quota safely in synthetic test; separate paid UI translation opt-in unset | No unbounded fanout, no paid fallback from OPENAI_API_KEY alone, clear 503 | AUTOMATED TEST PASS ON PRECEDING BRANCH; LIVE ACCOUNT QUOTA UNVERIFIED |
| F8 — Public/privacy | Try synthetic identifier in public chat and attempted private document upload | Secure Case handoff before public provider processing | AUTOMATED TESTS; LIVE BROWSER PENDING |

**SEMANTIC EVALUATION RUBRIC (for each real bot turn):** 0/1 each for recognising the question, preserving relevant history, obeying a user correction, using correct locale, giving useful answer-first reasoning, separating supported law from assumptions, disclosing source/version gaps, and avoiding invented action. Pass threshold 8/8 on mandatory safety checks; qualitative depth/clarity requires Zoran's independent review. Do not grade unavailable-provider errors as semantic successes.

## 3. Explicit independent blockers — do not merge to main

1. **LIVE AI capacity:** Existing RC1 E2E returned HTTP 503 for UI translation (`ui_translation_provider_unavailable`) and voice transcription (`voice_transcription_capacity_exhausted`). Source fixes reduce waste but do not prove a healthy live provider.
2. **GPT/provider reliability:** OpenAI R3 incomplete-response scenario remains independently subject to real E2E confirmation; no new paid provider or fallback authorised here.
3. **Time-dependent applicable law:** Verify old ZPP applicable in 2026 and the future application of new ZPP 151/2026 against official source. Never silently substitute new article numbers for old law; 519/519 discovery index is not an authoritative attorney-certified consolidated law.
4. **RC16 / RC84 legal reviews:** HG11/HG35 remain OPEN; RC84 contains 28 archive items with **0/28 lawyer approvals**. No proprietary RC84 document text is approved for public corpus promotion.
5. **Real browser use:** Cloudflare Preview source/build does not establish live microphone permission, spoken conversation, actual translation, source integrity review or exported document fidelity.
6. **Production deployment coupling:** Cloudflare native Git integration may deploy `main` automatically. Human must review/cancel production triggers before any merge to main. No paid services or database mutation are permitted by this candidate.

## 4. Safe test instructions for Zoki

1. Open the **exact linked Cloudflare Preview**, not main and not a guessed hostname. Confirm bot banner says Preview/test before use.
2. Use **fictional facts only**. Do not supply names, identification numbers, original client documents or private case materials to public chat.
3. In internal and external bots, enter: “Што е отказ од работен однос?” → “А зошто?” → “Не, мислев на договорот, не на отказот.” → “А што со рокот?” Confirm context and correction. Also try “A zosto?” and “Why is that?” with the language selector.
4. On the source browser, open legal citation and original PDF; check legal title, issue/year/page and effective-date warnings. Mark unsupported current-law claims as FAIL, not guessed PASS.
5. Try voice with Chrome mic **Allow**, then **Deny**. Verify transcripts and failure messages; do not count mocked speech as live success.
6. Export one fictional legal working draft to DOCX/PDF/TXT. Open actual files, check header/source labeling and missing-client-data fields.
7. Record **PASS / FAIL / NOT TESTED**, endpoint, browser, time, and preview commit only. Never write confidential answer text to public issue comments.

## 5. Verification and rollback

- GitHub checks: five-function matrix, semantic dialogue, Chromium simulated translation, full repository tests, security, source safety, activation, LIOE, privacy. These are independent requirements.
- CI checks read source and fixtures; real LLM output, human speech, Cloudflare account quota and attorney legal review must be recorded separately.
- Rollback on candidate: revert staged PR, or select previous Preview deploy. There is no database migration in this candidate.
- Rollback on production, **if ever explicitly authorised**: retain previous deployed commit and Git/Cloudflare deployment ID before merge; verify rollback route and URL. Do not claim rollback completed without checking production.

## 6. Human Gate

**NO-GO until every P0 blocker is cleared.** Required written sign-off: owner approval for the exact SHA, Zoran acceptance of the legal workflow, verified source rights and version/applicability, Cloudflare quota/finance check, and independent production-deployment controls. A subsequent merge to main or activation of unreviewed law is a separate consequential action.

This pack is a candidate handoff, **not** a certificate that all functions are ideal, available or legally approved.
