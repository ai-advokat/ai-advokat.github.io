# AI Advokat Global Legal Corpus Roadmap

Status: LOCKED ORDER

## Phase 1 — North Macedonia

Complete Macedonian law first:
- Official Gazette public legal material
- LDBIS current/active/consolidated versions
- Ministry of Justice regulatory material
- ENER proposals and consultation history, separated from law in force
- Constitutional Court
- Supreme Court
- publicly available ordinary-court sources

Primary retrieval unit: one legal article.
Hierarchy: instrument -> version -> article -> paragraph -> item/subitem.
Current-law priority: official consolidated text -> active consolidated LDBIS version -> verified amendment chain -> Human Gate.

Do not advance until source coverage, version integrity, amendment lineage, article chunking and Human Gate sampling pass.

## Phase 2 — Balkan law

Build jurisdiction-separated corpora for:
- Albania
- Bosnia and Herzegovina, including relevant state/entity/district layers
- Bulgaria
- Croatia
- Greece
- Kosovo
- Montenegro
- Romania
- Serbia
- Slovenia
- Turkey, where included in the Balkan comparative scope

For each jurisdiction:
- official gazette / legislation portal
- official consolidated/current-law source where available
- constitutional and supreme/high courts
- public case-law databases
- ministry/parliament regulatory sources
- EU-law linkage where applicable
- exact language and translation metadata

Rules:
- never mix jurisdictions in one authoritative chunk;
- preserve original-language text;
- translations are separate derived records;
- distinguish national, entity, federal, regional and EU legal authority;
- model effective dates and amendment chains per jurisdiction;
- treat secondary/commercial portals as discovery/reference only unless reuse is explicitly permitted.

## Phase 3 — European law

- EUR-Lex
- Court of Justice / General Court (InfoCuria)
- HUDOC / ECHR
- Council of Europe legal instruments
- other official EU institutional legal sources

Same provenance, version and article/paragraph discipline.

## Phase 4 — Common-law / Anglo-Saxon law

Initial jurisdictions:
- United Kingdom
- United States
- Canada
- Australia
- New Zealand

Use common-law-specific models:
- statute/version
- judgment
- court hierarchy
- precedential status
- cited authorities
- ratio / holdings where deterministically extractable
- jurisdiction-specific date and citation formats

## Phase 5 — International / world law

- UN Treaty Collection
- International Court of Justice
- International Criminal Court
- WTO
- WIPO Lex
- ILO NORMLEX
- UNCITRAL
- other official treaty, tribunal and international-organization repositories

## Universal source rule

Public does not automatically mean unrestricted bulk-copy permission.
Every source gets one ingest policy:
- public_fulltext
- public_metadata
- public_index_only
- link_only
- no_crawl

No paywall bypass, credential reuse, private-data collection, reverse engineering or proprietary-corpus copying.
