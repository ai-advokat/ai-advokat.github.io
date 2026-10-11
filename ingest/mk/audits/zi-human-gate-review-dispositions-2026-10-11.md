# ZI Human Gate review dispositions — 2026-10-11

Status: **25 findings resolved / 3 segmentation blockers remain**

This review classifies the 28 parser findings from the exact official 99-page editorial consolidated ZI source. It does not mutate production or staging D1 and does not authorize current-law promotion.

## Resolved findings

### Deleted / repealed article numbers

The official consolidated source explicitly explains every numeric gap flagged by the parser:

- Article 95 — deleted by OG 233/2018.
- Articles 240-244 — repealed by Constitutional Court U.br.143/2016 / OG 178/2017.
- Articles 247-248 — deleted by OG 233/2018.
- Article 250 — deleted by OG 233/2018.
- Article 252 — deleted by OG 233/2018.
- Articles 256-260 — deleted by OG 233/2018.

Therefore all 15 `unexplained_gap` findings are resolved as source-explained gaps. No missing article is synthesized.

### Source-faithful mixed-script typography

Ten mixed-script tokens were confirmed in the official source text layer itself. They remain source-faithful and are not silently rewritten. Any future normalization may exist only as a derived search/index representation, never as an overwrite of the authoritative source extraction.

## Three blockers

### Article 4
The token `Oдлуката` comes from the editorial consolidation footnote after Article 4, not from the normative Article 4 body. This is a segmentation boundary issue.

### Article 104
`Забелешка наместо попис` is the heading for Article 105. It must not be treated as normative Article 104 body.

### Article 269
The starred note beginning `*Членот 269 е изменет...` is an editorial amendment annotation following Article 269. It must be retained as provenance but separated from normative Article 269 text in any reviewed current-law representation.

## Gate consequence

Machine source parity remains fully valid: the stored corpus is an exact match to the governed extraction. But exact extraction parity is not the same as a clean normative article representation.

Therefore:
- `current_version_verified = false`
- `human_gate_approved = false`
- no `is_current` promotion;
- no `current_consolidated` promotion;
- no production text rewrite.

Next safe step: build a **derived reviewed representation** for Articles 4, 104 and 269 only, keeping raw source-faithful records immutable.
