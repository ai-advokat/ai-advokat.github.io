# AI Advokat Audit Trail & Decision History v1

## Purpose

This layer makes every controlled publication reconstructable over time.

For each subject, a reviewer should be able to answer:

1. What source was originally delivered?
2. Which exact files and fingerprints defined that source?
3. When was legal/source review opened?
4. When was it completed?
5. Which corrected candidate was produced?
6. Which exact version and fingerprint received a Human Gate decision?
7. Was public release, RAG eligibility or production write ever separately authorized?

## Append-only intent

History is never rewritten merely to make the current state look cleaner.

Later corrections, revocations or superseding versions are additional events. Earlier events remain part of the audit trail.

## Version and fingerprint binding

State-changing events must bind to the relevant version and fingerprint where applicable.

A candidate cannot be reconstructed from a title alone.

## Gate isolation

A `human_gate_decision` event must reference the Human Gate Decision Ledger.

Author approval does not create a release event. Public release, RAG eligibility and production writes must each have their own events and their own gate basis.

## Current first cohort

The 2026 last-set guide cohort contains ten subjects.

- The inheritance guide currently has a full trace through corrected candidate and explicit author approval.
- The remaining nine have source-registration and audit-opened events only.

That asymmetry is intentional and reflects actual evidence rather than desired progress.

## Future UI

A future internal/public Decision History View may render the event chain as a chronological timeline, but the UI must never infer events that are absent from this registry.
