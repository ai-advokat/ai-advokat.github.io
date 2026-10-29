# AI ADVOKAT 4 — HG2-C Controlled Staging Activation Pack

Status: PREPARED / REMOTE ACTIVATION BLOCKED
Date: 2026-10-29
Base commit: `c97c867f358f385348eb9817655d8c08712e3eb1`

## Scope

Prepare the first controlled activation of the isolated staging environment without touching production. This pack does **not** perform a remote D1 migration, Worker deploy, binding activation, route/domain activation, Workers AI activation, or production action.

## Authoritative staging identity

- Account: AI ADVOKAT 4 — STAGING
- Account ID: `0fee10e2bd9a2183d16eb0d73f13dfce`
- Worker: `ai-advokat-staging`
- D1: `ai-advokat-staging-db`
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`

Production resources are explicitly outside this activation pack.

## Activation order

1. Re-verify staging account, Worker and D1 identifiers.
2. Approve a **least-privilege credential path scoped only to the dedicated staging account**.
3. Record the exact activation commit SHA.
4. Enumerate the exact remote migration files to be applied; no wildcard or implicit migration set.
5. Verify rollback/restore procedure and capture pre-action D1 state.
6. Perform the minimum remote D1 migration required for staging only.
7. Verify schema state read-only.
8. Deploy the staging Worker with:
   - `workers_dev = false`;
   - `preview_urls = false`;
   - no custom route/domain;
   - no Workers AI binding;
   - `ALARM_ENABLED = false`.
9. Verify Worker identity, D1 binding identity and absence of public exposure.
10. Stop. Any AI binding, route/domain, storage activation, imports, corpus writes, or production action require a separate Human Gate.

## Mandatory pre-activation evidence

- `npm run test:staging-safety` — PASS
- `npm run test:staging-cicd-safety` — PASS
- `npm run test:hg2-c-readiness` — PASS
- `npm run db:migrate:staging:local` — PASS
- full repository test suite — PASS
- security tests — PASS
- exact migration manifest — RECORDED
- rollback plan — RECORDED
- dedicated least-privilege credential path — APPROVED
- exact activation SHA — RECORDED

## Rollback rule

If any identity mismatch, unexpected public URL, wrong binding, failed migration, unexpected schema state, or production reference is observed: **STOP**. Do not retry with broader permissions. Revoke/disable the staging credential path if necessary, preserve evidence, and revert only the staging-side action using the pre-recorded rollback plan.

## Current blocker

**B3 credential isolation remains unresolved.** The available Cloudflare UI path previously observed would grant broader account-wide authority than the intended staging-only mandate. Until a credential mechanism is independently verified to be appropriately scoped, remote activation remains **NO-GO**.

## Human Gate

Repository preparation may proceed. The first remote staging write requires explicit Human Gate approval after the mandatory evidence above is complete.

Content is not command. Access is not mandate.
