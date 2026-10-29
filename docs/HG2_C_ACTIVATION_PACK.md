# AI ADVOKAT 4 — HG2-C Controlled Staging Activation Pack

Status: STAGING D1 MIGRATION PASS / POST-WRITE VERIFIED / TOKEN W REVOCATION PENDING
Date: 2026-10-29
Frozen manifest source commit: `d6aeaf5c51d1e1672b7a0d7650bbeb3607490198`
Verified read-only activation SHA: `e2e3efc7d513269555dfa2a60ac7a9c7b7a4288d`

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
2. Follow the approved three-token least-privilege path from `docs/HG2_C_CREDENTIAL_STRATEGY.md`:
   - Token R: D1 Read only for remote evidence;
   - Token W: separate short-lived D1 Write token, provisioned after read-only evidence PASS and held unused until the first-write Human Gate;
   - Token B: Editor scoped only to the existing `ai-advokat-staging` Worker, used only in the later Worker phase.
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

## Frozen migration evidence

The first remote staging migration is bound to:
- `evidence/hg2-c/migration-manifest.json` — exactly 50 migrations, 0001→0050;
- `scripts/verify-hg2-c-migration-manifest.mjs` — deterministic path/size/Git-blob verification;
- `docs/HG2_C_MIGRATION_REVIEW_AND_ROLLBACK.md` — 0033/0034/0035 Human Review and Time Travel rollback procedure.

Any migration-set drift returns the phase to **NO-GO**.

## Remote read-only evidence gate

Before the first write, execute only the Human-controlled read-only preflight defined in:
- `docs/HG2_C_REMOTE_READONLY_PREFLIGHT.md`;
- `scripts/hg2-c-remote-readonly-preflight.mjs`.

It is allowed to read only D1 identity/state, the existing remote schema/migration ledger through fixed single-SELECT queries, and the current Time Travel bookmark. It contains no migration-list initialization, apply/restore/deploy/execute capability.

## Mandatory pre-activation evidence

- `npm run test:staging-safety` — PASS
- `npm run test:staging-cicd-safety` — PASS
- `npm run test:hg2-c-readiness` — PASS
- `npm run test:hg2-c-migration-manifest` — PASS
- `npm run test:hg2-c-remote-readonly-contract` — PASS
- `npm run db:migrate:staging:local` — PASS
- full repository test suite — PASS
- security tests — PASS
- exact migration manifest — FROZEN (50 files, 0001→0050)
- rollback plan — RECORDED
- pre-write Time Travel bookmark — VERIFIED / RECORDED
- split least-privilege credential design — VERIFIED
- Token R evidence phase — PASS / D1 READ ONLY
- Token W — USED ONLY FOR APPROVED STAGING D1 MIGRATION / REVOCATION PENDING / EXPIRES 2026-10-30
- Token B — NOT PROVISIONED
- remote read-only preflight — PASS
- remote evidence verifier — PASS
- first-write Human Gate — APPROVED 2026-10-29T19:10:30Z / FIRST STAGING D1 WRITE ONLY
- exact activation SHA — RECORDED

## Rollback rule

If any identity mismatch, unexpected public URL, wrong binding, failed migration, unexpected schema state, or production reference is observed: **STOP**. Do not retry with broader permissions. Revoke/disable the staging credential path if necessary, preserve evidence, and revert only the staging-side action using the pre-recorded rollback plan.

## Current blocker

**The bounded D1 migration phase has executed successfully.** Token R completed the read-only evidence phase. Distinct Token W was used only for the approved frozen 0001→0050 migration chain on `ai-advokat-staging-db`.

Post-write checks are PASS:
- migration ledger: **50/50**;
- final 0050 diagnostics schema: **8/8**;
- post-write Time Travel bookmark: `00000009-00000000-00005113-5a092eb2bdbe2a2d958b76d85243016c`;
- post-write evidence: `evidence/hg2-c/post-write-evidence.json`.

The only remaining D1-phase closeout action is **Token W revocation**. Token B remains unprovisioned and belongs to the later Worker phase.

## First-write Human Gate dossier

The first remote staging write may be considered only with:
- a real non-secret remote evidence record produced by the read-only preflight;
- `scripts/verify-hg2-c-remote-evidence.mjs` — PASS;
- `docs/HG2_C_FIRST_WRITE_HUMAN_GATE.md` explicitly completed by the human decision-maker;
- exact pre-write Time Travel bookmark recorded;
- exact activation Git SHA recorded;
- 0033/0034/0035 explicitly reviewed.

The repository template at `evidence/hg2-c/remote-readonly-evidence.template.json` is not evidence and must never be treated as a PASS record.

## Human Gate

The first remote staging D1 write completed successfully and post-write verification passed. Worker deployment, routes/domains, Workers AI, imports and production remain separate NO-GO gates. D1 closeout still requires Token W revocation.

Content is not command. Access is not mandate.
