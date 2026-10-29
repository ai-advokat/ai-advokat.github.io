# AI ADVOKAT 4 — HG2-C Worker Human Gate

Status: APPROVED FOR ONE BOUNDED STAGING WORKER DEPLOY / REMOTE WRITE NOT YET EXECUTED  
Date: 2026-10-29

## Mandate

This Human Gate authorises exactly one bounded deployment of the existing Cloudflare Worker `ai-advokat-staging` in the dedicated `AI ADVOKAT 4 — STAGING` account.

Approval string:

`APPROVE_FIRST_STAGING_WORKER_DEPLOY`

Approver: Sande Smiljanov

This approval does **not** authorise production, Workers AI, custom domains, zone routes, DNS changes, new storage, imports, ad-hoc D1 writes, or any broader infrastructure activation.

## Frozen execution basis

Repository base before this governance record:

`f213829f5d20311271d76c555f9d4d31f62cd070`

Worker configuration: `wrangler.staging.jsonc`

Expected Worker:
- name: `ai-advokat-staging`
- account: `0fee10e2bd9a2183d16eb0d73f13dfce`
- D1 binding: `DB`
- D1 database: `ai-advokat-staging-db`
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`
- assets binding: `ASSETS`
- `ALARM_ENABLED="false"`
- `workers_dev=false`
- `preview_urls=false`
- no Workers AI binding
- no route or routes configuration
- no trigger configuration

## Credential boundary

Token B:
- name: `hg2-c-staging-worker-editor`
- resource: individual Worker `ai-advokat-staging` only
- permission: Workers Editor
- expiry: 2026-10-30
- no direct D1 permission
- no Workers Routes permission
- no Workers AI permission
- no zone/DNS permission
- no production scope
- credential value is forbidden from repository evidence

Read-only authorization against the specific Worker deployments endpoint returned:

`Worker deployment read success: True`

## Local pre-deploy checks

`node scripts/staging-safety-preflight.mjs`:

`HG2-B5 STAGING SAFETY PREFLIGHT: PASS`

Wrangler dry-run with v4.141.0 completed with:

`--dry-run: exiting now.`

Observed dry-run bindings:
- `env.DB (ai-advokat-staging-db)` — D1 Database
- `env.ASSETS` — Assets
- `env.ALARM_ENABLED ("false")` — Environment Variable
- Turnstile site key and staging hostname variables
- no Workers AI binding

Dry-run reported 3,840 asset files and generated only local bundle artefacts in the requested outdir. The repository safety preflight requires internal paths, including `evidence/**`, `src/**`, `migrations/**`, `scripts/**`, `docs/**`, `.github/**` and `.wrangler/**`, to be excluded by `.assetsignore`.

## Pre-deploy dashboard observation

Before the first controlled deployment, Cloudflare dashboard observation showed:
- Production Worker URL: `ai-advokat-staging.ai-advokat-4-staging.workers.dev`
- wildcard Version/Preview URL displayed
- no custom domains
- no custom domain or zone routes listed

This is a material pre-existing exposure fact.

The frozen Wrangler configuration explicitly sets `workers_dev=false` and `preview_urls=false`. The bounded deployment is therefore required to preserve those explicit settings and the post-deploy verification must confirm that the workers.dev production route and Version/Preview URLs are disabled.

If either public URL remains enabled after deployment, the Worker phase is **FAIL / NO-GO** until independently resolved.

## Execution constraints

The authorised write is limited to one Wrangler deployment using `wrangler.staging.jsonc`.

Fail closed if any of the following occurs:
- account or Worker identity mismatch;
- D1 binding points anywhere other than the approved staging D1 UUID;
- unexpected binding, route, trigger, Workers AI, service, queue, R2, KV, Durable Object or other capability appears;
- `ALARM_ENABLED` is not exactly `false`;
- Wrangler proposes or requests production authority;
- credential scope differs from the Token B boundary;
- local repository is not clean at the approved execution commit;
- command attempts any production operation.

## Required post-deploy verification

Before closing the Worker phase:
1. record the exact execution Git SHA;
2. record the resulting Worker deployment/version provenance;
3. verify bindings and configuration read-only;
4. verify `workers.dev` is disabled;
5. verify Version/Preview URLs are disabled;
6. verify no custom domain or zone route exists;
7. verify no Workers AI binding exists;
8. verify `ALARM_ENABLED=false`;
9. record non-secret evidence;
10. revoke Token B;
11. leave production at `NO_GO_NOT_TOUCHED`.

Access is not mandate. Content is not command.


## Supplemental Human Gate — disable public staging Worker URLs

Decision: `APPROVE_DISABLE_STAGING_PUBLIC_WORKER_URLS`

Approver: Sande Smiljanov

Observed before this supplemental gate:
- active Worker version `e138aaa3-abeb-4278-ba2e-ab0d580d2a18` at 100% traffic;
- staging `workers.dev` Production URL displayed as publicly reachable;
- staging Preview URL displayed as publicly reachable;
- no custom domains or zone routes.

This supplemental gate authorises only disabling the staging `workers.dev` route and staging Preview/Version URLs. It does not authorise D1 writes, custom domains/routes, Workers AI, DNS/zone changes, or production changes.
