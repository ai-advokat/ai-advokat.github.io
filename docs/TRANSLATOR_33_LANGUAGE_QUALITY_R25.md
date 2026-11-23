# AI Advokat — 33-language localisation quality register (R25, 23 Nov 2026)

**DRAFT / HUMAN GATE HOLD / LEGAL_HOLD ACTIVE / NO MERGE, STAGING OR PRODUCTION**

The site offers 33 language **choices**, not 33 independently verified completed translations. The canonical source language is Macedonian. English has an existing bilingual UI layer; Albanian has reviewed navigation labels and bounded provider translations; Greek has an offline DRAFT package plus explicit law-workspace controls; all other languages remain provider-dependent and UNVERIFIED. **No language has human-approved 100% full interface localisation in R25.**

### Permanent architecture

- Immutable Macedonian keys, version-controlled locale packs and a per-language registry (`data/ui-locale-coverage-r25.json`). Do not pay on every page load to retranslate static buttons, headings or labels.
- For each locale, translate only the interface. Keep original official legal provisions, law titles, article metadata, citations and user-private data separate and source-faithful. A translated explanatory UI sentence is **not** a translated authoritative legal act.
- Each locale requires exact-key coverage of the root, registry, law browser, ZPP timeline, case law, search, chat shell, mobile and ARIA/placeholder text, including dynamically created labels. Detect and report remaining Macedonian UI strings; exclude protected legal source citations from the denominator and report them separately.
- Pass forced-provider-503 real-browser test with zero AI calls for every *offline* locale, and cache/row-ID/429/503 + quota tests for provider-based languages. No auto-paid fallback, no private-case exfiltration.
- Review legal terminology and cultural appropriateness by a language professional and legal expert; verify RTL/keyboard/voice limitations separately; require independent security/cost review and owner approval.

### R25 observed correction (Greek pilot)

The source registry/law browser used a `T(mk,en)` UI-pair helper inside `#sourceWorkspace`, which is intentionally excluded from generic DOM translation to protect source data. R25 uses a **draft exact-match Greek dictionary** for the authored UI pairs, falls back to existing English interface strings for untranslated pairs, preserves API-delivered law names and article text, and adds a visible 'original legal text' notice near articles. This is a **UI-only** correction and not a translation of official laws.

### Current release status

`mk`: canonical; `en`: bilingual, incomplete acceptance; `sq`: curated shell, provider contingent; `el`: offline DRAFT UI; other 29: no offline packs, provider contingent. All noncanonical locales: HOLD. Real live Preview tests and human translation review still required. CI coverage inventory is **not** a claim of 100% locale coverage.
