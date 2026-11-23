# AI Advokat R24 – offline Greek interface pilot (23 November 2026)

**Draft, not production. HUMAN GATE HOLD / LEGAL_HOLD ACTIVE / MERGE-STAGING-PRODUCTION NO-GO.**

## Actual failure evidence

The owner selected `EL · Ελληνικά` on the Cloudflare Preview of Draft PR #738 but saw `Преводот е привремено недостапен` and substantially Macedonian content. Browser-only mock checks (10/10 CI, 2211 unit tests) did **not** prove live full-page translation. The R23 candidate only attempted 2 on-load batches, with on-demand remainder depending on daily Workers AI capacity. The user did not do anything wrong.

## R24 architecture

1. Root UI translation uses a **static, exact-match, version-controlled language pack** when available; it does NOT call `/api/ui-translate`, does NOT spend Workers AI quota and does NOT transmit source strings.
2. First pilot language: Greek `el`. **381 unique Macedonian phrases** transcribed from the owner's 23 Nov live Preview page are paired with manually prepared **DRAFT Greek equivalents**. This covers that screenshot's phrases, not all future dynamically generated pages or every screen. **Human legal/language review not completed.**
3. A generic `window.AIADVOKAT_STATIC_LOCALES[lang]` interface permits additional reviewed, versioned language packs in future. Other 32 language choices remain as previously implemented, with existing restrictions; do NOT claim they work fully.
4. Dynamic public-interface labels with exact matching source are retranslated after DOM changes; private case text/chat, protected fields and `data-no-translate` remain excluded. Original Macedonian source strings are kept in the app, along with source IDs and dates.
5. The UI explicitly reports actual translated vs unhandled segments and retains `translationState=partial` for draft localization; it must not show fake `ready` or a quota button for Greek.
6. Separate source-authoritative legal content and client/private data must remain under Human Gate. Translated interface strings are explanatory and **must never replace official source documents**.

## Tests

- Static JSON pack count, nonempty Greek strings and source fingerprints.
- Headless real-browser test from the exact GitHub candidate, with `/api/ui-translate` deliberately blocked (503): Greek navigation and hero change without calls, dynamic new labels translate, private text remains original, Greek-to-Macedonian reset works.
- Full `npm test`, repository security CI and external independent reviewer approval before merge.
- Actual Cloudflare Preview test on both desktop and mobile, compare screenshots and record untranslated segments. 381/381 catalogue entries matched to owner's pasted text **does not prove browser coverage**.
- Separate acceptance for Albanian, English, Arabic/RTL and each other promised language; **NOT TESTED** by this R24 Greek pilot.

## Scope limitations / release blockers

Draft Greek text was prepared for internal UI evaluation, not checked by a native Greek legal translator or Zoran. Some phrases may contain legal-language ambiguity; never use as certified translations, official legal guidance, or source authority. Do not merge R24 until independent human legal/language review, e2e preview test, and security/cost cross-PR audit. No changes to law corpus, intake, production database, D1 migrations, or paid provider activation.

**HUMAN GATE: HOLD · LEGAL_HOLD: ACTIVE · PRODUCTION: NO-GO**


### Supplemental audit (R24b)
The browser reported 287 unique missing strings; 149 were non-Cyrillic brand/model names, language labels or source identifiers, and 138 contained Macedonian characters. Another **131** draft Greek interface equivalents were prepared offline, excluding bibliographic citation strings and source-faithful legal references. The candidate now has 512 draft Greek source-to-target pairs. The live-browser coverage number must count Macedonian source segments separately from English brand names / DOI citations. Legal-linguistic approval and all 33-language completeness remain NOT VERIFIED.


### R25 Legal workspace UI localisation gate (23 Nov 2026)
The law registry and law browser live under `#sourceWorkspace` and are deliberately excluded from automatic DOM translation to protect authoritative law text. R25 adds a versioned **draft Greek dictionary only for explicitly paired UI labels**. `T(mk,en)` now uses the exact Greek UI phrase when known, otherwise the existing English label. Article source content, identifiers, official law names, metadata values and original citations do not pass through the dictionary; article text is explicitly marked `data-no-translate`. The law browser displays an original-source notice. Browser test opens the law registry and article browser during a forced Workers AI 503 and confirms Greek labels, preserved Macedonian law name and zero AI translation calls. This is not a certification of Greek legal translation.
