# AI Advokat — Public PDF Release Decision

**Date:** 4 October 2026  
**Decision ID:** `all-guides-public-pdf-release-2026-10-04`  
**Scope:** all 39 public guide catalogue records, PDF only

## Decision

The project lead explicitly authorized every public practical guide to be openable as a full PDF so that a citizen can read the complete procedure.

This opens the **public PDF release Human Gate** for all 39 catalogue records.

## Asset rule

Authorization is not enough to expose an arbitrary URL. A guide becomes publicly openable only when:

1. the exact source file is identified and fingerprint-checked;
2. the PDF is generated or selected from the approved source/master;
3. the PDF SHA-256 is recorded;
4. the public URL resolves successfully;
5. the catalogue record is updated with `public_pdf` and `public_pdf_sha256`.

Until those checks pass, the record may say PDF release is authorized, but it must not expose a broken or placeholder PDF link.

## Separate gates that remain closed

This decision does **not** authorize:

- public DOCX release;
- RAG eligibility;
- AI corpus ingestion;
- production corpus write;
- legal corpus promotion;
- GPT/provider activation.

## Citizen-facing rule

Where a PDF is active, the catalogue and detail record must show a direct **„Отвори PDF“ / „Отвори цел PDF“** action.

Legal warnings and version notices remain visible. The PDF is a practical/secondary source and is not presented as the official law text.
