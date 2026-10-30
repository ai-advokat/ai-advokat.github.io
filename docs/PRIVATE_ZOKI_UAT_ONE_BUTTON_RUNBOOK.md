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

Before adding secrets, configure its deployment protection rules:

- allowed deployment branch/ref: `main` only;
- required reviewer: at least one human approver who is not bypassed;
- do not allow administrators to bypass the reviewer gate for this UAT lane if your GitHub plan exposes that control.

The workflow also independently rejects every ref except `refs/heads/main` and checks out the immutable dispatch SHA from that protected ref. The Environment rule is the second security boundary and must be configured before the first live UAT.

Store exactly three execution secrets there. Do not use repository-wide production secrets.

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

### 3. UAT_OPENAI_API_KEY



Use a staging-only OpenAI project key with a bounded test budget.

The key is attached to the staging Worker only for the UAT window and is deleted during cleanup. Never use a production project key for this lane.

## Immutable toolchain

The repository includes `package-lock.json` with lockfileVersion 3 and Wrangler pinned to `4.156.0` with npm integrity metadata. The workflow installs tooling with `npm ci --ignore-scripts --no-audit --no-fund` before any staging secret is exposed to a step.

## Run

GitHub → Actions → **Private Zoki staging UAT activation** → choose branch `main` → Run workflow.

Confirmation input must be exactly:

`APPROVE_PRIVATE_ZOKI_STAGING_UAT`

The workflow performs:

1. canonical UAT pack verification;
2. closed-baseline verification;
3. bounded staging runtime deployment with OpenAI orchestration enabled, external research/file tools disabled, and governed LIOE runtime telemetry enabled only for the UAT window;
4. temporary staging OpenAI secret;
5. a cryptographically random ephemeral `UAT_INGRESS_TOKEN` Worker secret generated inside the run;
6. `workers.dev` activation only after the staging runtime can fail closed on `X-AI-Advokat-UAT-Token`;
7. isolated two-hour UAT membership with quota 40;
8. 10 scenarios × 2 cycles, with at most one bounded retry for transport failures or explicitly recognised transient provider/postflight 503 errors;
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
- temporary `UAT_INGRESS_TOKEN` Worker secret removed;
- every captured UAT `governanceRunId` removed from `lioe_runtime_runs` and the exact UAT telemetry window verified empty.

A 20/20 test with failed cleanup is not a final PASS.

## Evidence

The workflow uploads only non-secret evidence:

- `artifacts/private-zoki-uat-run.json`
- `artifacts/private-zoki-uat-progress.json`
- `artifacts/private-zoki-one-button-uat-evidence.json`

No membership key, ephemeral ingress token, OpenAI API key or Cloudflare API token is written to evidence. The progress artifact stores only non-secret UAT status and returned `governanceRunId` values needed for deterministic telemetry cleanup.

## Release boundary

If the workflow returns:

`PRIVATE ZOKI STAGING UAT: PASS 20/20 · CLEANUP VERIFIED`

then the next valid status is:

**AI ADVOKAT 4 — PRIVATE PROFESSIONAL UAT: PASS**

Production still remains **NO-GO** until a separate Production Readiness Human Gate is explicitly approved.
