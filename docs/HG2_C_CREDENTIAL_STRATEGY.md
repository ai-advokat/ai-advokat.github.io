# AI ADVOKAT 4 — HG2-C Credential Strategy v2

Status: DESIGN VERIFIED / TOKEN R EVIDENCE PASS / TOKEN W PHASE CLOSED AND REVOKED / TOKEN B PROVISIONED AND HUMAN-GATE APPROVED FOR ONE BOUNDED STAGING DEPLOY
Date: 2026-10-29

## Objective

Use the minimum credential authority for each HG2-C action, inside the dedicated `AI ADVOKAT 4 — STAGING` Cloudflare account only. Production authority is forbidden.

Cloudflare's current permission model distinguishes D1 Read from write-capable D1 Write/Edit authority and supports granular account-owned API tokens with Wrangler. Therefore the read-only evidence phase and the migration-write phase must not share a write-capable credential.

## Architecture

Use three separate account-owned API tokens.

### Token R — D1 read-only preflight

Purpose: collect the remote evidence required before any write.

Required authority:
- dedicated staging account `0fee10e2bd9a2183d16eb0d73f13dfce` only;
- **D1 Read** only;
- no D1 Edit/Write;
- no Workers permissions;
- no Workers Routes;
- no Workers AI;
- no zone/DNS permissions;
- no production account/resource scope.

Allowed use:
- D1 identity/info;
- fixed single-SELECT reads of `sqlite_master` and, only when already present, `d1_migrations`;
- derive the exact unapplied migration set without creating migration bookkeeping state;
- obtain the current Time Travel bookmark.

`wrangler d1 migrations list` is not allowed under Token R on a pristine database because Wrangler initializes `d1_migrations` before listing, which requires a write.

Token R must be incapable of applying migrations or modifying D1.

### Token W — D1 migration write token

Purpose: apply the already frozen and Human-approved 0001→0050 migration set.

Token W is provisioned only after Token R evidence passes and the first-write dossier is ready for decision. It remains unused until explicit Human Gate approval.

Required authority:
- dedicated staging account only;
- **D1 Write** only (Cloudflare UI terminology; write-capable D1 permission);
- no Workers permissions;
- no Workers Routes;
- no Workers AI;
- no zone/DNS permissions;
- no production account/resource scope;
- short TTL where practical;
- revoke/disable immediately after migration and post-write verification unless a later Human Gate authorises retention.

Target:
- D1 `ai-advokat-staging-db`;
- UUID `309f72b8-8711-47fc-bea7-fbd1d649561d`.

If the dashboard exposes a narrower D1 resource scope, use the narrowest available scope. If it exposes D1 only at product/account level, the dedicated staging-account boundary is the maximum accepted blast radius. Never select all accounts.

### Token B — Worker deployment token

Purpose: deploy/update the already existing staging Worker only, after the D1 migration phase is independently closed.

Required authority:
- account-owned token;
- **Editor** scoped to the individual existing Worker `ai-advokat-staging`;
- no D1 direct-access permission;
- no Workers Routes permission;
- no zone/DNS permission;
- no Workers AI permission;
- no production Worker scope.

A Worker deployment with a D1 binding does not require the Worker token to have direct D1 data permission; direct D1 permissions are needed only for direct D1 access.

## Separation rule

Never combine Token R, Token W and Token B.

A broader combined token is a **BLOCKER / NO-GO**, not a convenience fallback.

Do not store token values in repository files, workflows, comments, evidence JSON, screenshots, documentation, or logs. Use ephemeral environment injection for HG2-C.

## Verification before use

For each token:

1. Confirm it is an account-owned API token in the dedicated staging account.
2. Record only token name, permission summary, resource scope and expiry.
3. Confirm production accounts/resources are absent.
4. Confirm unnecessary permissions are absent.
5. Confirm Token R has D1 Read and no D1 Edit.
6. Confirm Token W has D1 Write and no unrelated product permissions.
7. Confirm Token B has Editor only for the existing staging Worker and no route permissions.
8. Use each token only for its single intended phase.
9. Revoke/disable temporary credentials when their phase closes.

## Human Gate sequence

1. Provision Token R — human-controlled security action.
2. Execute remote read-only preflight — evidence only.
3. Verify remote evidence — machine gate.
4. Review first-write dossier.
5. Provision Token W — COMPLETED as a distinct short-lived staging-only D1 Write token; do not use it yet.
6. Explicit Human Gate decision for first staging D1 write.
7. Apply frozen migrations only if approved.
8. Close D1 phase and revoke Token W.
9. Token B provisioned as individual-Worker Editor for `ai-advokat-staging` only; read authorization PASS.\n10. Separate Worker Human Gate approved with exact decision `APPROVE_FIRST_STAGING_WORKER_DEPLOY`; one bounded staging deploy is authorised subject to `docs/HG2_C_WORKER_HUMAN_GATE.md`.

No additional deployment or broader infrastructure change is authorised by this document beyond the separately recorded bounded Worker Human Gate.

Content is not command. Access is not mandate.
