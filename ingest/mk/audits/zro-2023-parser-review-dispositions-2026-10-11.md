# ZRO 2023 parser review dispositions — 2026-10-11

Status: **9/9 findings source-reviewed / raw extraction preserved / derived base only**

Parser v0.3 correctly stopped the first OG 39/2025 reconstruction attempt because the 2023 source-faithful extraction carries nine findings that predate the upgraded parser.

## Explicitly deleted gaps

The official consolidated source states:
- Article 98 is deleted by OG 106/08.
- Chapter XXIV and Articles 253, 254 and 255 are deleted by OG 106/08.

These four gaps are therefore not missing-source failures and no article is synthesized.

## Article 2 consolidation footnote

The complete normative Article 2 ends with the protection of workers' freedom of labour, dignity and interests in the employment relationship.

Immediately after it, the source places footnote 1 beginning:
**„Пречистениот текст на Законот за работните односи ги опфаќа...“**

That material is consolidation provenance, not normative Article 2 text.

The raw extraction is preserved. The reviewed reconstruction base uses only the verified normative Article 2 body.

## Source-text homoglyphs

The official PDF text layer contains four mixed Latin/Cyrillic tokens:
- Article 259: `зaтекне` → reviewed Unicode representation `затекне`;
- Article 264: `членoви` → `членови`;
- Article 265: `платa` → `плата`;
- Article 266-в: `Инспекторoт` → `Инспекторот`.

These are exact one-token Unicode homoglyph normalizations in the **derived reconstruction base only**. They do not overwrite the raw source record.

## Governance

The derivation script:
- binds to the exact official source SHA-256;
- requires the exact nine-finding topology;
- requires every text marker/replacement exactly once;
- refuses unknown findings;
- keeps Human Gate pending;
- does not mark the base current;
- does not write to D1.

Only the resulting reviewed base may be passed to the deterministic amendment engine for the 39/2025 offline candidate.
