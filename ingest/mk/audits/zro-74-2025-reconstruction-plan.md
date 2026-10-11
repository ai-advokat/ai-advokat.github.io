# ZRO OG 74/2025 deterministic reconstruction plan — 2026-10-11

Status: **OPERATION MATRIX READY / OFFLINE CANDIDATE ONLY / NO D1 WRITE**

## Source

Official amendment:
- OG 74/2025
- publication: 2025-04-08
- entry/application: 2025-04-16
- 4 pages
- SHA-256: `c5289c8e6b015d103bc17beb8686dbaca7b874c2b121888da8927cb320d309ba`

The audited source contains exactly 26 amendment-act articles and 26 events. Article 26 is the entry-into-force provision; all Articles 1-25 target existing ZRO articles.

## Chronological base

This plan must be applied only after the exact deterministic candidate through OG 39/2025:
- source chain: 111/2023 -> 39/2025;
- 299 articles;
- Human Gate pending;
- no current-consolidated status.

The engine still binds `base` to the original official 111/2023 source fingerprint while verifying that 39/2025 already appears in the source chain and that 74/2025 is later.

## Operation coverage

All amendment articles 1-26 are explicitly accounted for.

The plan uses:
- paragraph-scoped exact textual replacements;
- two complete article replacements: 213-б and 258-б;
- one paragraph replacement: 266-б(1);
- one non-text entry-into-force event: Article 26.

No operation guesses a target or replacement.

## Official-source typography review

The official 74/2025 PDF text layer contains the token `Mинистерството` (Latin `M` + Cyrillic remainder) in amendment Articles 15 and 17.

The operation `source_text` preserves that official text. The derived replacement uses `Министерството` with Cyrillic `М` to prevent a mixed-script token from being introduced into the reviewed candidate. This is a Unicode homoglyph normalization only; it does not alter the word or legal meaning.

The source also spells `дигитална транформација` in Articles 8 and 14 and `кваратален преглед` in Article 20. Those lexical spellings are preserved in the candidate because they are substantive source text, not Unicode encoding artifacts.

## Fail-closed requirement

Before an offline candidate may be emitted:
1. re-create the exact 39/2025 candidate from official fingerprints;
2. re-download and fingerprint OG 74/2025;
3. parse exactly 26 amendment events;
4. verify every amendment article 1-26 is represented in the operation matrix;
5. require every textual match count exactly;
6. reparse every changed article with no STOP finding;
7. keep Human Gate pending and current-consolidated count zero.

No D1 write is authorized by this plan.
