# ZI current-law source audit — 2026-10-11

Instrument: `mk:zi` — Закон за извршување  
Status: **CURRENT TEXT CANDIDATE / NOT HUMAN-GATE APPROVED**

## Executive finding

The repository's 258-article ZI snapshot is anchored to the official Ministry-hosted / Official Gazette editorial consolidated PDF. The PDF itself identifies the permanent source/effect lineage incorporated in the consolidation:

- base law 72/2016;
- amendment 142/2016;
- Constitutional Court U.br.143/2016, published 178/2017;
- Constitutional Court U.br.135/2016, published 26/2018;
- amendment 233/2018;
- amendment 14/2020;
- Constitutional Court U.br.94/2019, published 136/2020;
- amendment 154/2023.

This reconciles the repository snapshot provenance and confirms that 178/2017, 26/2018 and 136/2020 are Constitutional Court effects, not ordinary amendment acts.

## Current official-source check

The Ministry of Justice's current execution-law page still exposes:
- the editorial consolidated Execution Act;
- enacted amendment acts through Official Gazette 154/2023.

A 2025 proposal/preparation notice exists, but the official sources checked for this audit did not identify a later enacted amendment to the Execution Act. This is a bounded finding, not a claim that no later act can exist outside the checked official surfaces.

LDBIS record 63684 identifies amendment 154/2023 as published 20.07.2023, entering into force and applying from the same date.

## 2020 emergency overlay

Official/court materials sometimes cite Official Gazette 86/2020 in the broader statutory history. The official editorial-consolidation footnote does **not** list 86/2020 as a permanent constituent amendment/effect. It was an emergency-period application overlay and must remain a separate historical temporal layer, not be silently folded into the permanent current text.

## Constitutional Court state

Final effects already incorporated in the editorial text:
- U.br.143/2016 → OG 178/2017;
- U.br.135/2016 → OG 26/2018;
- U.br.94/2019 → OG 136/2020.

Recent review outcomes checked:
- U.br.44/2026, Article 9 — no proceedings initiated;
- U.br.45/2025, Article 86(1) first sentence — no proceedings initiated;
- U.br.56/2025, Article 71(1)(b) — no proceedings initiated;
- U.br.146/2024, Article 13(2) phrase "и заклучок" — initiative dismissed on 23.09.2026.

### Pending constitutional review — Article 218

U.br.86/2025 initiated constitutional review of Article 218 on 21.01.2026. No final repeal/annulment effect was identified in the official Constitutional Court material reviewed for this audit.

Therefore:
- Article 218 remains in the retrieved consolidated text;
- AI Advokat must not describe it as repealed;
- any answer materially relying on Article 218 must surface a **pending constitutional review** warning until a final outcome is bound.

## Promotion decision

Do **not** mark ZI `PRODUCTION_READY` yet.

The following are now supported:
- official source bound;
- article-level text present;
- exact version binding;
- permanent amendment/effect lineage reconciled through 154/2023;
- known final Constitutional Court effects incorporated.

Remaining gates:
1. full constituent date/application matrix;
2. final Human Gate comparison of all 258 article records to the official editorial PDF;
3. Article 218 pending-review warning integration;
4. immediate official-source re-check before promotion.

No current-law promotion is authorized by this audit.
