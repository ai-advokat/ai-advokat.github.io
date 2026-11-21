# A3.19 — held-corpus bridge (isolated review candidate)

Source: the 16 November 2026 archive supplied by attorney Zoran Stojankich, inner package AI_ADVOKAT_ASISTENT_A319_CHAT_KORPUS_2026-11-16.zip. Code is adapted from its A3.19 adapter, not from a verified publication of the statutory corpus.

The supplied adapter incorrectly overwrites verifiedLegalCitation=true and verificationState=APPROVED on unrelated existing legalSources. That destroys independently-reviewed source provenance.

This isolated review candidate:
- Validates the source package status and 53 article hashes; all new entries must remain LEGAL_HOLD, PENDING and forbidden for AI citation.
- Preserves existing answer, legalSources and legalSourceVerification instead of downgrading all sources.
- Keeps the 53 held items in a separate a319DiscoveryOnly metadata layer, without publishing raw law text or claiming authoritative citation.
- Does not call AI, make network requests or modify the live /api/chat or /api/bot routes.

Execute: node --test test/a319-held-corpus-discovery.test.mjs

**Release status: NOT DEPLOYED, NOT LEGAL-AUTHORITY VERIFIED.** The original law text, rights, amendment history and each source require attorney-led source binding and Human Gate prior to any public or model-based legal use. Existing legal postflight and claim guards must never be bypassed.

No original corpus files, legal PDFs, confidential case information or secrets are included in this pull request.

## RC2 exact-article hardening (17 November 2026)

Independent reviewer attorney Zoran Stojankich found false-prefix matches:
- `член 101` wrongly returned 10;
- `член 34-г` wrongly returned 34.

We reproduced both defects locally in the original RC1 and fixed them with full-token matching and fail-closed handling of unsupported or malformed article references. Eight new regression tests cover exact numbering, Cyrillic lettered articles, invalid mixed references and improper separators. The original eight integrity/provenance tests remain.

**Status:** This module is isolated, Draft PR only, no public law text, no live Worker wiring, no release or corpus authority approval. All 53 held entries remain `LEGAL_HOLD` pending item-level professional review. Zoran's independent FAST-36 and 14/14 A3.19 fixes await source-code comparison.
