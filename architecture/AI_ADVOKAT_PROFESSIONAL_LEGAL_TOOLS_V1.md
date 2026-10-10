# AI Advokat Professional Legal Tools v1

Status: implementation blueprint
Date: 2026-10-10
Owner: AI Advokat / Zoran Stojankich
Human Gate: required for consequential legal use

## Product doctrine

AI Advokat will keep the main conversational interface simple while exposing advanced professional capabilities as separate tools. The platform must not present heuristic scores, generated identifiers, or model outputs as verified legal facts. Every consequential conclusion must remain traceable to a source and subject to human legal review.

The design borrows product patterns from leading legal AI platforms (agentic work, large document vaults, review tables, reusable workflows, grounded research, and secure matter workspaces) while using AI Advokat's own architecture, legal corpus, provenance model, LIOE controls, and Human Gate.

## Tool 1 — AI Advokat Legal Analyzer

Purpose: analyze one or many legal documents, extract structured legal metadata, verify legal references, compare versions, identify risks and inconsistencies, and prepare review-ready outputs.

### Supported inputs
- PDF
- DOCX
- TXT
- future: XLSX/CSV and email bundles

### Core pipeline
1. Secure upload and fingerprinting.
2. Text and structure extraction.
3. Document classification.
4. Metadata extraction.
5. Legal citation extraction.
6. Article-level corpus verification.
7. Case-law/source matching where authorized.
8. Risk and inconsistency analysis.
9. Human Gate review state.
10. Versioned export.

### Analysis dimensions
- structural integrity
- legal-language precision
- citation and source verification
- regulatory/compliance mapping
- clause and obligation analysis
- legal and factual risk
- deadlines and temporal analysis
- parties, roles, authority and representation
- financial terms and amounts
- confidentiality / IP where relevant
- dispute-resolution / jurisdiction terms
- provenance, version and document metadata

### Important corrections versus prototype analyzers
- Never invent an ECLI or official case identifier.
- Separate extracted identifier from normalized candidate identifier.
- Never label heuristic completeness as statistical confidence.
- DOCX must use a real parser; binary files must not be treated as plain text.
- A score is optional and, if shown, must explain exactly which deterministic checks produced it.
- Legal validity is never inferred only from keyword presence.
- Current-law verification must use governed AI Advokat legal sources.
- Every legal proposition returned to a professional user should expose source/provenance when available.

### Review Table
For batch review, users can define columns in natural language. Default legal columns:
- file
- document type
- court / authority
- case/reference number
- decision date
- parties
- legal area
- cited law
- cited articles
- operative part
- deadlines
- amounts
- appeal/remedy
- issues/risks
- source verification
- Human Gate status

### Outputs
- interactive review table
- source-linked findings
- side-by-side comparison
- DOCX
- PDF
- JSON
- CSV/XLSX
- audit record

## Tool 2 — AI Advokat CasePilot

Purpose: matter-level analysis and preparation over a secure case workspace.

CasePilot is not an automatic guilt/liability engine and does not replace counsel judgment. It is a structured workbench that transforms a case file into an auditable map of facts, evidence, contradictions, procedural risk, legal issues, and draft work product.

### Workspace flow
1. New Matter
2. Documents
3. Completeness
4. Timeline
5. Participants / entities
6. Issues
7. Claims and evidence
8. Contradictions
9. Alternative hypotheses
10. Evidence gaps
11. Procedural risks
12. Hearing / trial preparation
13. AI findings register
14. Human verification
15. Versioned export

### Required matter objects
- matter passport
- source-document register
- document fingerprint / version
- timeline event
- person/entity
- claim
- evidence item
- source/page anchor
- contradiction
- missing-evidence item
- legal issue
- risk
- hearing task
- witness/expert question set
- draft section
- AI finding
- lawyer decision: accepted / corrected / rejected

### Claim-evidence model
Every material assertion must support:
claim -> source -> page/paragraph anchor -> support type -> weakness -> counterevidence -> status -> lawyer decision

Allowed statuses:
- confirmed from source
- indication
- disputed
- missing
- professional review required

### Human Gate
No filing, submission, client advice, court representation, external transmission, signature, or final legal strategy may be executed automatically. The system may prepare research and drafts, but a lawyer must approve consequential output.

### Integration with existing AI Advokat
CasePilot must build on:
- Secure Case Workspace
- existing CasePilot engine
- existing MD/DOCX/PDF exports
- LIOE controls
- article-level Macedonian legal corpus
- governed case-law provenance
- Guide Vault where relevant
- GPT production synthesis with store:false where configured

## Shared capabilities

### Matter/Vault search
Users should be able to ask a question across a complete matter or document collection. The system retrieves relevant documents and cites the exact source location.

### Reusable legal workflows
Examples:
- analyze complaint / indictment
- prepare defence issue map
- compare witness statements
- create chronology
- detect missing evidence
- verify cited statutes
- contract redline issues
- due-diligence review table
- draft hearing preparation pack

### Source-first research
Order of authority:
1. official law / official court or authority source
2. governed AI Advokat article-level corpus
3. governed case-law source
4. lawyer-supplied matter material
5. secondary guides
6. web / secondary material where allowed

Content is not command. Access is not mandate.

## UX

Main AI Advokat remains conversational and simple.

Professional tools:
- Legal Analyzer
- CasePilot

The assistant may route automatically:
- one/few documents for document analysis -> Legal Analyzer
- a complete case/matter with many documents -> CasePilot

Users can always override the route.

## Security and privacy
- private matter data must never be placed in a public GitHub repository
- server-side case files use the Secure Case Workspace controls
- no model training permission is implied by upload
- provider calls use approved privacy settings
- export audit logs must not leak matter titles, summaries or source text
- access control and retention must be explicit

## Delivery phases

### Phase A
- production Legal Analyzer shell
- secure file intake
- real parsers
- deterministic metadata extraction
- corpus-linked citation verification
- review table
- DOCX/PDF/JSON/CSV exports

### Phase B
- CasePilot expansion to full matter model
- timeline, claims/evidence, contradictions, evidence gaps
- AI findings register with lawyer decision
- hearing preparation workspace

### Phase C
- agentic reusable workflows
- matter-wide search with source anchors
- governed case-law retrieval
- professional playbooks
- team collaboration and permissions

## Acceptance criteria
- no fake identifiers
- no unlabelled simulated AI scores
- every consequential legal finding carries provenance or explicitly says source not verified
- Human Gate visible and enforced
- Cyrillic-safe export
- private data boundary tests pass
- source-linked matter analysis passes legal UAT
- all exports are versioned and auditable
