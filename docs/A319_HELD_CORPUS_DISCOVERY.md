# A3.19 — candidate discovery-only bridge for 53 held BPP units

The original 2026-11-16 A3.19 adapter in Zoki's supplied package overwrites even independent existing reviewed legal sources to `LEGAL_HOLD`. This is incorrect provenance: a held new corpus must not downgrade unrelated verified sources. It also confuses a discovery hit with a citable article.

This isolated patch keeps the original validation (53 source units, original SHA-256 per text, `production=NO_GO`, `human_review=PENDING`, `authorized_for_ai_citation=false`) but sends the matches into a separate `a319DiscoveryOnly` field. No raw article text, publicly-republished PDF, or legal source citation is emitted; existing `answer`, `legalSources` and `legalSourceVerification` are left unchanged.

**Do not wire to /api/chat or /api/bot.** This file only validates and formats privately provided corpus data for a future controlled retrieval route. Prior to any model context injection or public citation, the actual law version, amendment history, official source rights, item-level provenance and a separate Human Gate must be verified. Existing legal postflight and case-law guards stay mandatory.

Offline smoke (synthetic data, no law text distributed):

```sh
node --test test/a319-held-corpus-discovery.test.mjs
```

Release state: ISOLATED CANDIDATE ONLY, not production law authority.

## RC2 exact-article hardening (17 November 2026)

Independent reviewer Zoran Stojankich identified false-prefix matches: `член 101` returned 10 and `член 34-г` returned 34 in the RC1 draft. Reproduced and fixed with full-token matching, explicit invalid-reference fail-closed and tests for mixed valid/invalid queries, lettered articles, ranges and malformed syntax. The original 8 provenance/safety tests remain. These changes apply to the isolated review module only, **not** to the public legal corpus or live Worker. Zoran's FAST-36 and his claimed 14/14 tests await direct source-code comparison.
