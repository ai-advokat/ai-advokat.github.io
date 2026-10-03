# AI Advokat — Corpus Upgrade Roadmap

Date: 2026-10-03  
Owner/Human Gate: attorney Zoran Stojankich  
Platform governance: AI Advokat

## Objective

Raise the **entire Zoran Stojankich material set** to one publication and AI-knowledge standard without collapsing authored commentary into current law.

## Work order

### Wave A — blockers first
1. Close known P1 legal/version findings:
   - Administrative Guide / Guide 53 silence-of-administration deadline;
   - ECtHR V4.1/V4.2 internal version mismatch;
   - Criminal Procedure Manual corporate-liability source wording;
   - any deadline, jurisdiction, admissibility, tariff or remedy statement lacking a current official source.
2. Remove editorial-generation artefacts:
   - “Продолжувам...”
   - planning notes / internal prompts
   - incomplete “Со ова е завршен:”
   - duplicate headings
   - stale edition labels.
3. Record replacement fingerprints after every substantive correction.

### Wave B — Practical Guides
Scope:
- original practical-guide batch;
- Administrative Guide V2;
- FULL Word Guides 38–63.

Upgrade target:
- one canonical title/version per guide;
- exact source/version status;
- official legal sources for high-risk propositions;
- visible “last legal verification” date;
- consistent author/publisher/edition metadata;
- public-download gate separate from registry visibility.

### Wave C — Professional Manuals
Scope:
- Criminal Procedure Manual;
- Civil Procedure Manual.

Upgrade target:
- chapter-level legal-source anchors;
- RATIO case-law register;
- deadline/remedy/jurisdiction audit;
- model/pleading disclaimer discipline;
- consolidated bibliography and normative register;
- refreshed TOC, registers and indexes;
- final render QA;
- chapter-safe RAG segmentation after author approval.

The Civil Procedure Manual already contains a strong source-first rule: models are methodological tools, not substitutes for current-law checking. The editorial-upgrade candidate removes visible drafting-transition artefacts, but it remains a candidate until legal/source closeout.

### Wave D — ECtHR Monograph
Upgrade target:
- V4.2 terminology harmonised everywhere;
- HUDOC as controlling case-law record;
- domestic translations cross-referenced;
- unresolved records remain fail-closed;
- application number/date/paragraph metadata completed;
- Article 41 data separated from merits ratio.

### Wave E — Research Papers
Scope: five-paper first publication round.

Upgrade target:
- MK and UK-English master parity;
- title/subtitle/metadata parity;
- exact bibliography and in-text citation audit;
- DOI/Zenodo/ORCID provenance;
- journal-placement status separated from public repository status;
- no draft DOI described as published.

## AI/RAG migration rule

No authored work enters production RAG until:
- P1 findings = zero;
- author-approved final fingerprint exists;
- section/chapter boundaries are stable;
- legal citations survive chunking;
- each chunk carries document ID, version, jurisdiction, legal area and source status;
- external research is distinguishable from authored corpus retrieval.

## Release matrix

| Layer | May be visible before author approval? | Requires separate Human Gate? |
|---|---:|---:|
| Metadata/audit record | Yes, when truthful | No public-file approval implied |
| GitHub merge | Only with explicit merge approval | Yes |
| Public PDF/DOCX | No | Yes |
| AI/RAG ingest | No | Yes |
| Production D1/corpus write | No | Yes |

## Definition of “one level higher”

A document is not upgraded merely because it looks better. It is upgraded when it is:
- legally traceable;
- source-verifiable;
- version-controlled;
- editorially clean;
- visually publishable;
- citation-complete;
- AI-ingestion safe;
- explicitly approved by the author at the relevant gate.
