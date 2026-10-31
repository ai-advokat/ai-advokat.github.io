# AI Advokat — Апелационен суд Штип Case-Law Citation Corpus v2

Status: RELEASE CANDIDATE · HUMAN GATE REQUIRED  
Corpus ID: `as-stip-bulletins-v2`  
Schema: `AS_ST_CASE_LAW_CITATION_V2.1`

## Mandate

Transform the user-supplied official court bulletins of Апелационен суд Штип into a searchable citation-grade research corpus without promoting a bulletin extract into a remotely verified original judgment.

## Source boundary

The release candidate contains 388 bulletin-derived decision records from six supplied bulletins. Each record preserves the source PDF SHA-256, page locator, case number, extracted court headnote/holding, legal references where present, citation text and retrieval aliases.

A bulletin record may be used only according to its verified provenance state:

1. `bulletin_source_verified` — the proposition/metadata is traceable to the supplied court bulletin copy;
2. `official_candidate_match` — a real official Supreme Court URL has been discovered for the referenced number, but the original has not yet been hash-bound and approved;
3. `official_binding_verified` — only after direct official retrieval, SHA-256 verification and Human Gate approval;
4. `production_citable` — only after the existing AI Advokat case-law authority and provenance gates are satisfied.

No stage may invent a URL, decision number, date, ECLI or subsequent treatment.

## Record model

Required fields in this corpus include:
- court / court level / jurisdiction;
- domestic case number and retrieval aliases;
- decision date when legible, preserving invalid/missing dates as QC flags rather than silently repairing them;
- decision type, section and legal area;
- official bulletin headnote as `holding`;
- cited laws/articles when extractable;
- first-instance and Supreme Court references;
- citation text;
- source filename, PDF SHA-256 and page locator;
- chunk SHA-256;
- Human Gate and production eligibility state.

## Extraction scope

Bulletin 6 is section-aware: its introduction states a bounded domestic set of 50 decisions. The extraction is limited to that domestic decision section and does not convert later ECHR material or analytical articles into domestic appellate decisions.

Historical republication duplicates are retained as separate provenance occurrences and surfaced in `duplicates.json`; they are not silently deleted.

## Official case-number resolver

`match-mk-supreme-case-number.mjs` does not crawl or construct URLs. It compares normalized case-number aliases against candidate URLs actually discovered by the existing bounded Supreme Court collector. A result can be:
- `official_candidate_match`;
- `ambiguous`;
- `unresolved`.

Even an exact candidate match remains `official_binding_verified=false` until the existing direct-retrieval SHA-256 + Human Gate procedure is completed.

## Runtime integration

The existing `governedCaseLawContext()` remains the production authority gate. It only exposes reviewed/approved case law with official source provenance where `official_binding_verified=1` and `discovery_only=0`. This corpus does not weaken that rule.

## Current QC

The release candidate intentionally preserves unresolved issues for Human Gate, including missing/invalid dates and low endpoint confidence. The validator rejects any release pack that falsely marks these records production-eligible or official-bound.

## Release path

`bulletin extraction -> deterministic validator -> official lookup queue -> bounded Supreme discovery -> case-number matcher -> direct retrieval/hash binding -> Human Gate -> existing D1 staging/import -> authority review -> production citation context`

No automatic filing, legal attestation or production promotion is part of this workflow.
