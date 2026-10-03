# AI Advokat CasePilot

Status: FOUNDATION / LOCKED FOR PRIVATE CASE UPLOADS

## Purpose

CasePilot converts an unstructured case file into a source-linked working map for the lawyer. It is not an automatic guilt assessment and it is not a ready-to-file pleading.

The module follows the workflow supplied by Zoran Stojankich in the hypothetical criminal-case pilot:

1. register documents with stable IDs;
2. extract persons, dates, events, amounts, assertions and evidence;
3. link every factual conclusion to a concrete source and page;
4. mark contradictions, gaps and procedural risks;
5. generate hearing questions and a working hearing plan;
6. require lawyer verification, correction and approval before professional use.

## Core screens / submodules

- New Case / Case Passport
- Documents
- Completeness Check
- Chronology
- Participants & Access
- Legal Issue Tree
- Prosecution / Defence Theory
- Claims & Evidence Matrix
- Evidence Assessment
- Contradictions
- Alternative Hypotheses
- Evidence Completion Plan
- Procedural Risk Register
- Hearing Plan
- Witness / Expert Questions
- Defendant/Client Preparation
- Objections & Interventions
- Closing Structure
- Hearing Checklist
- Hearing Notes
- AI Conclusion Register
- Verification
- Export

## Status vocabulary

CasePilot uses five factual/work statuses:

- CONFIRMED — directly supported by the stated source;
- INDICATION — indirect support only;
- DISPUTED — conflicting versions or attribution;
- MISSING — necessary material is absent;
- LAWYER REVIEW — legal/strategic judgment remains for the lawyer.

A CONFIRMED label never means the source is authentic merely because AI saw it. Original-source verification remains required.

## AI Conclusion Register

Every material AI conclusion must carry:

- conclusion ID;
- exact source IDs;
- page(s);
- review type;
- locked state;
- lawyer decision: accepted / corrected / rejected;
- reviewer identity and timestamp.

Until the lawyer decides, the conclusion remains locked for professional use.

## Relationship with the existing Case Intake engine

The existing Case Intake & Legal Opinion Engine remains the broad intake/legal-opinion architecture.

CasePilot is the **litigation working-file layer** on top of it: chronology, evidence matrices, contradictions, hearing preparation and verified AI conclusions.

## Security boundary

Private case upload remains LOCKED until authenticated case workspaces, encrypted object storage, tenant isolation, retention/delete/export controls, audit logging and cross-case isolation are production-ready.

No private case material may enter the public legal corpus.

## Phase plan

Phase 1 — foundation (this PR): domain model, statuses, claim/source validation, contradiction model, AI conclusion Human Gate, tests.

Phase 2 — private document workspace: secure file registry, page provenance, hashes, OCR/extraction metadata, access control.

Phase 3 — analysis engine: chronology, completeness, claims/evidence matrix, contradictions, participant/access graph.

Phase 4 — hearing workspace: hearing plan, questions, objections, notes, controlled drafting.

Phase 5 — export: versioned DOCX/PDF working pack after Human Gate.

## Non-goals of Phase 1

- no private upload endpoint;
- no document storage;
- no D1 write;
- no autonomous guilt assessment;
- no automatic filing;
- no professional-use unlock without lawyer approval.
