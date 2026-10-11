# ZRO OG 39/2025 deterministic reconstruction plan — 2026-10-11

Status: **OFFLINE CANDIDATE ONLY / NO D1 WRITE / HUMAN GATE PENDING**

## Why 39/2025 first

OG 39/2025 is the smallest 2025 ZRO amendment and is suitable for the first deterministic reconstruction pass. It contains four amendment-act articles:

1. Article 104: deletes the word **„друг“**.
2. Inserts a new heading and new Article **104-а** after Article 104.
3. Transitional rule for affected office-holders reaching pension conditions in 2025.
4. Entry-into-force rule: day of publication.

The official amendment PDF is:
`https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-Jv8C.pdf`

Governed SHA-256:
`d112e2449a07a6419ced1359b897758d9a2f6fd5fbc6f168dd8680f4f7bac854`

## Base snapshot

The plan starts only from the exact official 2023 consolidated ZRO snapshot:
- 108 pages;
- 298 articles;
- SHA-256 `f0b178227052c960ef9d86218a98b005654550c1b78633858b9fc1a6ccf5d655`;
- version through OG 111/2023.

Parser v0.3 identified nine legacy-source findings in this 2023 snapshot. The exact Article 104 preflight then exposed one additional section-heading boundary that the parser had not flagged. Before the amendment engine runs, a separate reviewed-base derivation resolves all ten against the same official PDF while preserving the raw NDJSON: four officially deleted gaps (98, 253-255), one consolidation-footnote boundary after Article 2, one next-section heading boundary after Article 104, and four exact Unicode homoglyph normalizations. The derived base remains non-current and Human-Gate pending.

The base Article 104 reads, in substance and text, that employment terminates at age 64 and 15 years of pension service unless **another law** provides otherwise. OG 39/2025 removes only the word `друг`.

## Engine operations

The plan contains exactly four operations in statutory order:
- amendment Article 1 → one whole-word textual deletion in Article 104;
- amendment Article 2 → insert Article 104-а after Article 104;
- amendment Article 3 → record as `non_text/transitional`;
- amendment Article 4 → record as `non_text/entry_into_force`.

No unaccounted amendment provision is permitted.

## Candidate-only boundary

Target status is:
- `needs_version_review`;
- Human Gate `pending`;
- never `current_consolidated`.

The offline workflow:
1. re-downloads the exact 2023 base PDF and 39/2025 amendment PDF;
2. verifies page counts and SHA-256 fingerprints;
3. re-parses the raw base to exactly 298 articles, requires the exact nine parser findings plus the independently checked Article 104 heading boundary;
4. derives a fail-closed 298-article reviewed base with zero unresolved parser warnings while keeping the raw extraction as a separate artifact;
5. re-parses 39/2025 to exactly four amendment events;
6. applies the plan with the deterministic amendment engine;
7. requires exactly 299 candidate articles;
8. verifies Article 104, inserted Article 104-а, provenance and the two non-text rules;
9. uploads review artifacts only.

It contains no Cloudflare credentials, Wrangler D1 command, database migration or database write.

## Next gate

A successful run establishes a deterministic **candidate through 39/2025 only**. It does not establish current ZRO.

Only after this candidate passes should the 74/2025 plan be prepared against its exact output.
