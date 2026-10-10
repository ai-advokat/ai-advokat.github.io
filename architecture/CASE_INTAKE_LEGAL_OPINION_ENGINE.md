# AI Advokat — Case Intake & Legal Opinion Engine

Status: DESIGN BASELINE
Jurisdiction: North Macedonia first
Security posture: private case workspace remains LOCKED until authentication, encrypted storage, retention controls and audit logging are production-ready.

## User experience target

A user may say, for example:

"I have an inheritance problem. The owner of my parcel died. His sons are in the United States and will not give me a statement. His first wife is with them in the United States, and his second wife also refuses to sign. I have 15 pages of documents."

The user uploads/scans the documents.

AI Advokat then:
1. extracts text and images from the documents;
2. identifies parties, relationships, dates, properties and procedural events;
3. builds a factual chronology;
4. identifies the legal issues;
5. retrieves the current controlling law article-by-article;
6. checks relevant procedure, jurisdiction and deadlines;
7. identifies missing evidence/documents;
8. generates a reasoned legal assessment;
9. produces next-step options;
10. drafts a filing/checklist when appropriate;
11. exposes every legal proposition with its source;
12. requires Human Gate before professional use.

## Pipeline

### A. Document ingestion
Supported target inputs:
- PDF
- scanned PDF
- images
- DOCX
- later: email/connector material with explicit authorization

For every file:
- file hash
- page count
- detected language
- text-extraction method
- OCR flag
- extraction confidence
- page-level provenance
- private/public classification

Never mix private case documents into the public legal corpus.

### B. Page-level extraction
Each page produces:
- page number
- extracted text
- image/scan flag
- confidence
- detected signatures/stamps only as visual indicators, never as authenticity conclusions
- document type candidate
- source file hash

OCR-derived text is always marked as OCR and subject to verification.

### C. Entity and fact extraction
Extract candidates for:
- persons
- institutions
- addresses
- cadastral parcels
- property-sheet references
- case/file numbers
- dates
- money amounts
- contracts
- decisions
- wills
- powers of attorney
- family relationships
- citizenship/residence abroad
- service/delivery events
- signatures/consents/refusals

Every extracted fact has:
- source document
- page
- quote/span
- confidence
- verified/unverified status

### D. Case graph
Build a graph:
- PERSON
- INSTITUTION
- PROPERTY
- DOCUMENT
- EVENT
- CLAIM
- LEGAL_ISSUE

Relationships:
- owns
- inherited_from
- spouse_of
- child_of
- resides_in
- signed
- refused
- issued
- served
- concerns_property
- challenges
- supports
- contradicts

### E. Legal issue tree
Example inheritance/property issue tree:
- who is the registered owner?
- is the owner deceased?
- has probate been opened?
- who are potential heirs?
- is there a will?
- are there spouses from different marriages?
- are heirs abroad?
- is service abroad required?
- can proceedings start without voluntary signatures?
- who has standing to initiate?
- what court/notary route applies?
- what evidence proves ownership/death/kinship?
- is there a separate ownership or acquisitive-prescription issue?
- are there limitation or procedural deadlines?
- does the user's parcel/possession create a distinct civil claim?

The issue tree is generated from facts and current law, not from a canned answer.

### F. Source-first legal retrieval
Order:
1. current verified Macedonian article version;
2. related procedural article;
3. official court / Constitutional Court materials;
4. ECHR/EU/international overlay where applicable;
5. secondary commentary only as non-authoritative context.

Each legal statement must point to:
- instrument
- article
- version/effective date
- official source URL
- provenance status

### G. Legal assessment
Output sections:
1. What is established from the documents
2. What remains uncertain
3. Applicable law
4. Legal issues
5. Evidence strengths
6. Evidence weaknesses
7. Procedural obstacles
8. Missing documents
9. Available lawful options
10. Recommended next procedural step
11. Draft document(s)
12. Human Gate warning

### H. Outcome / strength assessment

Do NOT invent a numerical probability such as "80% likely to win" merely from model intuition.

Default output:
- STRONG
- MODERATE
- UNCERTAIN
- WEAK

Each rating must be factor-based and explain:
- factual support
- legal support
- evidentiary gaps
- procedural risks
- adverse facts
- unresolved version/source issues

Optional numeric probability may be shown only if:
- based on a documented, validated statistical model;
- population and time period are disclosed;
- calibration quality is known;
- model applicability to the present case is justified;
- uncertainty interval is shown;
- Human Gate approves professional use.

Otherwise no percentage.

### I. Practical next-step generator
Examples:
- obtain death certificate
- obtain official cadastral record
- identify all heirs
- obtain marriage/family-status records
- initiate probate where legally permitted
- request service abroad
- request appointment/representation mechanism where legally applicable
- file ownership/possession action if the issue is not probate-only
- seek interim measure where justified
- prepare evidence chronology

No step is suggested unless its legal basis is verified.

### J. Drafting
Possible drafts:
- request to initiate probate
- submission to notary/court
- request for service abroad
- request for cadastral verification
- property claim
- objection
- appeal
- evidence list
- client advice memo

Draft must contain:
- verified facts only
- clearly labelled allegations
- current legal citations
- placeholders for missing facts
- Human Gate before filing

## Confidentiality architecture

Before document upload is enabled in production:
- authenticated users
- per-case authorization
- encrypted object storage
- tenant isolation
- file retention controls
- delete/export controls
- audit log
- no training/public-corpus reuse of private case files
- no public URL exposure
- no cross-case retrieval

Until these exist, the public UI must keep document/case upload LOCKED.

## Case analysis quality gate

A case analysis is not production-ready unless:
- all cited law versions are verified;
- every key fact points to a page/source;
- uncertain OCR is surfaced;
- missing documents are listed;
- deadlines are source-backed;
- no unsupported outcome percentage is shown;
- private data boundaries pass;
- Human Gate is present.


## Professional 20-document work package

Target professional workflow:

1. the lawyer/client opens one private case workspace;
2. uploads up to **20 case documents** in a single governed work package;
3. every file is registered by stable document ID, SHA-256 hash, page count, language and extraction method;
4. each page is analysed independently with page-level provenance;
5. the system produces a per-document summary before any cross-document synthesis;
6. facts, persons, dates, amounts, properties, procedural events and assertions are merged into one case graph;
7. contradictions and missing evidence are surfaced rather than silently reconciled;
8. current law and relevant authority are retrieved source-first;
9. GPT-6.1 Sol Chief synthesis evaluates the whole file through multiple views;
10. Human Gate precedes professional release and export.

### Required analytic views

The final analysis must cover, where relevant:

- client/claimant theory;
- opposing-party theory;
- neutral adjudicator view;
- evidentiary strengths and weaknesses;
- procedural risks;
- best-case scenario;
- base-case scenario;
- worst-case scenario;
- alternative hypotheses;
- missing evidence and decisive unknowns;
- recommended next lawful step.

### Final professional opinion pack

The output pack should contain:

1. Executive conclusion
2. Case passport
3. Source document register
4. Document-by-document digest
5. Established facts
6. Disputed/uncertain facts
7. Chronology
8. Parties and relationship map
9. Legal issue tree
10. Applicable law and authority
11. Fact-to-source matrix
12. Claim-to-evidence matrix
13. Contradictions
14. Evidence strengths
15. Evidence weaknesses
16. Procedural obstacles and deadlines
17. Opposing arguments
18. Neutral adjudicator analysis
19. Alternative hypotheses
20. Outcome/strength assessment
21. Missing documents/evidence
22. Recommended strategy and next steps
23. Draft(s), where legally justified
24. Human Gate decision register
25. Provenance appendix

### Outcome / probability rule

The default assessment is factor-based: STRONG / MODERATE / UNCERTAIN / WEAK.

A numerical percentage must **not** be generated from model intuition. It may appear only when a documented statistical model is available with a disclosed comparable-case population, time period, calibration quality, applicability analysis and uncertainty interval, and after lawyer Human Gate approval.

If those requirements are not met, AI Advokat explains the practical likelihood factors and uncertainty without fabricating a percentage.

### Export

After Human Gate, the same versioned professional opinion may be exported as:

- **MD** — canonical machine-readable working master;
- **DOCX** — editable professional working opinion;
- **PDF** — fixed review/share copy.

All three exports must carry the same case version, generation timestamp, source manifest, Human Gate status and provenance appendix.

### Production security boundary

The 20-document workflow is a target private professional capability, not permission to expose private uploads through the public portal. Production upload remains locked until authenticated per-case workspaces, encrypted object storage, tenant isolation, retention/deletion/export controls, audit logging and cross-case isolation are implemented and tested.
