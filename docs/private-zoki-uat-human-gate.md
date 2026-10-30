# AI ADVOKAT 4 — Private Zoki UAT Human Gate

Status: PREPARATION ONLY — REMOTE STAGING UAT NOT AUTHORIZED

This checklist does not authorize production deployment, production database writes, or public exposure.

Before any remote staging UAT can begin, all of the following must be independently verified:

1. Dedicated staging account and Worker identity are unchanged: `ai-advokat-staging`.
2. Dedicated staging D1 identity is unchanged: `ai-advokat-staging-db`.
3. Production account, Worker and D1 credentials are not present in the staging execution path.
4. A staging-only AI provider secret is created and scoped only to the dedicated staging environment.
5. A temporary UAT membership is created in staging with sufficient quota for at least 20 requests and is not Zoki's persistent production entitlement.
6. Private access is configured so the approved staging surface is not publicly reachable.
7. A per-request timeout is enforced and partial evidence is written after every scenario.
8. The 10-scenario manifest in `uat/private-zoki-uat-scenarios.json` is run twice consecutively.
9. PASS requires 20/20 successful checks with no manual reinterpretation of failures.
10. After UAT, temporary staging credentials and temporary UAT membership are revoked or disabled.

Required explicit authorization phrase for the future remote staging step:

`APPROVE_PRIVATE_ZOKI_STAGING_UAT`

Until that Human Gate is given and the infrastructure evidence is available, the correct status is:

**PRIVATE ZOKI UAT — PREPARED, NOT EXECUTED**

Production remains **NO-GO**.
