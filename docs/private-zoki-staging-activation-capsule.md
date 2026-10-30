# AI ADVOKAT 4 — Private Zoki Staging Activation Capsule

Status: HUMAN GATE APPROVED · STAGING ONLY · PRODUCTION NO-GO

Approved phrase: `APPROVE_PRIVATE_ZOKI_STAGING_UAT`

## Immutable target boundary

- Cloudflare account: `0fee10e2bd9a2183d16eb0d73f13dfce`
- Worker: `ai-advokat-staging`
- D1: `ai-advokat-staging-db`
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`
- Production writes/deploys: forbidden
- Public staging exposure: forbidden

## Operator sequence

1. Confirm the four staging identifiers above before any write.
2. Add the AI provider secret only inside the dedicated staging runtime. Never place it in GitHub.
3. Keep the staging surface private behind Cloudflare Access or an equivalent private-access control.
4. Generate a high-entropy temporary membership key locally, outside source control.
5. Hash it locally with the existing command:
   `npm run membership:key-hash -- "<temporary-key>"`
6. Use only the emitted SHA-256 hash and prefix to fill a local copy of `uat/private-zoki-staging-membership.template.sql`.
7. Use a `UAT-ZOKI-` account id, quota 40, record `startsAt`, and set `expiresAt` no later than four hours after `startsAt`.
8. Apply the filled SQL only to the dedicated staging D1 after verifying the target identity.
9. Fill a local copy of `evidence/private-zoki-staging-uat-evidence.template.json` and verify it with:
   `node scripts/verify-private-zoki-staging-evidence.mjs <evidence-file>`
10. Execute the canonical UAT harness locally with `UAT_BASE_URL`, `UAT_MEMBERSHIP_KEY` and, if required, Cloudflare Access service credentials supplied only through the operator environment: `node scripts/run-private-zoki-uat.mjs`. The harness reads `uat/private-zoki-uat-scenarios.json`, runs both required cycles, evaluates every response assertion, and writes `artifacts/private-zoki-uat-run.json`. PASS requires 20/20.
11. Immediately execute the cleanup SQL and revoke temporary Access credentials.
12. Remove or disable the staging AI provider secret unless continued private staging testing is separately authorised.

## Stop conditions

Abort immediately if any account, Worker or D1 identifier differs; if the staging surface is public; if a production credential is present; if the temporary membership is not isolated; or if any scenario fails.

Production remains **NO-GO** until a separate Production Readiness Human Gate is issued.
