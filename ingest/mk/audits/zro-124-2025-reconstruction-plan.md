# ZRO OG 124/2025 deterministic reconstruction plan — 2026-10-12

Status: **OPERATION MATRIX READY / OFFLINE CANDIDATE ONLY / NO D1 WRITE**

## Official source

- OG 124/2025
- publication / entry / application: 2025-06-19
- official PDF: `https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-lKlS.pdf`
- PDF pages: 1
- SHA-256: `a300554b91884449a46ee3b1df2ae168fea9a24e53a12dafa49647e83e0807fd`
- amendment-act articles: 2

## Chronology

This plan applies only after the exact governed candidate:
`through-111/2023 -> 39/2025 -> 74/2025`.

The 74/2025 candidate contains 299 article records and remains Human Gate pending.

## Exact operations

1. Amendment Article 1 targets ZRO Article 212(1), point 2 and replaces the single literal value `10%` with `5%`.
2. Amendment Article 2 is non-text: immediate entry into force on publication.

No other article is changed. No percentage elsewhere in Article 212 or the corpus may be altered.

## Fail-closed rules

The offline audit must:
- re-download and fingerprint all four official source PDFs;
- reconstruct 39/2025 and 74/2025 in statutory order;
- parse exactly two 124/2025 amendment events;
- bind the plan instructions to those parsed events;
- require exactly one `10%` match in Article 212 paragraph (1);
- emit 299 candidate articles;
- report exactly one changed article and two operations;
- produce zero new parser warnings;
- keep every article Human Gate pending;
- keep `current_consolidated` at zero.

No Cloudflare secret, Wrangler D1 command or database mutation is authorized.
