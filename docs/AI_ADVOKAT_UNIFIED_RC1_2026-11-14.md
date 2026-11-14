# AI Advokat unified operational RC1 - 2026-11-14

STATUS: DRAFT / PREVIEW candidate. Not merged. Not verified live.

Scope:
- RC84 contracts: local-only review, 28/28 legal hold, no automatic clause activation.
- RC16: review-only information page, HG11 and HG35 remain OPEN and LEGAL NO-GO.
- Translator R20 batch/provenance changes and dual-chat R22 suggestions are already present in main; don't overwrite newer current code with stale PR branches.
- No legal source PDF, client data, raw private ZIP, API key, or unlicensed draft in this PR.
- No D1 changes, runtime quotas, legal signoff, automatic article publishing or production deployment performed by this PR.

Functional acceptance:
1. Full CI, security, activation, corpus, dependencies and translator layered tests on exact PR head PASS.
2. Cloudflare preview route renders home, external bot, AI Contract PRO, Contract Intelligence, Consolidator v10.4, RC84 and RC16 reviews.
3. Synthetic-only browser smoke confirms home and bot navigation, one internal conversation, one external conversation, MK/SQ or MK/EN translator and microphone permission/error handling. NOT TESTED on live preview yet.
4. The Zoki legal source chain and publishing permission are independently verified; until then legal status remains HOLD/NO-GO.

Deployment blocker:
GitHub Actions production-runtime-sync.yml and sync-pages-runtime.yml in this candidate are manually triggered and reference production environment. But the independent native Cloudflare Git integration is connected to ai-advokat/ai-advokat.github.io Worker ai-advokat-github-io, watch paths '*'; it may auto-deploy when main changes. The GitHub production environment approver and main branch restriction do NOT gate native Cloudflare Git builds. The Cloudflare production branch and active build settings have not been independently confirmed.

No merge until owner explicitly authorizes the production effect, the Cloudflare build path is controlled, and preview/browser QA passes. A green CI is not legal approval or user acceptance.

Rollback:
Restore the last verified Cloudflare Worker deployment and previous gh-pages/static frontend as appropriate, and check all resources. A git revert alone might not revert a deployed Worker. No D1 migration in this candidate.

Separate ongoing blockers:
- Translator MK/SQ and provider fallback live acceptance: NOT VERIFIED.
- Microphone permission and HTTP503 recovery on real browser: NOT VERIFIED.
- RC16 law provenance and RC84 contracts: lawyer-controlled LEGAL HOLD.
