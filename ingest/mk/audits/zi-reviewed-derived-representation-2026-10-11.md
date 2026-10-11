# ZI reviewed derived representations — 2026-10-11

Status: **3 segmentation blockers structurally resolved / current-law and Human Gate still closed**

## Purpose

The raw 258-row D1 corpus remains immutable and source-faithful. For Articles 4, 104 and 269, AI Advokat now maintains a separate reviewed representation that is attached only when the article is bound to the exact official editorial PDF URL and SHA-256.

A reviewed representation is not a current-law promotion.

## Article 4

The official editorial PDF places the complete normative Article 4 sentence first, followed immediately by footnote 1 describing the constituent source lineage. The footnote is provenance for the consolidation, not normative Article 4 text.

Reviewed representation: the Article 4 sentence only.

## Article 104

The official source shows Article 104 paragraphs (1)-(3), followed by the heading **„Забелешка наместо попис“**, and then Article 105. That heading therefore belongs to Article 105 and is not part of Article 104.

Reviewed representation: Article 104 paragraphs (1)-(3) only.

## Article 269

The editorial PDF displays the original Article 269 wording and then an editorial note stating that Article 269 was amended. The same official editorial source reproduces the amendment from OG 142/2016: in Article 269, the words **„по четири месеци од денот на неговото влегување во сила“** are replaced with **„од 1 јануари 2017 година“**.

Reviewed representation: the normative Article 269 sentence with that official amendment applied. The starred editorial note remains provenance and is not included as normative body text.

## Fail-closed runtime rules

The derived representation is attached only if:
- instrument = `mk:zi`;
- article number = 4, 104 or 269;
- source URL exactly matches the governed official PDF;
- source SHA-256 exactly matches the governed fingerprint;
- the expected editorial marker occurs exactly once;
- for Article 269, the replaced base phrase occurs exactly once;
- for historical reference dates before 2016-08-01, the Article 269 amended representation is not applied.

If any condition fails, AI Advokat returns the raw source-faithful record and does not guess a correction.

## Runtime use

- `text` remains the immutable raw source extraction.
- `reviewedText` is separate.
- `reviewedRepresentation` exposes derivation/provenance metadata.
- Legal synthesis, fallback answers, assistant citation excerpts and governed chat context prefer `reviewedText` when the fail-closed binding succeeds.
- The representation explicitly carries `currentLawAuthority=false` and `humanGateApproved=false`.

## Gate consequence

The three segmentation blockers can be treated as structurally resolved once runtime tests pass.

Still closed:
- `current_version_verified`
- `human_gate_approved`

Before either can change, perform a fresh official-source/current-status re-check, including Article 218 / U.br.86/2025.
