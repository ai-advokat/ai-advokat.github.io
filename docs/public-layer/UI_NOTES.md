# Deployment-neutral UI notes

**API base.** On `*.workers.dev` (and `localhost` for membership) the API is same-origin. On GitHub Pages it is `https://ai-advokat-github-io.aiadvokat16.workers.dev`. Never use a relative `/api/` fetch on pages served by GitHub Pages; test R9 enforces this.

**Contract with `/api/assistant`.**
- Request body: `{ q, instrument, date? }`. `date` is `YYYY-MM-DD` and is sent only when the user enters one.
- Success fields used: `mode`, `instrument`, `instrumentVersion`, `versionBasis`, `answer`, `legalStatusWarning`, `citations[]` (with `version`) and `membership`.
- Refusals: every `error` code the endpoint can return has an entry in `ASSISTANT_STATES` in `index.html`. `test/public-layer.test.mjs` extracts the codes from `src/index.js` and `src/corpus-versions.js` and fails when one is missing.
- Unknown 5xx or network failure → “temporarily unavailable”. No answer text is shown.

**Contract with `/api/search`.** The `type` options (`all`, `law`, `source`, `case`, `paper`) and the `status` options must be subsets of `VALID_TYPES` and `VALID_STATUSES` in `src/index.js`; this is tested. If the API is unreachable, the UI shows only the local publication and guide entries and says so. It never shows local placeholders as official legislation.

**Status labels** come from `/api/capabilities`, `/api/instruments` and per-answer data. Do not hard-code LIVE (test R8).

**Grep-based workflow guards** reference `index.html`: `value="mk:zkp"`, `openZkpBrowser`, `fetchInstruments`, `coverageNote`, `rel="manifest"`, `navigator.serviceWorker.register` and `beforeinstallprompt`. Keep them.

**Images.** The author portrait is served as WebP (≈35 KB) with the original PNG as fallback.

**Visual check.** The UI in this change was verified in Chromium at 1366×900 and 390×844, in light and dark themes, against a mocked API with the response shapes from `src/index.js`.

**Legal Base helpers.** `assets/legal-base.js` (window.LegalBase / CommonJS) holds the pure presentation helpers (capability states, version and article labels, citation-audit classification, word diff). It is loaded before the app script. Keep `OFFICIAL_SOURCES` identical to `PUBLIC_WEB_SOURCES` in `src/index.js`; `test/legal-base.test.mjs` enforces this.
