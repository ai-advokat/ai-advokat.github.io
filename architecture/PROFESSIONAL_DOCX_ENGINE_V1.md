# PROFESSIONAL_DOCX_ENGINE_V1 — Draft PR-C

Status: **DRAFT / STACKED ON PR-B / PRODUCTION NO-GO**

## Dependency and exact base

PR-C is intentionally stacked on Draft PR #388.

- Parent PR: #388 — LEGAL_DOCUMENT_EXPORT_V1
- Parent branch: `feat/legal-document-export-v1-pr-b-20261024`
- Exact parent HEAD: `f649672172e5b558f5f89084684949cc5590ca0b`

PR-C must not be rebased onto `main` while PR-B remains unmerged, because its renderer consumes the PR-B Legal Document AST and fail-closed export contract.

The PR-C pull request therefore targets the PR-B branch, not `main`. This keeps the PR-C diff limited to the professional DOCX layer.

## Purpose

PR-C converts the governed legal-document structure from PR-B into a professionally structured Word/OpenXML document.

It does not change source selection (PR-A), substantive document governance (PR-B), legal-quality adjudication (future PR-D), or production activation.

## Dedicated court profile

Profile: `legal-court-v1`

- A4: 11906 × 16838 twips
- Verdana 10 pt
- 25 mm margins
- controlled paragraph spacing
- 1.15 line spacing
- native Word Roman numbering for legal sections
- independent native Word decimal numbering for facts, law, evidence, petitum and attachments
- page-number-only footer
- generic non-case-specific DOCX core properties

## Court structure

The Court DOCX contains:

1. court
2. parties
3. subject
4. pleading heading
5. facts
6. legal basis / argument
7. evidence proposals
8. petitum
9. attachments
10. place/date/signature

WORKING mode visibly shows:

`РАБОТЕН НАЦРТ — НЕ Е ЗА ПОДНЕСУВАЊЕ`

PROFESSIONAL mode can be rendered only when PR-B already reports `professionalReady=true`.

## Native numbering

PR-C uses a real `word/numbering.xml`.

- legal section headings: `upperRoman`
- facts: decimal list, independent `numId`
- legal basis: decimal list, independent `numId`
- evidence: decimal list, independent `numId`
- petitum: decimal list, independent `numId`
- attachments: decimal list, independent `numId`

No visual numbering is simulated with manually typed prefixes.

## Layout controls

The engine emits:

- `keepNext` for headings and structural labels;
- `keepLines` for body/list paragraphs;
- `cantSplit` for the court/party/subject metadata table;
- controlled section order and A4 page settings.

Professional typography is isolated in `src/professional-docx-engine.js`; CasePilot default styling is not changed.

## Zero-leak boundary

Court DOCX is a separate OOXML package and must not contain:

- Internal Review Annex text;
- Human Gate reviewer, timestamp or decision reference;
- internal status fields;
- source IDs or locators;
- Source Manifest;
- Provenance appendix;
- comments;
- custom XML.

Core document properties are generic and do not contain case IDs or review data.

The footer contains only a page-number field.

The Internal Review Annex is generated as a separate DOCX and may contain the review/governance information required by the lawyer.

## CasePilot compatibility

PR-C does not import or invoke the CasePilot DOCX renderer.

Existing CasePilot export remains governed by `src/case-export.js` and is regression-tested separately.

The parent PR-B compatibility hook remains part of PR-B, not a PR-C styling dependency.

## Security and production boundary

PR-C adds no:

- provider call;
- `fetch()`;
- database access;
- migration;
- secret operation;
- filing action;
- signature action;
- external transmission;
- production route;
- deploy workflow.

All fixtures are synthetic.

## Future PR-D

PR-D remains responsible for substantive legal-quality control, not Word styling.

**PRODUCTION NO-GO until separate integration review and explicit owner activation decision.**
