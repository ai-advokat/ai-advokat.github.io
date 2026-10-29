# AI ADVOKAT 4 — HG2-C Migration Review and Rollback Plan

Status: REPOSITORY VERIFIED / REMOTE WRITE NO-GO
Date: 2026-10-29
Target activation base: `d6aeaf5c51d1e1672b7a0d7650bbeb3607490198`

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

## Pre-write remote evidence — mandatory

Before any migration is applied:

1. Verify the Cloudflare account ID, D1 name and UUID again.
2. Verify D1 backend/version and Time Travel availability.
3. Retrieve and record the **current Time Travel bookmark** for the staging D1.
4. Run a remote **migration list only** to enumerate unapplied migrations.
5. Compare that remote list byte-for-byte/order-for-order with the frozen repository manifest.
6. If the remote list is not the expected 0001→0050 set for an empty staging database, **STOP**.
7. Record the exact Git activation SHA.
8. Record Token A non-secret scope summary. Never record the token value.

No remote apply is allowed merely because the list command succeeds.

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

**Remote migration: NO-GO**

Remaining prerequisites:
- Token A physically provisioned with staging-only D1 authority;
- exact remote migration-list evidence;
- pre-write Time Travel bookmark;
- explicit Human Gate for the first remote write.

Content is not command. Access is not mandate.
