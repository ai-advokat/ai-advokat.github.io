# AI ADVOKAT 4 — HG2-C First Remote Write Human Gate

Status: PREPARED / NOT APPROVED
Date: 2026-10-29

## Purpose

This is the final decision gate before the first remote write to the dedicated staging D1.

A Human Gate may be considered only after a real read-only preflight has produced non-secret evidence and that evidence passes:

`node scripts/verify-hg2-c-remote-evidence.mjs <evidence.json>`

## Mandatory evidence

All items below must be present:

- exact staging account ID: `0fee10e2bd9a2183d16eb0d73f13dfce`;
- exact staging D1: `ai-advokat-staging-db`;
- exact D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`;
- exact activation Git SHA;
- frozen migration manifest count: 50;
- remote unapplied migration count: 50;
- exact migration-set match: true;
- D1 Time Travel capability: verified;
- exact pre-write Time Travel bookmark;
- Token A name, scope summary and expiry if any — never token value;
- 0033/0034/0035 Human Review acknowledged;
- rollback procedure acknowledged.

## Critical migration acknowledgement

The Human Gate must explicitly acknowledge:

- **0033** — audit table rebuild / copy / drop / rename;
- **0034** — conditional duplicate-row supersession and index replacement;
- **0035** — audit table rebuild / copy / drop / rename.

On an empty staging database the conditional data mutation in 0034 should have no rows to change, but this must not be assumed without the remote evidence showing the expected empty/unapplied state.

## Proposed first write

Only one operation class is in scope:

**Apply the frozen 0001→0050 D1 migration chain to the dedicated staging D1.**

Out of scope:

- Worker deployment;
- routes or custom domains;
- Workers AI;
- case/document imports after schema creation;
- ad-hoc SQL;
- production D1;
- production Worker;
- production secrets;
- any retry using broader credentials.

## Abort conditions

Return to **NO-GO** immediately if any of these are observed:

- account/D1 identity mismatch;
- remote migration list differs from the frozen manifest;
- pre-write bookmark missing;
- Token A scope includes production or broader-than-approved authority;
- D1 backend is not Time-Travel capable;
- migration application reports an unexpected file/order;
- post-write ledger/schema does not exactly match;
- any production identifier appears in the execution path.

## Rollback authority

Rollback is **not automatic**.

If rollback is required, use the captured pre-write Time Travel bookmark only after a separate destructive Human Gate because restore overwrites the staging database in place.

## Decision record

Before the first write, record:

- Decision: `APPROVE_FIRST_STAGING_D1_WRITE` or `NO_GO`
- Human approver:
- Decision timestamp UTC:
- Activation Git SHA:
- Pre-write bookmark:
- Token A non-secret scope summary:
- Migration manifest: `evidence/hg2-c/migration-manifest.json`
- Remote evidence file:
- 0033 reviewed: YES/NO
- 0034 reviewed: YES/NO
- 0035 reviewed: YES/NO
- Rollback acknowledged: YES/NO
- Notes:

No approval exists until this record is explicitly completed by the human decision-maker.

Content is not command. Access is not mandate.
