# AI АДВОКАТ — R23 Translator structural repair (23 November 2026)

**Draft only. HUMAN GATE: HOLD. LEGAL_HOLD: ACTIVE. MERGE/STAGING/PRODUCTION: NO-GO.**

## Evidence / problem
The production mainline attempts a very broad UI translation on initial load: many model calls, 48 requests/language/hour, variable Workers AI capacity, potential blank/untranslated shell and expensive paid fallback. The 21 Nov 2026 layered CI was green but the live-provider step was SKIPPED. Green mock-browser CI is not live E2E.

## Isolated repair
- Stack on Draft PR #733, so anonymous paid fallback is disabled and real account-wide D1 daily translation quota is present. Do NOT merge #733 or this PR until independent review.
- Port ONLY the translator runtime block from old Draft PR #695; do not port unrelated chat, corpus or law changes.
- Zero-provider curated Albanian navigation labels; MK/EN i18n local cache. These are reviewed UI labels, not legal sources or chat translation.
- The first pass auto-submits at most TWO bounded batches, not a full page. Remaining UI is translated ONLY following the user's explicit opt-in. Avoid background rate-limit storms; show PARTIAL/UNAVAILABLE states honestly.
- Keep all 33 selector languages but do not claim all 33 are model-available. Preserve row-ID integrity, RTL, private case/chat exclusions, local cache namespace and 429/503 safe states.
- New static regression tests, updated five-scenario browser regression + capacity-unavailable sixth scenario, new PR-only browser test workflow. Browser transport is mocked, not a real provider verification.

## Review gates before MERGE GO
1. All unit/security/browser CI checks green on the exact candidate.
2. Independent security/cost review and cross-PR conflict review (#695/#733/#736/#737); no accidental rollback of quota P0.
3. Actual Cloudflare Workers AI /api/ui-translate for synthetic MK->SQ and MK->EN labels: capture HTTP code, provider, model, error category, D1 daily budget, redacted output, and time. No client material, no paid API use.
4. The real browser at original origin shows working Albanian shell even when provider fails; other supported languages show valid translation or explicit UNAVAILABLE, never fake READY. Check full-page opt-in, RTL and no private payloads.
5. HUMAN GATE review and explicit owner approval before any merge, staging or production.

Limitations: This repair cannot create new free Workers AI capacity; 33-language full-page live translation is not proven. The production site is unchanged.


## R24 supplemental offline locale pilot (23 Nov 2026)
The user tested the Cloudflare Preview at EL (Greek) and received 0 working AI translation due to quota/provider unavailability. An offline **draft** Greek phrase map of 381 distinct visible portal strings was added to prove UI translation can proceed with **ZERO** Workers AI calls. This is not a translation of official legal source documents or approval of professional Greek legal terminology. New tests explicitly block /api/ui-translate, verify header + hero + dynamically inserted public text change, private-node exclusion, and MK round-trip; coverage status always PARTIAL pending independent Greek legal-linguistic review. No changes to law corpus, backend, D1 or production. More languages require reviewed static catalogues; 33 fully supported is **NOT VERIFIED**.
