# AI Advokat Real Legal Run Record Protocol v1

**Status:** Canonical internal measurement method
**Date:** 6 October 2026

## Purpose

A Legal Run Record captures what actually happened in an AI Advokat legal/governance mission so effectiveness, efficiency, corrections and failure modes can be measured later.

It is an audit/learning artifact. It does not create legal authority.

## Canonical assets

- Schema: `/data/legal-runs/legal-run-record.schema.json`
- Index: `/data/legal-runs/index.json`
- Records: `/data/legal-runs/records/YYYY/LIOE-YYYY-NNNN.json`
- Baseline: `/data/legal-intelligence-metrics-baseline.json`
- Validator: `/scripts/validate-legal-run-records.mjs`

## Lifecycle

### Open

For L2-L4 and material implementation work, open a run when practical.

Record:
- objective;
- mission profile;
- jurisdictions;
- specialists and routing reasons;
- required Human Gates;
- source/temporal state;
- data classification.

### Execute

Preserve material evidence:
- sources and provenance;
- temporal/version verification;
- deadlines/procedural posture where relevant;
- specialist disagreement;
- Human Gate state;
- implementation/rollback reference;
- tool/provider failures.

Unknown telemetry stays unknown.

### Verify

A run must distinguish:
- source verification;
- temporal/current-law verification;
- jurisdiction verification;
- legal stress testing;
- adversarial review;
- Human Gate decisions;
- final verification.

A merge, draft or generated document is not by itself proof that legal verification passed.

### Close

`SUCCESS` requires `verification_state=PASSED`.

`CLOSED_WITH_FINDINGS` is used when the mission ended but material verification remained provisional or a limitation must remain visible.

Corrections are never erased from the history.

## Human Gate ledger is separate

A Legal Run Record may reference gate decisions, but it does not replace the Human Gate Decision Ledger.

Approval remains:
- gate-specific;
- subject-specific;
- version-bound;
- fingerprint-bound where applicable;
- explicit.

## Public-repository privacy boundary

Do not commit raw:
- client correspondence;
- personal case facts;
- health information;
- identity documents;
- confidential contracts;
- privileged communications;
- private financial data;
- credentials/secrets.

The public canonical store accepts only PUBLIC/appropriately sanitised records. Sensitive raw matter records belong only in an authorised private system.

## Current-law discipline

If a run materially claims what law is current/applicable, both source and temporal verification must be VERIFIED before a success record is eligible for effectiveness measurement.

Publication, entry into force, application date and transitional provisions are distinct concepts.

## Real and retrospective records

`LIVE_LIOE` is preferred.

`RETROSPECTIVE_EVIDENCE` is allowed only when the record is reconstructed from verifiable repository/CI/document evidence.

Retrospective records must not invent:
- tool-call count;
- model cost;
- specialist activation;
- legal verification that never occurred.

## Baseline

The baseline exposes record count and per-metric sample size.

A provisional or cancelled-verification run may contribute a time observation but not a verified effectiveness score.

Early samples are descriptive, not proof that AI Advokat is universally faster or more accurate.
