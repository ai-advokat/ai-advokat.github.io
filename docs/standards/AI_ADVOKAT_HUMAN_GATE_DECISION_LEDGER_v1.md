# AI Advokat Human Gate Decision Ledger v1

## Purpose

The Human Gate Decision Ledger records explicit human decisions without allowing one approval to silently authorize another action.

It is the final accountability layer for:

**source → claim → AI response → human decision**

## Core rule

An approval is valid only for:

- one named subject;
- one named gate;
- one identified artifact version;
- one identified fingerprint;
- one recorded decision event.

Nothing else is implied.

## Gate isolation

The following gates are independent:

1. author approval;
2. GitHub merge;
3. public release;
4. AI/RAG eligibility;
5. production corpus write.

For example, author approval never means public-release approval.

## Version binding

A Human Gate decision is bound to the exact artifact version and fingerprint that was reviewed.

If the artifact changes materially after approval, the previous decision remains part of history but does not automatically cover the new artifact.

## Append-only intent

Human decisions must not be silently overwritten.

A later rejection, revocation or revised approval should create a new decision record or an explicit superseding relation while preserving the earlier event.

## Missing decision = not approved

The ledger is fail-closed.

If there is no explicit valid decision record for a gate, that gate must be treated as not approved.

## Initial controlled record

The inheritance candidate has one explicit recorded approval:

- subject: `inheritance-estate-guide-2025-r1`;
- gate: `author_approval`;
- decision: approved;
- date: 2026-10-03;
- candidate DOCX/PDF fingerprints recorded.

No downstream authorization is inferred from that approval.
