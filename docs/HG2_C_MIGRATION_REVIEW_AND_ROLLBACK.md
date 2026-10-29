# AI ADVOKAT 4 — HG2-C Migration Review and Rollback Plan

Status: READ-ONLY EVIDENCE PASS / FIRST WRITE NOT APPROVED
Date: 2026-10-29
Frozen manifest source commit: `d6aeaf5c51d1e1672b7a0d7650bbeb3607490198`
Verified read-only activation SHA: `e2e3efc7d513269555dfa2a60ac7a9c7b7a4288d`

## Frozen migration set

The first staging activation is bound to:

- `evidence/hg2-c/migration-manifest.json`
- exactly **50** SQL migrations;
- first: `0001_initial_schema.sql`;
- last: `0050_lioe_provider_diagnostics.sql`;
- target D1: `ai-advokat-staging-db`;
- target UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`;
- target account: `0fee10e2bd9a2183d16eb0d73f13dfce`.

No migration outside this frozen set is authorised for the first HG2-C remote write.

## Critical Human Review: 0033–0035

### 0033 — `casepilot_audit_event_schema`

Risk class: **TABLE REBUILD / DATA PRESERVATION**

The migration creates a replacement audit table, copies existing rows, drops the old table, renames the replacement and recreates the index. It is deterministic and passed the local full-chain dry-run, but the drop/rename sequence is consequential and must remain visible in the Human Gate.

### 0034 — `casepilot_authority_classification_unique_issue`

Risk class: **CONDITIONAL DATA UPDATE / INDEX REPLACEMENT**

The migration may mark duplicate active classification rows as `superseded`, drops the previous unique index and creates an expression-based replacement. On a fresh empty staging database the data-update branch has no rows to mutate, but the operation remains Human Review because a non-empty target would change data.

### 0035 — `case_document_download_audit`

Risk class: **TABLE REBUILD / DATA PRESERVATION**

The migration again rebuilds the constrained audit table to add the `document_downloaded` event, copies rows, drops the predecessor table, renames and recreates the index. It remains Human Review.

## Pre-write remote evidence — VERIFIED PASS

The remote read-only gate completed successfully under Token R (D1 Read only).

Verified state:

1. staging account ID, D1 name and UUID matched exactly;
2. Time Travel capability was verified;
3. pre-write bookmark was captured:
   `00000004-00000000-00005113-c038f1e321a99a39f266a9d8a71299f3`;
4. remote migration state was derived with fixed single-SELECT reads, not with `wrangler d1 migrations list`;
5. remote applied migration count: **0**;
6. remote unapplied frozen migration count: **50**;
7. remote application schema is pristine; Cloudflare's reserved `_cf_KV` system table is excluded from application schema;
8. exact activation SHA:
   `e2e3efc7d513269555dfa2a60ac7a9c7b7a4288d`;
9. Token R remained staging-only **D1 Read** and was not upgraded to write authority.

The former `migrations list` evidence step is intentionally retired because Wrangler initializes `d1_migrations` on a pristine database and therefore is not a pure read.

This PASS does not authorize a remote apply.

## Apply boundary

Only after the Human Gate:

- apply the exact frozen migration set to the dedicated staging D1;
- no production database;
- no Worker deployment in the same operation;
- no data imports beyond what the frozen SQL migrations themselves contain;
- no routes, domains, Workers AI or storage activation;
- no retry with broader credentials after any failure.

Cloudflare Wrangler's D1 migration apply mechanism reports the migrations it is about to apply and captures a backup during apply. The repository still requires an independently recorded pre-write Time Travel bookmark as the primary rollback anchor.

## Post-write verification

Immediately after apply:

1. Read the D1 migration ledger.
2. Verify all expected migration versions are present once.
3. Verify the final schema required by 0050 exists.
4. Run read-only smoke queries only.
5. Confirm production identifiers never appear in command output or config.
6. Preserve the post-write bookmark and activation evidence.
7. Stop before Worker deployment.

## Rollback

If migration application fails or post-write verification is not exact:

1. **STOP** all further activation.
2. Preserve logs and the failed-state bookmark.
3. Do not run ad-hoc corrective SQL.
4. Use the pre-write Time Travel bookmark as the rollback target.
5. Treat Time Travel restore as a destructive Human Gate action because it overwrites the staging database in place.
6. After restore, verify the restored bookmark/state read-only.
7. Revoke the temporary D1 migration token if its task is complete or if credential behavior is unexpected.

Cloudflare documents Time Travel as point-in-time recovery for D1 and states that restore overwrites the database in place. The restore response provides the prior bookmark so the restore itself can be reversed if necessary.

## Current decision

**Repository evidence: PASS**

**Remote read-only evidence: PASS**

**0033/0034/0035 technical review: PASS / remains Human-visible**

**Remote migration: NO-GO / NOT APPROVED**

Remaining prerequisites:
- provision a new, separate short-lived Token W with staging-only D1 Edit authority;
- record only Token W non-secret name/scope/expiry;
- explicitly complete the First Remote Write Human Gate;
- do not use Token W before that Human Gate decision.

Token R must never be upgraded in place.

Content is not command. Access is not mandate.
