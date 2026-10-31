# Macedonian Judicial Publications Industrial Intake

Status: governed staging architecture

This intake extends AI Advokat's judicial corpus without weakening `governedCaseLawContext()`.

Pipeline:

`PDF publication -> SHA-256 -> normalized-text dedupe -> source classification -> page-aware citation candidates -> authority-subtype candidates -> current-law guard -> official-source binding -> Human Gate -> D1 staging -> production citation context`

Rules:
- Supreme Court principled positions, legal opinions, conclusions and headnotes preserve their exact subtype.
- A bulletin or collection is a citable publication source only at the level actually verified from that publication copy.
- An extracted case number is a discovery candidate, not proof of the original judgment.
- Historical material is never silently converted into current law.
- Secondary compilations require primary court/HUDOC binding for material propositions.
- Training/questionnaire material is routed outside case-law authority.
- OCR-poor scans remain quarantined until Macedonian-capable OCR or manual indexing is available.
- Duplicate PDF copies retain provenance hashes but are indexed once.

The batch dated 2026-10-31 is the first multi-court industrial intake using this policy and is designed to accept additional user-supplied batches without changing the authority model.
