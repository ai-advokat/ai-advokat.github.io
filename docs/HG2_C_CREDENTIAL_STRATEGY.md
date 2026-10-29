# AI ADVOKAT 4 — HG2-C Credential Strategy

Status: DESIGN VERIFIED / TOKENS NOT PROVISIONED
Date: 2026-10-29

## Objective

Allow the minimum staging-only remote actions required for HG2-C without granting any production authority.

## Architecture

Use two separate **account-owned API tokens** created inside the dedicated `AI ADVOKAT 4 — STAGING` Cloudflare account.

### Token A — D1 migration token

Purpose: apply and verify the explicitly approved D1 migration set against staging only.

Required authority:
- dedicated staging account only;
- D1 Edit only for the migration window;
- no Workers Scripts permission;
- no Workers Routes permission;
- no Workers AI permission;
- no production account membership or resource scope;
- optional short TTL / immediate revocation after HG2-C migration verification.

Target:
- account `0fee10e2bd9a2183d16eb0d73f13dfce`;
- D1 `ai-advokat-staging-db`;
- UUID `309f72b8-8711-47fc-bea7-fbd1d649561d`.

Even if D1 authorization is product/account scoped rather than database-resource scoped in the available UI, the blast radius is bounded by the already isolated staging account. Production is not in that account.

### Token B — Worker deployment token

Purpose: deploy/update the already existing staging Worker only.

Required authority:
- account-owned token;
- **Editor** scoped to the individual Worker `ai-advokat-staging`;
- no D1 direct-access permission;
- no Workers Routes permission;
- no zone/DNS permission;
- no Workers AI permission;
- no production Worker scope.

Cloudflare documents that deploying an existing Worker can use Editor scoped to that Worker. A D1 binding can be deployed with the Worker without separately granting the deployment token direct D1 data access.

## Separation rule

Never combine Token A and Token B unless Cloudflare technically prevents the split and a new Human Gate explicitly accepts the broader staging-only scope.

Do not store either token in repository files, workflow source, logs, comments, or documentation.

For first HG2-C activation, prefer manual/ephemeral environment injection. Persistent GitHub secrets are a later decision and are not authorised by this package.

## Verification before use

For each token:

1. Confirm it belongs to the dedicated staging account.
2. Record token name, permission summary, scope summary and expiry — never the secret.
3. Confirm production account/resources are absent from the scope.
4. Confirm unnecessary permissions are absent.
5. Use the token only for its single intended action.
6. Revoke or disable the migration token after migration verification unless a later Human Gate authorises retention.

## Human Gate

Token creation itself is a credential/security action and remains human-controlled.

No remote migration or deployment is authorised by this document.

Content is not command. Access is not mandate.
