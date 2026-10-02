# ZPP version timeline / legal status card

A bilingual card in the Legal Base section. It shows which text of the **Закон за парничната постапка (ZPP)** relates to which period.

- **Data:** `assets/zpp-timeline.js`
- **Rendering:** `renderZppTimeline()` in `index.html`
- **Tests:** `test/zpp-timeline.test.mjs`

## Official metadata shown (human-verified, LDBIS)

| Item | Gazette | Published | Entry into force | Applicable from | Other |
|---|---|---|---|---|---|
| Consolidated version (Пречистена верзија) | 7/2011 | 20.01.2011 | not stated in the metadata | not stated in the metadata | — |
| Amending law | 124/2015 | 23.07.2015 | 31.07.2015 | 31.01.2016 | Termination shown by LDBIS: 18.01.2027 |
| New law | 151/2026 | 08.07.2026 | 16.07.2026 | 18.01.2027 | — |

Dates the metadata does not state are shown as **“not stated”**. They are never guessed.

## Status wording (as of 02.10.2026)

| Item | Phase label |
|---|---|
| 7/2011 | Historical / reference text |
| 124/2015 | Applicable track until 151/2026 begins to apply · **not confirmed as a current consolidated text** |
| 151/2026 | **Published and in force; application begins 18 January 2027** |

- The UI never calls the pre-2027 track “current consolidated”. The backend has not authorised that status: the instrument is Human Gate *pending*.
- The 151/2026 law is never presented as already applicable.

## Human Gate

- Read from `/api/instruments` (`mk:zpp`, instrument level).
- If the registry does not answer, the card says **“unknown (registry unavailable)”**. It is never assumed approved.
- The data file stores no Human Gate value.

## Staleness: no clock-based legal reasoning

The phase labels are statements valid **as of `statusAsOf` (2026-10-02)**. They are not recomputed from today's date.

- After `statusReviewBy` (**2027-01-17**, the day before the new law begins to apply), every phase label is withdrawn and replaced by **“RE-CHECK REQUIRED”**.
- The labels stay withdrawn until a human updates `assets/zpp-timeline.js` and its tests.
- This prevents the card from silently becoming wrong on 18.01.2027.

## “Entry into force ≠ start of application”

An explanatory box states in plain language that:
- a law can enter into force before its provisions begin to apply;
- the ZPP 151/2026 example shows it (in force 16.07.2026, applies from 18.01.2027).

The card also flags that the transitional provisions of 151/2026 are **not** shown, for example those for proceedings started before 18.01.2027.

## Known backend gap (not changed here)

`migrations/0019_law_intake_batch_1.sql` still seeds the pre-2027 version with `valid_to = '2027-01-17'`. Under exclusive `valid_to` that leaves a one-day gap on fresh setups. A forward-migration fix was proposed earlier; it belongs to the corpus workstream. The timeline card does not depend on it.
