# AI Advokat R19 — Production repair evidence & release gates

Date: 2026-11-14
Status: **RELEASE CANDIDATE — NOT DEPLOYED / NOT VERIFIED LIVE**
Owner of final release: human repository/production owner

## Production evidence (from R18, not from PR tests)

- Live translator, workflow 43602772792: M2M100 and GPT-OSS fallback each HTTP 200, but Albanian end-to-end full-DOM switching timed out after 120 s. Report 14117315612. The later PR probe 43604460318 also failed live DOM (15 successful network translation responses, zero translation HTTP failures, still `loading`).
- FREE UAT 43602773031: live test expected a stale Qwen backup model, not the R18 GLM release pin. This produced a false configuration failure in addition to actual user-facing issues.
- Professional L2-L3 43602772849: L2 request returned 503 `free_workers_ai_provider_error`, `workers_ai_timeout_22000`; L3 divorce passed on a canonical source-first lane.
- Dual-bot UAT 43602772932: EXTERNAL_PROFESSIONAL ambiguous Article 12 returned 503 `macedonian_language_release_blocked`; recorded primary OpenAI response HTTP 429 `project_spend_limit_exceeded`. Secondary Workers AI output included malformed mixed-script `контролa`, and the language editor failed. This is a **real external billing + language** incident, not a green-CI regression.
- 0053 activation 43388415285 remains waiting for separate authorized Human Gate.

## Changed in draft PR #682

1. FREE runtime contract checks use the actual GLM fallback.
2. Explicitly ambiguous article identification responds deterministically with a request for the law identity, never inventing a statute.
3. Deterministic, source-free, human-review-required formal drafting fallback also covers FREE provider failure and final language block when no documents/history/governed context were supplied.
4. Isolated Latin homoglyphs embedded in otherwise Cyrillic text can be normalized under the independent Macedonian release gate. Official legal identifiers and URLs remain protected.
5. OpenAI hard project spend-limit responses are terminal (no duplicate provider retry). Code does not bypass billing, alter API credentials, or raise spend.
6. Translation commits an **explicitly PARTIAL** priority UI shell first, processes the rest, shows batch progress, and marks `ready` only after all collected units complete. Public API limits and protections are unchanged.
7. Browser acceptance records the rendered shell state/scope on timeout, preserving the real full-page gate.

## Acceptance criteria for production

- [ ] PR CI: Full suite, Security, language, source safety, translation compile checks all PASS on one exact SHA.
- [ ] Human Gate: approve merge and production deployment before any automatic release. Separate 0053 schema approval only if evidence warrants it.
- [ ] Verify OpenAI project's spend limit/credits with its authorized owner. Never send API keys in chat.
- [ ] Post-deploy full browser page: MK -> SQ selectors; above-fold navigation and translator label translated (PARTIAL is a real intermediate state). `ready` only after complete full-page translation; no false pass for 120s timeout.
- [ ] Post-deploy internal /api/chat: real free Macedonian explanation; real source-backed statute lookup; source-free fictional lawsuit draft; no user-visible blank response or endless spinner.
- [ ] Post-deploy external /api/bot with test Professional membership: same source-backed tests and controlled L2/L3 fallbacks, with provenance and Human Gate. Verify primary paid generation only after provider billing is restored.
- [ ] Rate limit and unknown-law safeguards remain fail-closed; no fabricated statute, case law, court or deadline.
- [ ] Gate status report: PASS / FAIL / BLOCKED / NOT TESTED with exact run IDs.

## Important limitation

No CI success or Git commit can certify new runtime behavior until the exact candidate is deployed and its **post-deployment** tests pass. A partial translated shell is a significant availability improvement but does **not** constitute complete 33-language translation of the whole site. All remaining coverage and provider-budget issues must be tracked openly.
