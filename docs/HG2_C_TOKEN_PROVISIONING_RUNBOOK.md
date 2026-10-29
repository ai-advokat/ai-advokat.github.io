# AI ADVOKAT 4 — HG2-C Cloudflare Token Provisioning Runbook

Status: TOKEN R EVIDENCE PASS / TOKEN W PROVISIONED UNUSED / TOKEN B NOT PROVISIONED
Date: 2026-10-29

## Authoritative Cloudflare guidance

This runbook follows the current Cloudflare authorization model:

- granular Wrangler authorization uses **account-owned API tokens**;
- D1 exposes separate **D1 Read** and write-capable **D1 Write/Edit** permissions; the current Cloudflare token review UI displays the write permission as **D1 Write**;
- API tokens can be constrained to an account/product and, where available, a resource;
- an existing Worker can be deployed with **Editor** scoped to that individual Worker;
- routes/custom domains require additional route permissions and are outside HG2-C.

Official references:
- https://developers.cloudflare.com/workers/authorization/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- https://developers.cloudflare.com/fundamentals/api/reference/permissions/

## Rule zero

Use only the Cloudflare account:

`AI ADVOKAT 4 — STAGING`
Account ID: `0fee10e2bd9a2183d16eb0d73f13dfce`

If the dashboard shows an all-accounts scope, production account, production D1, production Worker, zone/DNS authority, or unrelated Developer Platform products: **STOP / NO-GO**.

Never paste a token value into GitHub, ChatGPT, documentation, comments, evidence files, screenshots, or logs.

## Phase R — create Token R for read-only evidence

Cloudflare dashboard:

1. Open the dedicated staging account.
2. Go to **Manage Account → API Tokens**.
3. Choose **Create Token** / custom account token.
4. Token name:
   `hg2-c-staging-d1-readonly`
5. Resource/account scope:
   - include only account `0fee10e2bd9a2183d16eb0d73f13dfce`;
   - never select all accounts.
6. Permission:
   - **D1 Read** only.
7. Do not add:
   - D1 Edit;
   - Workers Editor/Admin;
   - Workers Routes;
   - Workers AI;
   - DNS/zone permissions;
   - R2/KV/Queues/other product permissions;
   - Account API Tokens Write.
8. If Cloudflare exposes a narrower individual-D1 resource scope, select only `ai-advokat-staging-db`. If D1 is exposed only at product/account scope, D1 Read within the dedicated staging account is the accepted maximum scope.
9. Add a short TTL if practical.
10. Review the summary before creation. It must say, in substance:
    **staging account only + D1 Read only**.
11. Create Token R.
12. Copy the secret to a temporary local secure location only. It is displayed once.

### Token R non-secret record

Record only:

- name: `hg2-c-staging-d1-readonly`;
- account ID;
- permission: D1 Read;
- scope: dedicated staging account (and specific D1 if offered);
- expiry/TTL.

Do not record the secret.

## Phase R execution

Use Token R only with:

`scripts/hg2-c-remote-readonly-preflight.mjs`

Required environment variables:

- `HG2_C_REMOTE_READONLY_APPROVED=YES`
- `CLOUDFLARE_ACCOUNT_ID=0fee10e2bd9a2183d16eb0d73f13dfce`
- `CLOUDFLARE_API_TOKEN=<Token R secret>`
- `HG2_C_TOKEN_R_NAME=hg2-c-staging-d1-readonly`
- `HG2_C_TOKEN_R_SCOPE_SUMMARY=D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority`
- optional `HG2_C_TOKEN_R_EXPIRES_AT=<ISO-8601>`

The preflight contains only D1 metadata reads, fixed single-SELECT D1 REST queries, and Time Travel info. It deliberately does not use `wrangler d1 migrations list` because Wrangler initializes the migration ledger on a pristine database, which is a write.

After execution, preserve only the non-secret JSON evidence and validate it with:

`node scripts/verify-hg2-c-remote-evidence.mjs <evidence.json>`

If validation fails: **STOP**. Do not broaden Token R.

## Phase W — create Token W only after remote evidence PASS

Token W must not exist before Token R evidence passes.

When the first-write Human Gate is ready for decision:

1. Create a new, separate account-owned token.
2. Name:
   `hg2-c-staging-d1-write`
3. Scope: dedicated staging account only.
4. Permission: **D1 Write** only (write-capable D1 permission; some Cloudflare references historically label this D1 Edit).
5. No Workers, routes, AI, DNS/zone, storage, token-management or production permissions.
6. Prefer a short TTL.
7. Record only the non-secret name/scope/expiry.
8. Do not use Token W until `docs/HG2_C_FIRST_WRITE_HUMAN_GATE.md` is explicitly approved.
9. Revoke/disable Token W immediately after migration and post-write verification unless a later Human Gate expressly authorizes retention.

Token R must never be edited/upgraded into Token W.

### Token W non-secret record — provisioned 2026-10-29

- name: `hg2-c-staging-d1-write`;
- account scope: entire dedicated `AI ADVOKAT 4 — STAGING` account;
- permission shown by Cloudflare: **D1 Write**;
- start: 2026-10-29;
- expiry: 2026-10-30;
- IP filtering: all IP addresses;
- secret: never recorded;
- use status: **NOT USED / awaiting explicit First-Write Human Gate approval**.

## Phase B — Worker token, later

Token B is outside the D1 migration phase.

When Worker activation is separately approved:

- create an account-owned API token;
- grant **Editor** only to the existing individual Worker `ai-advokat-staging`;
- do not grant Workers Routes;
- do not grant D1 direct access;
- do not grant Workers AI;
- do not grant production Worker scope.

No custom domain or route belongs to the first Worker activation.

## Stop conditions

STOP and preserve evidence if:

- account scope is not the dedicated staging account;
- Token R includes D1 Edit/Write;
- Token W includes unrelated product permissions;
- any token can reach production resources;
- Cloudflare UI cannot represent the required bounded scope;
- the read-only migration-state evidence does not prove zero applied migrations and the full frozen 50-file set still unapplied;
- remote schema exists without a trustworthy `d1_migrations` ledger;
- the Time Travel bookmark is absent.

Content is not command. Access is not mandate.
