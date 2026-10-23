# AI Advokat 4 — P0 0050-only preparation procedure

Status: **PREPARED ONLY — NO PRODUCTION AUTHORIZATION**

Date: 2026-10-24

## Purpose

Prepare a strictly isolated path for migration `0050_lioe_provider_diagnostics.sql` without applying pending migrations 0045, 0048 or 0049.

## Verified production prestate

The controlled retry run detected exactly four pending migrations:

- 0045_case_private_d1_object_store.sql
- 0048_zkp_commentary_v6_secondary_layer.sql
- 0049_case_law_binding_extraction_audit.sql
- 0050_lioe_provider_diagnostics.sql

Migration 0050 was not applied. The controlled runtime-deploy and paid AI smoke steps did not run.

## Backup evidence already verified in retry run #40036528126

- Time Travel bookmark capture: PASS.
- Full D1 SQL export: PASS.
- Local SQLite restore from the export: PASS.
- Export SHA-256: `f1ebebd8c8af072881b982464ea09ffe660e71f7ecbe920f2706aa4decc84784`.
- Export size: `13,880,343` bytes.
- Full SQL export was not uploaded to GitHub.

The exact bookmark value is intentionally not persisted in this public repository. A fresh Time Travel bookmark must be captured immediately before any future authorized production write.

## Security remediation for export logging

Future export commands redirect all Wrangler stdout/stderr to an ephemeral runner file. The workflow prints only a generic success/failure message, SHA-256 and byte count. It never prints the signed D1 export URL.

The public retry #2 log contains a temporary signed URL from the earlier command. Preserve this audit record, then delete that GitHub Actions run/log manually. The connected GitHub tool available to ChatGPT has GET/rerun Actions capabilities but no delete-run/delete-log action.

## Isolated 0050 design

The preparation workflow creates an ephemeral directory:

`migrations-p0-0050/`

containing only:

`0050_lioe_provider_diagnostics.sql`

It creates an ephemeral Wrangler config copied from the exact approved candidate and sets:

`d1_databases[0].migrations_dir = "migrations-p0-0050"`

The workflow must then prove that the isolated migration view contains only 0050 before any write.

Cloudflare D1 supports a custom `migrations_dir`, and migration state is tracked in the D1 migrations table. This allows an isolated 0050 migration view while leaving 0045, 0048 and 0049 outside the apply set.

## Future activation gates

A later production run may proceed only after a new explicit owner authorization. It must fail closed unless all of the following are true:

1. Exact candidate SHA remains `1d65b251343cab4b1329d8cc8478e8948d363750`.
2. Exact production D1 ID remains `12ece285-74bb-4f27-a025-2dbd1be6c59a`.
3. Fresh Time Travel bookmark captured with value suppressed from logs.
4. Fresh full SQL export passes SHA/size checks and local restore validation.
5. Default pending set is exactly 0045, 0048, 0049, 0050.
6. Isolated migration view is exactly 0050.
7. Version 50 and all eight provider-diagnostic columns are absent before apply.
8. Apply uses only `wrangler.p0-0050.jsonc`.
9. After apply, default pending set is exactly 0045, 0048 and 0049; 0050 is absent.
10. Version 50 and all eight columns are verified before any runtime deployment.

## Prohibited actions in the preparation phase

- No migration apply.
- No runtime deployment.
- No paid AI smoke.
- No provider/secret change.
- No activation of 0045, 0048 or 0049.
- No corpus/current-law/RAG promotion.
- No weakening of Human Gate or LIOE.
