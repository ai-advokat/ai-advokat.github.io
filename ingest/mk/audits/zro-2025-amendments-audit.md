# ZRO 2025 Amendments — Official Source Audit

Date: 2026-09-29
Instrument key: `mk:zro`
Audit workflow run: `36640595625`
Result: **SUCCESS — all three amendment acts parsed**

## 39/2025
- Official PDF: https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-Jv8C.pdf
- SHA-256: `d112e2449a07a6419ced1359b897758d9a2f6fd5fbc6f168dd8680f4f7bac854`
- Amendment-act articles: **4**
- Events: **4**
- Affected base articles: `104`
- Inserted base articles: `104-а`
- Unresolved amendment-act articles: `3`, `4`
- Extraction: two-column PDF, `pdftotext -raw`, Gazette entry anchor `911.`
- Human Gate: unresolved/transitional provisions remain pending

## 74/2025
- Official PDF: https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-3i9b.pdf
- SHA-256: `c5289c8e6b015d103bc17beb8686dbaca7b874c2b121888da8927cb320d309ba`
- Amendment-act articles: **26**
- Events: **26**
- Affected base articles:
  `110, 116, 122-а, 134, 162, 173, 190, 191, 210, 212, 213, 213-а, 213-б, 213-в, 213-г, 216, 231, 246, 258, 258-б, 259, 265, 265-а, 266-б, 266-в`
- Inserted base articles: none detected
- Unresolved amendment-act article: `26` (entry-into-force provision)
- Human Gate: unresolved provision remains pending

## 124/2025
- Official PDF: https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-lKlS.pdf
- SHA-256: `a300554b91884449a46ee3b1df2ae168fea9a24e53a12dafa49647e83e0807fd`
- Amendment-act articles: **2**
- Events: **2**
- Affected base article: `212`
- Inserted base articles: none
- Unresolved amendment-act article: `2` (entry-into-force provision)
- Human Gate: unresolved provision remains pending

## Aggregate
- Total amendment events: **32**
- Existing historical article records requiring version review after import: **26 unique articles**
- New inserted article requiring construction/review: **104-а**
- Automatic current-text reconstruction: **NOT PERFORMED**
- Production import: **NOT PERFORMED**

## Safety rule
These events describe how the 2023 snapshot is changed. They do not by themselves establish a verified 2026 consolidated text. A deterministic application pass plus Constitutional Court effect review and Human Gate are required before any article can be promoted to `current_consolidated`.
