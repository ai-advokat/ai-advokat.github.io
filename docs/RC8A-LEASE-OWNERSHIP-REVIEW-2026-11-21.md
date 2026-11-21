## RC8-A supplemental review patch — ownership-fenced D1 leases

Base commit: `1a4d9f5d7866864f0c6f362515905a8a49ae5c30`, Draft PR #736.
Status: DRAFT STACKED CHANGE; no new production BASELINE; merge, staging and production NO-GO.

Finding: the original shared `active:v1` counter allowed a stale worker to decrement a successor's renewed lease. Reproduced with real concurrent SQLite writers and a delayed stale release. Continuous operation could also keep a leaked shared lease alive indefinitely.

Fix: unique token per active operation stored in the existing D1 security_rate_limit_windows primary key; an atomic SQLite INSERT...SELECT checks active row count; DELETE includes the exact owner token. Old expired tokens no longer count toward capacity and cannot be released in place of new tokens.

Verify: npm test, SQLite/D1 realistic concurrency, stale release, leak reclamation, token uniqueness. Local SQLite red-team passed; real Cloudflare D1 must still be tested before technical GO.

Remains blocked: global spend cap and provider fan-out proof; PR #733 overlap and anonymous /api/bot TRAINING quota 100 in the #736 code; G4e/G4f/G4g independent corpus hashes and registration; legal Human Gate HOLD.

Do not use genuine personal data in tests. No law corpus, intake, offline archives or public deployments changed.
