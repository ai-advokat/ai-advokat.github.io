# AI Advokat Professional Publication Standard

Version: 1.0  
Date: 2026-10-03  
Scope: all authored legal guides, manuals, monographs and professional working materials of attorney Zoran Stojankich prepared for AI Advokat / Paragraf.mk.

## 1. Core doctrine

AI Advokat separates four layers that must never be collapsed:

1. **Official law** — legislation, official consolidated texts and authoritative institutional material.
2. **Verified case law** — decisions checked against the full source text and cited with exact court, number, date and, where available, ECLI/application number.
3. **Authored professional material** — guides, manuals, commentary, methodology, models and checklists written by the author.
4. **AI assistance** — drafting, structure, retrieval, quality control and research support under explicit human control.

Authored material is not presented as legislation or as a substitute for current-law verification.

## 2. Publication lifecycle

Every work must move through explicit states:

`draft -> structural_review -> legal_source_review -> corrected_candidate -> author_approved -> publication_master`

Optional downstream states:

`publication_master -> public_release`

`publication_master -> rag_eligible -> rag_ingested`

No downstream state is inferred from a previous one.

## 3. Human Gates

Separate explicit Human Gates are required for:

- author approval of a corrected candidate;
- public release of a PDF/DOCX;
- promotion to AI/RAG knowledge;
- production corpus/D1 writes;
- superseding a prior publication master.

GitHub merge, public release and production corpus activation are distinct decisions.

## 4. Source hierarchy

For a legal proposition, use the strongest available source:

1. official legislation / official consolidated or editorial-consolidated text;
2. official full-text court decision;
3. HUDOC for ECtHR case-law records;
4. EUR-Lex / CURIA for EU law and CJEU materials;
5. official regulator / ministry / public-body material;
6. secondary commentary only as orientation, not as controlling authority.

Every current-law claim that can materially affect rights, deadlines, jurisdiction, admissibility, sanctions, remedies or procedural strategy must carry a version/date check.

## 5. RATIO protocol for case law

Case-law entries use one of these statuses:

- **DIRECT RATIO** — the holding directly resolves the proposition;
- **INDIRECT** — contextual or analogous support only;
- **NO DIRECT PRACTICE** — no verified direct authority located;
- **NEEDS VERIFICATION** — not usable as authority until the full text is checked;
- **MISPLACED** — authority belongs under another proposition/chapter.

A case is never cited from a headline, search snippet or memory alone.

Minimum metadata:
- court;
- case number;
- decision date;
- ECLI/application number where available;
- full-text source;
- pinpoint paragraph/page where feasible;
- ratio status;
- verification date.

## 6. High-risk legal fields

The following always require a final current-law pass:

- procedural deadlines and limitation/preclusion periods;
- jurisdiction and admissibility;
- detention, deprivation of liberty and criminal-procedure guarantees;
- remedies and extraordinary remedies;
- eligibility tests and financial thresholds;
- tariffs, fees and costs;
- notarial form requirements;
- administrative silence and special procedures;
- enforcement conditions;
- legal status after constitutional-court or legislative intervention.

## 7. Editorial quality gate

Before publication:
- remove drafting artefacts such as “Продолжувам...”, “ќе ја обработам...”, internal prompts or planning notes;
- remove incomplete transitions such as “Со ова е завршен:” without the completed section reference;
- eliminate duplicated headings and stale version labels;
- harmonise title, subtitle, author, publisher, edition and date;
- refresh TOC and internal references;
- verify chapter/part counts;
- verify registers and indexes;
- ensure forms/models are labelled as adaptable examples rather than mechanically reusable pleadings.

## 8. Citation and bibliography gate

A professional manual/monograph should include, as applicable:

- normative-source register;
- case-law register;
- ECtHR/EU register;
- source/version log;
- verification date;
- bibliography/secondary sources;
- provenance note for adapted or conceptually referenced external works.

Long-form professional works should not rely only on generic “check the current law” warnings where precise authority can reasonably be supplied.

## 9. Provenance and versioning

Each source file receives:
- immutable document ID;
- edition/version;
- file name;
- SHA-256;
- file size;
- source role;
- supersedes/superseded-by relation where applicable;
- author approval status;
- public-release status;
- AI/RAG eligibility.

Old versions are retained as history unless there is a separate reason to remove them.

## 10. AI/RAG eligibility

A document is not RAG-eligible merely because it is useful.

Minimum requirements:
- P1 findings closed;
- final file fingerprint recorded;
- author approval recorded;
- source/version status recorded;
- chapter/section boundaries stable;
- legal-source citations preserved at chunk level;
- authored commentary clearly separated from official law.

If the corpus does not support a proposition, AI Advokat must say so. Outside research is separately labelled.

## 11. Publication-master QA

Before release:
- DOCX render inspection;
- no clipping, overlap, broken tables or missing glyphs;
- TOC refreshed/materialised;
- headers/footers and page numbering checked;
- all hyperlinks tested where present;
- accessibility basics checked;
- PDF generated from the approved publication master;
- final DOCX and PDF receive separate SHA-256 fingerprints.

## 12. Release rule

No work is described as “final”, “verified”, “current law” or “publication ready” solely because it is complete in appearance.

Those labels require the relevant Human Gate and the evidence recorded in the publication-governance register.
