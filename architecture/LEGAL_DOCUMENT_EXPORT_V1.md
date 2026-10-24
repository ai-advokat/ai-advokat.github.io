# LEGAL_DOCUMENT_EXPORT_V1 — Draft PR-B

Status: **DRAFT / ISOLATED / PRODUCTION NO-GO**

## Purpose

PR-B turns the successful local TEST LAB v0.1-v0.3 proof-of-concept into a reusable legal-document domain and export adapter.

It does **not** replace the existing CasePilot export engine and does not introduce professional DOCX styling. The existing `src/case-export.js` remains the canonical export/container contract. PR-B adds a governed Legal Document AST above it. Final independent review adds one backward-compatible low-level block renderer to that engine so PR-B can produce a sanitized Court DOCX without changing the existing CasePilot default export behavior.

## Boundaries

PR-B owns:

- structured Legal Document AST;
- facts, evidence, legal bases, arguments, contradictions, petitum, attachments and blockers;
- evidence analysis: what a document supports, what it does not prove, and what still requires verification;
- formal unresolved contradiction state;
- WORKING vs PROFESSIONAL release gate;
- separate court-document and internal Review Annex reports;
- adapter reuse of the existing CasePilot DOCX export contract;
- sanitized Court DOCX output that excludes internal governance/review metadata;
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

The Court DOCX intentionally excludes Internal Review Annex content, Human Gate reviewer/timestamp/decision-reference metadata, internal `Status:` markers, Source Manifest, Provenance appendix and source-ID/locator lines. These remain available in the internal review/export model where appropriate.

## WORKING mode

WORKING export is allowed while review items remain open.

The PR-B Court profile places a visible:

`WORKING DRAFT — NOT FOR FILING`

warning in the Court DOCX without exposing Human Gate metadata. The unchanged default CasePilot export continues to use its existing `WORKING COPY — HUMAN GATE PENDING` governance warning.

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
- `renderCaseExportDocxBlocksBytes`
- `caseExportBlocks`

from `src/case-export.js`.

The final-review change to `src/case-export.js` is backward-compatible: it exposes a low-level DOCX block renderer while leaving the existing `renderCaseExportDocxBytes(report)` behavior unchanged. Concrete CasePilot regression fixtures verify that the default CasePilot DOCX still emits its Source Manifest, Human Gate and Provenance appendix.

This preserves the existing CasePilot contract while allowing PR-B to sanitize only the Court DOCX content profile. PR-C remains limited to professional presentation/styling if separately authorized.

## Visual control in PR-B

Because PR-C owns typography/layout redesign, PR-B's visual-control scope is semantic and structural:

- warning appears immediately after the document title;
- court document contains facts, petitum and attachments;
- internal Review Annex content never enters the Court DOCX;
- Human Gate reviewer/decision metadata, internal statuses, Source Manifest and Provenance appendix do not enter the Court DOCX;
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

Final independent review additionally covers forged/invalid Human Gate metadata, duplicate/missing AST references, court/review zero-leak assertions and a concrete CasePilot matter regression fixture.

PR #386 and PR #387 remain outside this branch.

**PRODUCTION NO-GO until a separate owner decision after independent review.**
