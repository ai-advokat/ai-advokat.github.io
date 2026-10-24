# LEGAL_DOCUMENT_EXPORT_V1 — Draft PR-B

Status: **DRAFT / ISOLATED / PRODUCTION NO-GO**

## Purpose

PR-B turns the successful local TEST LAB v0.1-v0.3 proof-of-concept into a reusable legal-document domain and export adapter.

It does **not** replace the existing CasePilot export engine and does not introduce professional DOCX styling. The existing `src/case-export.js` remains the canonical export/container contract. PR-B adds a governed Legal Document AST above it.

## Boundaries

PR-B owns:

- structured Legal Document AST;
- facts, evidence, legal bases, arguments, contradictions, petitum, attachments and blockers;
- evidence analysis: what a document supports, what it does not prove, and what still requires verification;
- formal unresolved contradiction state;
- WORKING vs PROFESSIONAL release gate;
- separate court-document and internal Review Annex reports;
- adapter reuse of the existing CasePilot DOCX export contract;
- structural DOCX and semantic visual-control tests.

PR-B explicitly does **not** own:

- professional typography or court style packs;
- advanced DOCX numbering and layout redesign;
- headers/footers/page-number styling;
- a new production API route;
- filing, signature or external transmission;
- migrations, secrets or provider activation.

Those formatting concerns remain for a separately authorized PR-C.

## Legal Document AST

Version: `1.0.0`.

Core collections:

- `parties`
- `facts`
- `evidence`
- `legalBases`
- `arguments`
- `contradictions`
- `petitum`
- `attachments`
- `blockers`
- `humanGate`

Every cross-reference is validated. Unknown evidence, fact, legal-basis or attachment references fail closed.

## Authority and hallucination boundary

The adapter never generates a statute article, case number, court decision, fact or evidence item.

An authoritative legal citation may enter the court report only when:

1. the legal basis is explicitly `verified`; and
2. its authority source is present and explicitly `verified`.

Unverified legal propositions remain in the internal Review Annex and are not promoted into authoritative court citations.

## Court document vs Review Annex

The court report contains:

- court and parties;
- factual basis;
- evidence proposals;
- legal argument;
- verified legal bases only;
- petitum;
- attachments.

The separate Review Annex contains:

- detailed evidence limitations;
- unresolved/resolved contradictions;
- legal bases still requiring verification;
- petitum review state;
- PROFESSIONAL blockers.

The Review Annex is always a WORKING internal document and is never a filing artifact.

## WORKING mode

WORKING export is allowed while review items remain open.

The existing CasePilot export contract places a visible:

`WORKING COPY — HUMAN GATE PENDING`

warning in the export.

WORKING does not imply legal validity, court readiness or Human Gate approval.

## PROFESSIONAL mode

PROFESSIONAL is fail-closed.

It requires all of the following:

- recorded approved Human Gate with reviewer, timestamp and decision reference;
- no unresolved required contradiction;
- no required unverified/missing material fact;
- disputed required facts covered by a recorded contradiction resolution;
- verified required evidence;
- verified source behind required evidence;
- verified required legal basis;
- verified authority source behind required legal basis;
- approved required legal arguments;
- approved required petitum items;
- all mandatory blockers resolved.

A client/payload Human Gate value cannot override a server-supplied Human Gate state.

## Existing CasePilot export contract

PR-B deliberately imports and reuses:

- `normalizeCaseExportReport`
- `renderCaseExportDocxBytes`
- `caseExportBlocks`

from `src/case-export.js`.

PR-B does not modify that file.

This preserves existing CasePilot export behavior and keeps PR-C free to focus only on professional DOCX presentation if separately authorized.

## Visual control in PR-B

Because PR-C owns typography/layout redesign, PR-B's visual-control scope is semantic and structural:

- warning appears immediately after the document title;
- court document contains facts, petitum and attachments;
- internal Review Annex content never enters the court report;
- Review Annex visibly identifies itself as internal/not-for-filing;
- Macedonian Cyrillic survives the DOCX OpenXML package;
- the underlying DOCX container remains the existing CasePilot implementation.

Pixel-perfect professional styling remains outside PR-B.

## Security / production status

PR-B adds:

- no provider calls;
- no `fetch()`;
- no database writes;
- no migrations;
- no secrets operations;
- no deploy operation;
- no filing/signature/transmission path;
- no production route.

PR #386 and PR #387 remain outside this branch.

**PRODUCTION NO-GO until a separate owner decision after independent review.**
