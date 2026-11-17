# Zoki external bot · P0 readability + requested-document fidelity · main-base release candidate
Date: 2026-11-17
Human Gate: HOLD (do not auto-merge or deploy)
Release label: P0-R29-readable-notice-20261117
Previous production branch baseline: main 1052061d38bf9eaa637a7e611b6d52e357cdb053 (snapshot at branch creation)

## Verified user evidence
- User reports very pale/white text on a light-looking external bot background.
- Exact repeated question: "Да те замолам да ми направиш Опомена пред Тужба за развод, со измислени имиња..."; the production bot produced "ТУЖБА ЗА РАЗВОД НА БРАК" and "VII. HUMAN GATE".
- GitHub main does not include R28 stylesheet, separate pre-divorce notice route, or section-numbering correction. PR #708 remains draft and stacked under #707/#706/#705.

## Scope
- Source-only hotfix derived from already-reviewed R28 changes, rebased onto main, with no translation, contract, payment, D1, membership or R27 timing modifications.
- Add specific CSS for external conversation light/dark text, assistant answer and user question, menus, sources, language select and input.
- Route current-turn notice requests to a distinct deterministic voluntary family notice; never a court divorce lawsuit. Keep lawsuit route and child-related legal Human Gate.
- Preserve sources, privacy and no-provider status.
- Include exact static marker for post-deployment parity tests.

## Evidence
- GitHub source: PR #709.
- Legal: official Family Law (Art. 39, 229, 237), source page from Ministry; court decision U.бр.57/2025 concerns article 6 of amendment 199/2023 (paternity challenges), **not** the divorce notice procedure.
- CI: exact request to Worker in a local synthetic, no-model environment; real Chromium DOM on light/mobile and dark/desktop with **mocked** AI response; full test and security workflows.
- Read-only post-deploy check: `node scripts/zoki-p0-public-deployment-readonly.mjs` checks publicly served HTML marker and stylesheet. No AI or personal data.

## Release acceptance checklist
- [ ] Exact PR #709 head SHA recorded, all required CI including Chromium passed.
- [ ] Human Gate approval to merge into main.
- [ ] GitHub Pages AND Cloudflare Worker deploy confirmed (do not assume one deploy updates the other).
- [ ] Production bot HTML contains `P0-R29-readable-notice-20261117` and contrast CSS is HTTP 200.
- [ ] Browser light and dark text contrast measured, dropdown/menu and touch input readable.
- [ ] One **approved** synthetic TEST request to production /api/bot: prompt "Опомена пред Тужба за развод со измислени имиња" => notice (not lawsuit), no provider call.
- [ ] Rollback SHA and deployment ID recorded; rollback only upon owner direction.

## Important boundaries
- Do not send real notices, do not collect personal case facts, do not activate paid models, do not infer that a nonresponse accepts divorce.
- A non-mandatory invitation is not a procedural precondition; reconciliation procedure under Article 237 arises after filing and differs from a voluntary letter.
- `TESTS PASS` does not imply `DEPLOYED`.
- PR #705/#706/#707/#708 stay open separately; this hotfix does not replace their wider scopes.
