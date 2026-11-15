# Zoki AI Contract · RC128 + DPRO RC187 · integration gate (15 Nov 2026)

**Status:** GITHUB DRAFT REVIEW INTAKE · LEGAL HOLD · PRODUCTION NO-GO.
**Human Gate:** separate explicit approvals for publication rights, 28 contractual clause findings, deployment and client handling.

## Source of truth (owner-held)

Two separately uploaded top-level ZIP archives were CRC-checked and inventoried (do not confuse these with the GitHub runtime):

| Source archive | SHA-256 | Latest selected nested candidate |
|---|---|---|
| `2- АИ ДОГОВОРИ.zip` | `181a08ac0d871e4b586e4122bfc9521882c2c353f9ae32f55e5f36487485a778` | `RC128_OK.zip` |
| `2-2АИ ДОГОВОР.zip` | `dc5ee799e7cf93627124172e8a8efecd07f9579e242509bd455d9b3b61a2dc03` | `DPRO_RC187_OFFLINE_TECHNICAL_ACCEPTANCE.zip` |

### RC128
- Nested `RC128_OK.zip` SHA-256: `6504f9f8bcb6dc57af6d45e4ba128dc41e8c68873ded0aed15ff3434ffb1b553`.
- RC128 offline `START.html` SHA-256: `03402f2acfa708471c4b6f91f2dcc5fe5da9d86645f0c7d7bc474ef99fe29f34`.
- Archive says isolated Chromium: 30/30 OFFLINE + 30/30 ONLINE; these are historical test results, not an external production browser certification.
- Restores script injection placement and a read-only clause comparison panel for six models; 28 source-hash comparisons do not constitute lawyer approval.
- Windows file:// test, real online backend E2E and live AI integration remain NOT TESTED.

### DPRO RC187
- Nested `DPRO_RC187_OFFLINE_TECHNICAL_ACCEPTANCE.zip` SHA-256: `c1b8bd044aad23abe44a150ecffac991dcfbd00466dcb2f4938634351695f054`.
- Canonical source app is **RC184**, `APP_RC184_OFFLINE.html` SHA-256 `2552c4762659ba279ee39e68dec8aca02d22e55df440f081f4fb91e41f9a7402`; RC187 is a technical evidence pack, not a new generator source.
- Archive reports 27 PASS, 0 FAIL, 5 HOLD, including unverified Windows Chrome execution, complete workflow/ZIP exports, historical blob:null root cause, legal signoff and FINAL release.

### Shared legal facts
Six profiles: NDA (2), cooperation (7), services (6), lease (6), loan (3), debt (4).
Total 28 unresolved clause-review items: 8 CRITICAL + 20 HIGH; zero finally approved.
**Do not conflate this later review queue with the earlier DPRO-14R record of 50 historical findings.**

## Implemented now in GitHub candidate
- `data/ai-contract-zoki-rc128-rc187-intake.json`: minimal provenance, six profiles, six secure gates.
- `ai-contract-zoki-20261115-review.html`: static review-only screen; not a drafting service.
- `assets/ai-contract-zoki-review.mjs`: manifest integrity gate, SHA-256 validation of a **user-selected local nested ZIP** using browser crypto; no upload and no legal text import.
- Navigation from internal and external bot and from existing AI Contract workspace.
- Regression test ensures content/privacy/runtime isolation.

## Explicitly NOT included
- No proprietary/raw contract clauses, ZIP bytes or private documents published to GitHub.
- No overwrite of existing `ai-contract-dpro14r.html` or `/ai-contract.html`.
- No injecting the newer drafts into LLM prompts or "current law" corpus.
- No Cloudflare Workers AI model call, new membership plan, billing or endpoint.
- No D1 schema change, storage, telemetry, signing, sending or automated legal approval.

**Why:** The archives themselves insist on legal HOLD, and the ownership/licence for public republication of all Paragraf-labelled materials has not been independently established. Publishing raw drafts as authoritative contracts is out of scope.

## Acceptance before publication
1. Confirm source ZIP SHA-256 against the owner-held copies.
2. Confirm link surfaces exist and no old AI Contract entry point is replaced.
3. Verify latest-head GitHub full-suite/security/status-checks.
4. Test static route in a dedicated Cloudflare Preview (if deployed by the hosting pipeline).
5. Obtain Zoki's separate written legal approval per clause and publication permission for the relevant source documents.
6. Approve a distinct release PR for any production deployment or source import; Human Gate separate from CI.

## Rollback
Revert this single GitHub PR. There are no database, model, key or production changes to undo.

**Implementation is a source-intake and review integration, NOT full activation of RC128/RC187 authoring engines.**
