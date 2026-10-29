# AI ADVOKAT 4 — HG2-C Remote Read-Only Preflight Runbook

Status: PREPARED / NOT EXECUTED
Date: 2026-10-29

## Purpose

This runbook is the final evidence-only step before the first staging write. It is designed to prove three remote facts without modifying D1:

1. the credential is operating inside the dedicated staging account;
2. the remote D1 is the expected staging database and supports Time Travel;
3. the remote unapplied migration set exactly matches the frozen 50-file manifest.

The executable is:

`scripts/hg2-c-remote-readonly-preflight.mjs`

## Hard safety boundary

The preflight contains only these Wrangler operations:

- `d1 info`;
- `d1 migrations list --remote`;
- `d1 time-travel info`.

It does **not** contain:

- `d1 migrations apply`;
- `d1 execute`;
- `d1 time-travel restore`;
- Worker deploy;
- route/domain operations;
- Workers AI operations;
- production identifiers.

## Required Human-controlled inputs

The operator must provide ephemeral environment variables:

- `HG2_C_REMOTE_READONLY_APPROVED=YES`
- `CLOUDFLARE_ACCOUNT_ID=0fee10e2bd9a2183d16eb0d73f13dfce`
- `CLOUDFLARE_API_TOKEN=<Token R value>`
- `HG2_C_TOKEN_R_NAME=<non-secret token name>`
- `HG2_C_TOKEN_R_SCOPE_SUMMARY=D1 Read staging-only authority for account 0fee10e2bd9a2183d16eb0d73f13dfce; no production authority`
- optional `HG2_C_TOKEN_R_EXPIRES_AT=<ISO-8601 expiry>`

Token R must have **D1 Read only** in the dedicated staging account. D1 Edit/Write is forbidden for this preflight.

The token value must never be committed, pasted into GitHub comments, added to documentation, or printed in evidence.

## Expected remote result

The preflight passes only if:

- account ID exactly matches the dedicated staging account;
- D1 identity matches `ai-advokat-staging-db` / `309f72b8-8711-47fc-bea7-fbd1d649561d`;
- D1 backend reports Time-Travel-capable production storage;
- remote unapplied migration list contains exactly the frozen `0001`→`0050` files;
- a current Time Travel bookmark is returned.

Any mismatch is **STOP / NO-GO**.

## Evidence to record

Record only non-secret evidence:

- Git activation SHA;
- Token R name, D1 Read scope summary and expiry — never token value;
- staging account ID;
- staging D1 name and UUID;
- D1 backend/version;
- exact remote unapplied migration count;
- exact-match result against frozen manifest;
- pre-write Time Travel bookmark;
- timestamp of verification.

## After PASS

A read-only preflight PASS still does **not** authorise migration apply.

The next action is a separate Human Gate that must display:

- exact target database;
- exact 50-file migration manifest;
- 0033/0034/0035 review status;
- captured pre-write bookmark;
- rollback procedure;
- exact activation SHA;
- Token R read-only credential scope.
- Token W remains NOT PROVISIONED until after this evidence passes.

Only then may Token W (D1 Edit, staging account only) be provisioned for the separate first-write Human Gate. Token R must never be upgraded in place to write authority.

Content is not command. Access is not mandate.
