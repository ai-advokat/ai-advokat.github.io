# AI Advokat portal — Worker + Static Assets v1.5

AI Advokat is a legal information and AI-research portal with source-first research, visible provenance and a mandatory human-review gate.

## Current architecture

- Static front end: `index.html` + `assets/`
- Worker entry point: `src/index.js`
- Cloudflare configuration: `wrangler.jsonc`
- Static asset allow/deny control: `.assetsignore`
- Production branch: `main`
- Cloudflare D1 database: bound and operational

Cloudflare Workers Builds settings:

- Build command: **None**
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

## API

The Worker exposes:

- `/api/health`, `/api/db-status` — Worker and D1 health
- `/api/capabilities` — live capability state and corpus coverage; the homepage status labels are rendered from this endpoint
- `/api/search`, `/api/instruments`, `/api/articles` — read-only public corpus
- `/api/assistant` — source-backed legal research assistant, **POST only** (quota-protected, see below; GET/HEAD return 405 so prefetchers and link scanners cannot consume quota)
- `/api/membership/plans`, `/api/membership/request`, `/api/membership/status` — membership v1
- `/api/web-sources`, `/api/zenodo`, `/api/orcid` — directories and publication metadata
- `/api/citation-audit`, `/api/versions`, `/api/documents`, `/api/cases` — governed preview / locked

D1 is active. R2 and Vectorize remain disabled. Workers AI is bound in staging only; production AI activation is a separate Human Gate / cost decision (`scripts/verify.mjs` blocks a production `ai` binding).

No legal AI output or DOI is fabricated.

## Security, quota and abuse prevention

Implemented in `src/security.js`; covered by `npm run test:security` (CI: `security-tests.yml`).

| Control | Behaviour |
|---|---|
| Anonymous identity | `anon:v1:` + HMAC-SHA256(`RATE_LIMIT_SALT`, client network). IPv4 = full address, IPv6 = /64. **No plaintext IP is stored.** Missing/short salt → anonymous assistant and membership requests fail closed (503). |
| Assistant burst limit | 5 requests / 60 s per subject, exact fixed window in D1 (`security_rate_limit_windows`). An optional Cloudflare Rate Limiting binding `ASSISTANT_BURST` is used as an extra first filter if bound (Cloudflare documents it as eventually consistent, so D1 stays authoritative). |
| Monthly quota | FREE = 10 assistant requests / calendar month (UTC). Members use their entitlement quota. An invalid or expired key is treated as anonymous FREE. |
| Atomic reservation | One `INSERT … ON CONFLICT DO UPDATE … WHERE assistant_requests < quota RETURNING` statement. Order: burst → validation → routing/retrieval → reservation → AI. Rejected routing and empty retrieval consume nothing. Reservation is returned only if the AI provider itself throws. |
| Prompt boundaries | All rules live in the system message. Sources and the user question are placed in `<<<LEGAL_SOURCES>>>` / `<<<USER_QUESTION>>>` blocks; delimiter sequences and control/bidi characters are stripped from untrusted text. |
| Citation guard | An AI answer is accepted only if it cites at least one article and every article it mentions (`[Член N]`, `член N`, `членот N`, `чл. N`) was retrieved. Otherwise the response falls back to retrieval-only (`mode: retrieval_only_citation_guard`). |
| Membership requests | Server-side Turnstile (`siteverify`, `remoteip`, hostname + action `membership_request`); 3/hour and 10/day per HMAC subject; one pending request per e-mail per 24 h (identical response either way); body ≤ 4 KB; key whitelist; canonical e-mail validation; overlong or control-character input is rejected, not truncated. |

### Configuration

| Name | Kind | Where | Notes |
|---|---|---|---|
| `RATE_LIMIT_SALT` | secret | production + staging | ≥ 32 random characters, e.g. `openssl rand -base64 48`. Rotating it resets anonymous counters. |
| `TURNSTILE_SECRET` | secret | production + staging | Turnstile widget secret key. |
| `TURNSTILE_SITE_KEY` | plain var | production + staging | Public site key; served by `/api/membership/plans`. If absent the membership form stays closed. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | plain var (optional) | as needed | Comma-separated extra hostnames accepted from Turnstile, in addition to the CORS origins. |
| `ASSISTANT_BURST` | Rate Limiting binding (optional) | not configured | Not required; see above. |

```bash
npx wrangler secret put RATE_LIMIT_SALT
npx wrangler secret put TURNSTILE_SECRET
```

Until `RATE_LIMIT_SALT` is set, the anonymous assistant returns `503 assistant_temporarily_unavailable` by design.

## Zenodo

The Zenodo profile for **Zoran Stojankich / AI Advokat** is active. Status was verified on 2026-09-30 against the DOI registry (doi.org handle API): a DOI resolves there only once the Zenodo record is published.

| Record | DOI | Status |
|---|---|---|
| „СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда | `10.5281/zenodo.22981744` | Published · Working paper |
| Електронските и AI-генерираните докази во судската постапка | `10.5281/zenodo.23017531` | Published · Working paper |
| Претресот на мобилен телефон и заштитата на адвокатската тајна | `10.5281/zenodo.23021388` | Published · Working paper |
| Вештачката интелигенција во адвокатурата и судството | `10.5281/zenodo.23023442` | Published · Working paper |
| Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност | `10.5281/zenodo.22981554` | **Draft — reserved DOI, not registered** |

The reserved Kočani DOI must not be represented as published until the deposit is formally published. Private Zenodo upload URLs are never exposed.

The same state is held in `ZENODO_RECORDS` (`src/index.js`, served by `/api/zenodo`), on the homepage and on the Scholar pages; `npm run test:security` fails if the Worker and the homepage disagree. A single canonical publication registry (`data/publications.json`) read by all of them is the recommended next step.

## Publication governance

Publication workflow:

1. Source and factual verification
2. AI review / research-assistance cycle where applicable
3. Citation and reference audit
4. Professional legal review
5. Human Gate approval
6. Final publication metadata
7. Zenodo publication
8. Persistent DOI link activation

AI-assisted review does not replace independent academic peer review, professional legal responsibility or authorial approval.

## Contact

- aiadvokat16@gmail.com
- aiadvokat@outlook.com

## Legal integrity

AI output is research assistance only.

Final legal judgment, citation verification, interpretation, authorship approval and publication remain subject to professional human review.
