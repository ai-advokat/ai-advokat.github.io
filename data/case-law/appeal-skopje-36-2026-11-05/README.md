# Appellate Court Skopje - 36 criminal decisions (2026-11-05 intake)

Status: DISCOVERY ONLY - HUMAN GATE REQUIRED

This package was supplied by the user as a ZIP containing 36 files named `.crdownload`. Binary preflight confirmed that all 36 files are complete PDF documents with valid PDF headers and EOF markers. All 36 are machine-readable; OCR was not required.

## Integration

- Internal AI Advokat: enabled as governed discovery context.
- External AI Advokat bot: enabled through the same governed backend discovery context.
- Reviewed case-law authority pipeline: unchanged and higher priority.
- Source role: discovery only until official item-level remote binding and Human Gate review.

The lightweight runtime registry intentionally indexes case number, decision date, legal issue and page count, but not party names.

## Authority boundary

A user-supplied copy of a court decision is not automatically promoted to reviewed legal authority. Before authoritative citation, AI Advokat requires verification of the original official court item, exact holding, finality where relevant, source binding/provenance and Human Gate approval.

## Coverage

36 KOKZH-series criminal decisions of Appellate Court Skopje, dated 2022-2025, including topics such as money laundering, migrant smuggling, narcotics, abuse of office, bribery, criminal association, fraud and procedural detention issues.

Runtime registry: `src/appeal-skopje-36-discovery.js`
Master corpus registration: `data/case-law/mk-master-judicial-corpus-2026-11-04.json`
Tests: `test/appeal-skopje-36-discovery.test.mjs`
