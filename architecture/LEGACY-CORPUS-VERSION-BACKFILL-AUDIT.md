# Legacy Corpus Version-Backfill Audit
Date: 2026-10-02
Scope: mk:zkp, mk:zro, mk:zi
Status: PRE-BACKFILL / READ-ONLY ANALYSIS

## Executive finding

The three original production article corpora are not missing. They were imported before migration 0023 made instrument_version_id mandatory for new article rows.

The correct remediation is therefore NOT to re-import blindly. The safe path is:

1. identify the exact snapshot already represented by each article set;
2. reconcile it to a single instrument_versions row;
3. verify counts, article-number integrity and source hash/provenance;
4. backfill instrument_version_id only where the mapping is one-to-one and proven;
5. keep public legal-status claims conservative until Human Gate approves currency.

No production backfill is authorized by this document.

## ZKP — mk:zkp

### Existing production corpus
- production article count historically asserted: 570
- legal instrument key: mk:zkp
- title: Закон за кривичната постапка
- public/legal status during initial intake: needs_version_review / pending
- instrument metadata migration: 0018

### Provenance lineage found in repository history
Official metadata source:
- LDBIS metadata page: https://ldbis.pravda.gov.mk/PregledNaZakon.aspx?id=20679
- official lineage recorded: 150/2010; 100/2012; 142/2016; Constitutional Court decision 193/2016; 198/2018

Article-level consolidated reference:
- workflow was changed to an accessible consolidated PDF:
  https://glasprotivnasilstvo.org.mk/wp-content/uploads/2020/10/ZAKON-ZA-KRIVICHNATA-POSTAPKA.pdf
- workflow version identifier:
  consolidated-reference-through-198-2018-and-cc-193-2016
- issue lineage recorded:
  150/2010; 100/2012; 142/2016; 193/2016; 198/2018
- source issue date recorded by workflow: 2018-10-31
- this is a secondary/reference consolidation, not sufficient by itself to claim current 2026 law.

### Version-backfill classification
Recommended version_class:
- reference_consolidation

Recommended legal status:
- needs_version_review

Recommended Human Gate:
- pending until the 570 production rows are checked against the exact historical source hash used at import.

### Blocking condition
Do not set is_current=1 merely because the LDBIS base law is active. The article-level text represents a historical/reference consolidation through the cited 2018 lineage.

## ZRO — mk:zro

### Existing production corpus
- production article count historically asserted: 298
- title: Закон за работните односи
- article-level corpus was activated before mandatory version binding.

### Provenance lineage found in repository history
Canonical consolidated snapshot:
- Ministry-hosted PDF:
  https://portal.mdt.gov.mk/post-body-files/zakoni-met-file-LaRm.pdf
- later repository reconciliation describes it as:
  consolidated snapshot through Official Gazette 111/2023
- repository note explicitly says:
  historical snapshot; not promoted as current 2026 law.

Additional work exists for a 2025 amendment source, but the 298-row article set must not be assumed to incorporate later amendments unless the derived corpus is proven to do so.

### Version-backfill classification
Recommended version_class:
- dated_snapshot (or official_consolidated only if source status and consolidation authorship are independently confirmed)

Recommended legal status:
- historical or needs_version_review, depending on exact row metadata already stored.

Recommended Human Gate:
- pending until the exact source SHA-256 and article set correspondence are reproduced.

### Blocking condition
Do not label the 298-row snapshot current_consolidated unless all amendments after the snapshot date are reconciled and Human Gate approves the resulting current text.

## ZI — mk:zi

### Existing production corpus
- production article count: 258
- title: Закон за извршување
- source parser reached article number 269 while correctly omitting abolished/missing article numbers; 258 records is the expected record count.
- initial import rows were needs_version_review / pending.

### Exact official snapshot evidence
Official PDF:
- https://portal.mdt.gov.mk/post-body-files/zakoni-izvrsuvanje-file-zhwP.pdf

Verified SHA-256 used by production workflow:
- 15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55

Recorded lineage:
- 72/2016
- 142/2016
- 178/2017
- 26/2018
- 233/2018
- 14/2020
- 136/2020
- 154/2023

Recorded source issue date:
- 2023-07-20

Recorded workflow version labels:
- metadata version_id: official-editorial-consolidated-through-154-2023
- inserted instrument version label: official-editorial-consolidated-through-154/2023

### Version-backfill classification
Recommended version_class:
- dated_snapshot unless the official source itself establishes a formally consolidated current text;
- the term official/editorial consolidation must not automatically become current_consolidated.

Recommended legal status:
- needs_version_review

Recommended Human Gate:
- pending

### Strongest candidate for first backfill
ZI is the best first controlled backfill because the repository contains:
- exact source URL;
- exact SHA-256;
- explicit expected article count (258);
- zero parser warnings in the activation workflow;
- explicit lineage metadata;
- known omitted range 240-244;
- exact terminal article 269.

## Safe order

1. ZI
2. ZRO
3. ZKP

Reason:
- ZI has the strongest reproducible source evidence.
- ZRO has an official ministry-hosted snapshot but needs amendment/currency reconciliation.
- ZKP article text is based on a secondary/reference consolidation and therefore requires the most conservative version classification.

## Required production preflight before any UPDATE

The backfill must execute only if each instrument has exactly one legacy NULL-version group and the expected article count:

- ZI = 258
- ZRO = 298
- ZKP = 570

The target instrument_versions row must also be unique by instrument_id + version_label.

If any count differs, STOP.

## Post-backfill invariant

After each law:
- zero NULL instrument_version_id rows remain for that instrument;
- article count is unchanged;
- article numbers are unchanged;
- source_url/source_sha256 per article are unchanged;
- no article is marked current_consolidated by the backfill itself;
- /api/articles resolves exactly one version;
- /api/assistant continues to fail closed when version resolution is unsafe.

## Human Gate

This audit authorizes preparation of a staged migration and read-only preflight only.

It does NOT authorize:
- production UPDATE;
- is_current promotion;
- current_consolidated promotion;
- new legal-currency claims;
- replacement of source text;
- deletion/re-import of legacy corpora.
