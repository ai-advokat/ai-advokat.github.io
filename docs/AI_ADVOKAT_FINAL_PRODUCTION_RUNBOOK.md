# AI Advokat 4 — Final Production Runbook

Status: PREPARED · PRODUCTION NOT DEPLOYED

## Evidence already closed

- Private Zoki staging UAT: PASS 20/20.
- Cleanup: VERIFIED.
- Production touched by staging UAT: false.
- Main release candidate includes the accepted staging fixes.

## Gate A — Read-only production readiness

Run workflow: **AI Advokat final production readiness**.

Required confirmation:

`CHECK_AI_ADVOKAT_PRODUCTION_READINESS`

This gate is read-only. It verifies the exact production target, required D1 schema, OpenAI model/quota, live health/orchestrator/capabilities, and the unauthenticated bot fail-closed contract. It does not deploy, migrate, change secrets, or authorize production release.

Acceptance condition:

`AI ADVOKAT 4 — FINAL PRODUCTION READINESS · PASS`

## Gate B — Production Human Gate

Only after Gate A is PASS may the owner explicitly authorize the existing deployment workflow:

**Zoran standalone bot production runtime deploy**

Required production confirmation:

`DEPLOY_ZORAN_BOT_RUNTIME`

This is a separate consequential Human Gate. Approval of staging UAT or Gate A does not authorize Gate B.

## Production release boundary

The bounded deployment targets only the current Worker runtime at the governed production Worker and D1 identity. Autonomous legal filing remains prohibited. Membership access remains fail-closed. Any deployment failure requires inspection of evidence before any rerun.
