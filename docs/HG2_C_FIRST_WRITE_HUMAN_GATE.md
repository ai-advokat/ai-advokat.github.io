# AI ADVOKAT 4 — HG2-C First Remote Write Human Gate

Status: APPROVED / FIRST STAGING D1 WRITE ONLY
Date: 2026-10-29

## Purpose

This is the final decision gate before the first remote write to the dedicated staging D1.

A Human Gate may be considered only after a real read-only preflight using **Token R (D1 Read only)** has produced non-secret evidence and that evidence passes:

`node scripts/verify-hg2-c-remote-evidence.mjs <evidence.json>`

## Verified read-only evidence snapshot

Machine-verified PASS on 2026-10-29:

- activation Git SHA: `e2e3efc7d513269555dfa2a60ac7a9c7b7a4288d`;
- staging account: `0fee10e2bd9a2183d16eb0d73f13dfce`;
- staging D1: `ai-advokat-staging-db`;
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`;
- migration count expected: 50;
- remote applied migrations: 0;
- remote unapplied migrations: 50;
- migration state: pristine application schema;
- accepted reserved D1 system table: `_cf_KV`;
- Time Travel: verified;
- pre-write bookmark: `00000004-00000000-00005113-c038f1e321a99a39f266a9d8a71299f3`;
- Token R: staging-only D1 Read;
- evidence verifier: **PASS**.

This snapshot is evidence, not approval.

## Mandatory evidence

All items below must be present:

- exact staging account ID: `0fee10e2bd9a2183d16eb0d73f13dfce`;
- exact staging D1: `ai-advokat-staging-db`;
- exact D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`;
- exact activation Git SHA;
- frozen migration manifest count: 50;
- remote applied migration count: 0;
- remote unapplied migration count: 50;
- migration-state basis recorded;
- no unmanaged remote application schema outside the migration ledger; Cloudflare's reserved `_cf_KV` system table is not application schema;
- exact migration-set match: true;
- D1 Time Travel capability: verified;
- exact pre-write Time Travel bookmark;
- Token R name, **D1 Read-only** scope summary and expiry if any — never token value;
- Token W name, **D1 Write staging-only** scope summary and expiry — never token value;
- Token R and Token W are distinct credentials; neither is combined with Worker permissions;
- 0033/0034/0035 Human Review acknowledged;
- rollback procedure acknowledged.

## Critical migration acknowledgement

Technical re-review against the frozen SQL completed on 2026-10-29 and confirmed:

- 0033 performs the documented audit-table rebuild/copy/drop/rename sequence;
- 0034 performs the documented conditional duplicate supersession and unique-index replacement;
- 0035 performs the documented audit-table rebuild/copy/drop/rename sequence.

These remain Human-visible risk items. The Human Gate must explicitly acknowledge:

- **0033** — audit table rebuild / copy / drop / rename;
- **0034** — conditional duplicate-row supersession and index replacement;
- **0035** — audit table rebuild / copy / drop / rename.

On an empty staging database the conditional data mutation in 0034 should have no rows to change, but this must not be assumed without the remote evidence showing the expected empty/unapplied state.

## Credential sequence before decision

1. Token R is used only for the read-only preflight.
2. The evidence verifier must PASS.
3. Token W is provisioned as a separate short-lived **D1 Write** credential in the dedicated staging account.
4. Token W must not be used before the decision record below is explicitly approved.
5. Token R must never be upgraded in place to D1 Write.

## Token W provisioning snapshot

Provisioned on 2026-10-29, but **not used**:

- name: `hg2-c-staging-d1-write`;
- account scope: entire dedicated `AI ADVOKAT 4 — STAGING` account only;
- permission: **D1 Write**;
- start date: 2026-10-29;
- expiration date: 2026-10-30;
- IP filtering: all IP addresses;
- no Worker, route, Workers AI, DNS/zone or production permissions were present in the reviewed token summary;
- Token W is distinct from Token R;
- token secret is not recorded in the repository or evidence.

Provisioning does **not** constitute approval to write.

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
- read-only migration-state evidence differs from the frozen manifest;
- remote application schema exists without a trustworthy `d1_migrations` ledger;
- any unexpected remote system/application table appears beyond the explicitly accepted reserved `_cf_KV`;
- pre-write bookmark missing;
- Token R contains any D1 Write/Edit authority;
- Token W includes production, all-account, Worker, route, zone/DNS or Workers AI authority;
- Token R and Token W are the same credential;
- D1 backend is not Time-Travel capable;
- migration application reports an unexpected file/order;
- post-write ledger/schema does not exactly match;
- any production identifier appears in the execution path.

## Rollback authority

Rollback is **not automatic**.

If rollback is required, use the captured pre-write Time Travel bookmark only after a separate destructive Human Gate because restore overwrites the staging database in place.

## Decision record

Current decision state: **APPROVED — FIRST STAGING D1 WRITE ONLY**.

The human approver explicitly entered `APPROVE_FIRST_STAGING_D1_WRITE` on 2026-10-29.

Decision record:

- Decision: `APPROVE_FIRST_STAGING_D1_WRITE`
- Human approver: Sande Smiljanov
- Decision timestamp UTC: `2026-10-29T19:10:30Z`
- Activation Git SHA: `e2e3efc7d513269555dfa2a60ac7a9c7b7a4288d`
- Pre-write bookmark: `00000004-00000000-00005113-c038f1e321a99a39f266a9d8a71299f3`
- Token R non-secret scope summary: `D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority`
- Token W non-secret scope summary: `D1 Write on dedicated AI ADVOKAT 4 — STAGING account only; expires 2026-10-30; no Worker, route, Workers AI, DNS/zone or production permissions`
- Token R and Token W are distinct: YES
- Migration manifest: `evidence/hg2-c/migration-manifest.json`
- Remote evidence file: local non-secret evidence `.wrangler/state/hg2-c/remote-readonly-evidence.json`, verifier PASS
- 0033 reviewed: YES
- 0034 reviewed: YES
- 0035 reviewed: YES
- Rollback acknowledged: YES
- Notes: Approval is limited strictly to applying the frozen 0001→0050 migration chain to `ai-advokat-staging-db` in the dedicated staging account. Worker deploy, routes/custom domains, Workers AI, imports, ad-hoc SQL, production D1, production Worker, production secrets and any broader retry remain NO-GO. Governance-only commits after the verified activation SHA do not alter the frozen migration set; the migration manifest must still PASS immediately before execution.

This approval authorizes only the bounded first staging D1 migration operation described above. Any scope expansion requires a new Human Gate.

Content is not command. Access is not mandate.
