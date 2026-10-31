# Macedonian Judicial Publications Industrial Intake

Status: governed staging architecture

This intake extends AI Advokat's judicial corpus without weakening `governedCaseLawContext()`.

Pipeline:

`PDF publication -> SHA-256 -> normalized-text dedupe -> source classification -> page-aware citation candidates -> authority-subtype candidates -> current-law guard -> official-source binding -> Human Gate -> D1 staging -> production citation context`

Rules:
- Supreme Court principled positions, legal opinions, conclusions and headnotes preserve their exact subtype.
- Appellate bulletins preserve separate lanes for decision/headnote material, department conclusions, joint-appellate conclusions and professional articles.
- Joint meetings of the appellate courts are interpretive coordination material and are never silently relabelled as ordinary judgments or Supreme Court precedent.
- A bulletin or collection is a citable publication source only at the level actually verified from that publication copy.
- An extracted case number is a discovery candidate, not proof of the original judgment.
- Historical material is never silently converted into current law.
- Where an appellate bulletin cites a Supreme Court review/revision decision, that Supreme reference enters an official-binding queue; it is not automatically treated as verified.
- Secondary compilations require primary court/HUDOC binding for material propositions.
- Training/questionnaire material is routed outside case-law authority.
- Image-only or OCR-poor Macedonian scans remain quarantined for visual/manual indexing instead of low-confidence OCR.
- Duplicate PDF copies retain provenance hashes but are indexed once.
- Cross-batch duplicate publications are retained as provenance aliases and do not increment canonical coverage counts.

Current controlled batches:
- `mk-judicial-publications-batch-2026-10-31` - Supreme Court archive, Skopje Bulletins 9-10, ECHR/professional references and historical collections.
- `mk-appellate-publications-batch-2026-10-31-b2` - Bitola bulletins, Skopje Bulletins 1-8, Gostivar Bulletin 2 and joint appellate meeting materials.

The intake is designed to accept additional user-supplied batches without changing the authority model. Production use remains subject to the existing official-source, current-law and Human Gate controls.
