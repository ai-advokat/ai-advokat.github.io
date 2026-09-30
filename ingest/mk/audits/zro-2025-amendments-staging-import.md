# ZRO 2025 Amendments — Staging Import Audit

Date: 2026-09-29
Instrument key: `mk:zro`
Environment: **staging only**
Workflow run: `36640903432`
Result: **SUCCESS**

## Imported amendment events

| Gazette issue | Events | Source SHA-256 |
|---|---:|---|
| 39/2025 | 4 | `d112e2449a07a6419ced1359b897758d9a2f6fd5fbc6f168dd8680f4f7bac854` |
| 74/2025 | 26 | `c5289c8e6b015d103bc17beb8686dbaca7b874c2b121888da8927cb320d309ba` |
| 124/2025 | 2 | `a300554b91884449a46ee3b1df2ae168fea9a24e53a12dafa49647e83e0807fd` |

Total amendment events: **32**

## Article review state

Post-import assertions:
- `needs_version_review`: **26**
- `current_consolidated`: **0**
- inserted article requiring construction: `104-а`
- unresolved transitional / entry-into-force amendment provisions remain Human Gate pending

The 26 existing article records include Article 104 and the unique existing articles affected by the 74/2025 and 124/2025 amendment chain. Article 212 is affected by both 74/2025 and 124/2025 but is counted once at article-review level.

## Safety

- Target database: `ai-advokat-db-staging`
- Binding: `PREVIEW_DB`
- Database ID: `eb560e98-9fc0-408e-9c81-9b823ffde44d`
- Production D1 was **not targeted**.
- No article was promoted to current law.
- No deterministic amendment application has yet been accepted as authoritative.
- Human Gate remains required before any candidate current version may be promoted.

## Next gate

Generate one Human Gate review packet per affected article containing:
1. 2023 historical article text;
2. all 2025 amendment events affecting it, in chronological order;
3. inserted/replaced/deleted text instructions;
4. source issue, date, effective/application date, URL and hash;
5. candidate reconstruction field;
6. reviewer decision and notes.

For inserted Article 104-а, the packet begins without a base historical article and must be constructed from the insertion event.
