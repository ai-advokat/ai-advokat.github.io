# AI Advokat R24 — LIVE Root-Cause and Human Gate Register

**Date:** 2026-11-14 · **Owner:** AI Advokat / human maintainer · **Baseline:** `main` merge SHA `d2122d2f1a15c0bebefb9cc7449f945a886e2716`.

**Classification:** Engineering recovery dossier. **NOT a production release**, **NOT legal publication**, and **NOT a record of Human Gate approval**. All code changes on this branch are review-only.

## 1. Evidence register (LIVE from GitHub Actions)

| Gate | Run | Verified result | Root-cause signal / residual uncertainty |
| --- | --- | --- | --- |
| Worker production sync | 43619431118 | SUCCESS on baseline SHA | Worker has a recorded `production` environment approval; does **not** approve Pages or future commits |
| GitHub Pages sync | 43619431057 | WAITING | Separate public-frontend `production` gate; public gh-pages `pages-release.txt` still points to `0c8324a` |
| Microphone live | 43620120285 | FAIL | HTTP 503 `voice_transcription_capacity_exhausted` (Workers AI quota/capacity) |
| Translator layered live | 43620120265 | FAIL | M2M100 and GPT-OSS expected; responses show `openai_responses_fallback`; full MK→SQ page did not reach READY within 120 seconds |
| FREE runtime live | 43620120326 | FAIL | Exact ZPP Article 184 request returned `404 no_articles` and `versions: []`; no verified text in active D1 article-level corpus |
| R3 exact acceptance | 43620120340 | FAIL · `R3_NO_GO` | Repeated HTTP 503 `openai_incomplete_response` and deficient concepts on otherwise 200 responses |
| Root reliability smoke | 43620120424 | FAIL | GitHub Pages public release parity for baseline SHA absent |
| Dual-bot production UAT | 43620120280 | WAITING | LIVE two-turn conversation not yet verified on the public release |

All evidence: [GitHub Actions](https://github.com/ai-advokat/ai-advokat.github.io/actions). Runtime health alone is not enough to mark any failed gate PASS.

## 2. Source-level defects corrected in R24 candidate

1. **No silent row dropping or index-based misattribution.** Previously, server `/api/ui-translate` filtered out oversized (>1200-character) or blank rows and returned a shortened array, while the browser assigned returned row j to source j. This could display a translation of one legal sentence in another position. Server now returns 422 before quota consumption/provider invocation on invalid, empty or duplicate IDs; client verifies complete ID-set and exact count and applies translations by ID.
2. **Bounded translation latency.** Full-page pass has a 90-second client budget and each request a 25-second timeout. Pending/oversized text remains visibly PARTIAL or UNAVAILABLE, never falsely READY. Source text is not overwritten with a mismatched translation. Workers AI and per-language server rate limits remain unchanged; this does **not** restore exhausted capacity.
3. **Bounded OpenAI recovery.** If a Chief response is incomplete due to exhausted output tokens, the single allowed Chief-only recovery does not trigger another external web search. Existing source/provenance/Human Gate conditions remain mandatory. Safe technical diagnostics include only status/reason/token budgets and never case text or attached documents.
4. **Tests.** Run the full repository suite plus real Chromium fixtures with deliberately reversed IDs and missing entries. Mocked provider responses prove only protocol integrity, not provider availability.

## 3. Remaining owner-controlled blockers

### 3.1 Cloudflare Workers AI / Whisper

- Inspect Cloudflare Workers AI usage and daily allocation and confirm the exact error code, model configuration and account plan in the owner account. **No unapproved payment, plan change, bypass or quota increase.**
- If allocation is exhausted, show explicit voice unavailable/capacity message and preserve typing or permitted browser speech paths. Do not label the microphone functional until a genuine audio transcript is observed.
- Do not silently send confidential audio or documents to a different provider.

### 3.2 Actual MK→SQ whole-page translation

- Confirm Workers AI M2M100/GPT-OSS availability and exact provider identity, not just HTTP 200 from OpenAI fallback.
- With owner-approved bounded test budget, verify UI language, RTL where relevant, all collected navigation elements, correct ID-to-source mapping, timeout, no rate-limit breach, and zero silently substituted legal identifiers.
- A PARTIAL language switch is user-visible degraded mode and must remain NO-GO for full 33-language claim.

### 3.3 ZPP governed article corpus

- `404 no_articles` is an authoritative coverage gap in the active database, **not** a prompt-engineering failure.
- For requests in November 2026, distinguish the 2005-law corpus and its amendments from the new ZPP (Official Gazette 151/2026) whose ordinary application starts in January 2027. Check the procedure's applicable date and transitional provisions before publishing any article text.
- Official evidence starting points:
  - [Constitutional Court, U. no. 106/2026](https://ustavensud.mk/2026/10/%D1%83-%D0%B1%D1%80-106-2026/): discusses the old/new statute and the new law's transition.
  - [Ministry of Justice laws](https://www.pravda.gov.mk/mk-MK/regulativa/zakoni).
  - [Ministry's legislation registry — original ZPP](https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=10692).
- **HOLD:** Obtain and fingerprint exact authorised official text, amendments, enactment and application metadata; separately review Article 184, legal applicability and version; stage and review a source manifest; only after explicit Human Gate consider non-destructive D1 import with rollback. Neither R24 nor this document supplies/imports the missing article text. Do not substitute text from an unadopted proposal.

### 3.4 Professional OpenAI R3

- Inspect bounded provider telemetry (`status`, `incomplete_details.reason`, used output tokens vs allowed max, actual provider/service limit), without prompts or personal data in logs.
- Verify configured model, budget and no-cost/no-repeat policy before a bounded owner-approved LIVE retest. Do not automatically increase token budgets, project spend limits or fall back to unauthorized paid models.
- If a consequential answer cannot be sourced and completed, return a controlled failure or explicitly labeled research draft; never turn technical success into legal authority.

### 3.5 Pages and dual-bot release

- `gh-pages` remains on prior SHA at the time of this report. Its separate `production` environment is WAITING.
- Do not approve, rerun, manually cherry-pick or merge this R24 branch into public Pages based on this document. Confirm exact Pages release SHA and JS asset parity only **after** separate approval.
- LIVE internal and external bots must each complete two user-authorised conversational turns with retained history, no silent extra provider calls, working privacy and source labeling, and correct Human Gate.

## 4. Hard acceptance gates

The following are **independently** required for a legitimate R24 release: exact candidate SHA CI PASS; safety/language/billing tests PASS; Chromium fixture tests PASS; human code-merge approval; separate Worker and Pages production environment approvals; confirmed deployed hashes; provider-tested LIVE translation, FREE, Professional, mic and dual-bot acceptance PASS; legal article version provenance reviewed. A green PR alone cannot close provider/data gaps.

**Release decision:** **NO-GO** until the above necessary external and functional gates have passed.
