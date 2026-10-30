# AI ADVOKAT 4 — Private Zoki UAT One-Button Runbook

Status: STAGING-ONLY RELEASE CANDIDATE · PRODUCTION NO-GO

Human Gate already approved:

`APPROVE_PRIVATE_ZOKI_STAGING_UAT`

## Purpose

Execute the canonical 10-scenario Private Zoki UAT twice against the dedicated staging Worker, require 20/20 PASS, and automatically restore the closed staging baseline.

No production Worker, production D1, production route or production credential belongs to this lane.

## Immutable staging target

- Account: `0fee10e2bd9a2183d16eb0d73f13dfce`
- Worker: `ai-advokat-staging`
- D1: `ai-advokat-staging-db`
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`
- Temporary protected origin: `https://ai-advokat-staging.ai-advokat-4-staging.workers.dev`

The orchestrator rejects the production D1 UUID and production Worker identity.

## GitHub environment

Create or use the GitHub Environment:

`staging-uat`

Store exactly four secrets there. Do not use repository-wide production secrets.

### 1. HG2_C_UAT_WORKER_TOKEN_B

Cloudflare account-owned API token.

Scope:
- dedicated staging account only;
- Individual Worker Editor for existing `ai-advokat-staging` only.

Must not include:
- production Worker;
- D1 read/write;
- routes;
- DNS/zone;
- Access administration;
- account API-token administration.

This token is used only for the bounded Worker deployment, temporary OpenAI Worker secret and temporary `workers.dev` toggle.

### 2. HG2_C_UAT_D1_TOKEN_W

Cloudflare account-owned API token.

Scope:
- dedicated staging account only;
- D1 Write only;
- narrow to `ai-advokat-staging-db` if Cloudflare offers per-D1 resource scope.

Must not include Workers, routes, DNS/zone, Access or production authority.

This token creates only one temporary `UAT-ZOKI-` membership and deletes it in cleanup.

### 3. HG2_C_UAT_ACCESS_TOKEN_A

Cloudflare account-owned API token.

Scope:
- dedicated staging account only;
- Access: Apps and Policies Write;
- Access: Service Tokens Write.

Must not include Workers, D1, DNS/zone or production authority.

The workflow creates a short-lived service token and Access application before enabling `workers.dev`, then deletes both during cleanup.

### 4. UAT_OPENAI_API_KEY

Use a staging-only OpenAI project key with a bounded test budget.

The key is attached to the staging Worker only for the UAT window and is deleted during cleanup. Never use a production project key for this lane.

## Run

GitHub → Actions → **Private Zoki staging UAT activation** → Run workflow.

Confirmation input must be exactly:

`APPROVE_PRIVATE_ZOKI_STAGING_UAT`

The workflow performs:

1. canonical UAT pack verification;
2. closed-baseline verification;
3. temporary Cloudflare Access service token + application;
4. bounded staging runtime deployment with OpenAI orchestration enabled and external research/file tools disabled;
5. temporary staging OpenAI secret;
6. Access-protected `workers.dev` activation;
7. isolated two-hour UAT membership with quota 40;
8. 10 scenarios × 2 cycles;
9. PASS only at 20/20;
10. unconditional cleanup;
11. baseline staging redeploy;
12. evidence artifact upload.

## Mandatory cleanup

The job is not PASS unless all are true:

- temporary UAT membership removed;
- `workers.dev` disabled again;
- temporary OpenAI Worker secret removed;
- baseline `wrangler.staging.jsonc` redeployed;
- Access application deleted;
- Access service token deleted.

A 20/20 test with failed cleanup is not a final PASS.

## Evidence

The workflow uploads only non-secret evidence:

- `artifacts/private-zoki-uat-run.json`
- `artifacts/private-zoki-one-button-uat-evidence.json`

No membership key, Access client secret, OpenAI API key or Cloudflare API token is written to evidence.

## Release boundary

If the workflow returns:

`PRIVATE ZOKI STAGING UAT: PASS 20/20 · CLEANUP VERIFIED`

then the next valid status is:

**AI ADVOKAT 4 — PRIVATE PROFESSIONAL UAT: PASS**

Production still remains **NO-GO** until a separate Production Readiness Human Gate is explicitly approved.
