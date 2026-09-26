# AI Advokat portal - Worker + Static Assets v1.3

AI Advokat is a source-first legal-information and research-assistance portal with visible provenance and a mandatory Human Gate.

## v1.3 implementation status

### Live / operational

- Static public portal with MK/EN shell, accessibility controls and author profile.
- ORCID identity: `0009-0001-0702-2371`.
- Cloudflare Worker API scaffold with security headers and controlled CORS.
- Cloudflare D1 binding and schema status endpoint.
- D1 public-corpus search endpoint: `/api/search`.
- Retrieval-only legal research endpoint: `/api/assistant`.
- Citation / DOI audit endpoint: `/api/citation-audit`.
- Legal instrument version endpoint: `/api/versions`.
- Curated official-source directory: `/api/web-sources`.
- Document-template library: `/api/templates`.
- Public Zenodo metadata endpoint: `/api/zenodo`.
- Public ORCID metadata endpoint: `/api/orcid`.
- Browser-only Document Studio for working skeletons.
- Privacy, Terms, Security and Governance pages.

### Limited production

The v1.3 research assistant performs source retrieval only. It does **not** generate a final legal conclusion. Any legal interpretation, filing or professional output remains subject to Human Gate review.

Citation audit checks local registry data and the two verified reserved Zenodo draft DOI identifiers. It does not represent a draft DOI as a published record.

Version Compare works only when at least two instrument versions have been loaded into D1.

### Governed preview / deliberately locked

- Confidential document upload.
- Client case workspaces.
- Role-based access to sensitive case material.
- R2-based private document storage.
- Vector search / Vectorize.
- Generative legal synthesis through external or Workers AI.

These features remain locked until authentication, authorization, secure storage, retention/deletion rules, audit logging and incident controls are implemented.

## Public frontend

Primary static files:

- `index.html`
- `privacy.html`
- `terms.html`
- `security.html`
- `governance.html`
- `assets/zoran-stojankic.png`

The GitHub Pages frontend calls the Worker API at:

`https://ai-advokat-github-io.aiadvokat16.workers.dev`

The Worker allows the production GitHub Pages origin through CORS.

## Worker API

- `/api/health`
- `/api/capabilities`
- `/api/db-status`
- `/api/search?q=...&type=all|law|case|paper&status=all|official|verified|pending`
- `/api/assistant` - POST retrieval-only research request
- `/api/citation-audit?q=...`
- `/api/versions?q=...` or `/api/versions?instrument_id=...`
- `/api/templates`
- `/api/web-sources`
- `/api/zenodo`
- `/api/orcid`
- `/api/documents` - locked governed preview
- `/api/cases` - locked governed preview

## D1

Database binding:

- binding: `DB`
- database: `ai-advokat-db`
- database id: `12ece285-74bb-4f27-a025-2dbd1be6c59a`

Schema baseline:

- `migrations/0001_initial_schema.sql`

v1.3 public-source seed and search-support indexes:

- `migrations/0002_public_source_seed.sql`

The v1.3 seed contains only public source-directory metadata and the two unpublished publication draft records. It contains no client data.

Run the v1.3 seed once after deploying the code:

```bash
npm install
npm run db:seed:v1.3
```

Then verify:

```bash
npm run db:status
```

## Zenodo

Two unpublished Zenodo drafts currently have reserved DOI identifiers:

### Kocani - Puls

- Status: Draft
- Reserved DOI: `10.5281/zenodo.22981554`
- Public DOI link: not activated until formal Zenodo publication

### SINDZIR

- Status: Draft
- Reserved DOI: `10.5281/zenodo.22981744`
- Public DOI link: not activated until formal Zenodo publication

The public portal and API intentionally do **not** expose private Zenodo editor/upload URLs.

## ORCID

- Zoran Stojankich
- ORCID: `0009-0001-0702-2371`
- Public URL: `https://orcid.org/0009-0001-0702-2371`

## Official source directory

The portal includes curated navigation to primary official sources, including the Official Gazette, Ministry of Justice LDBIS, Constitutional Court, Supreme Court, HUDOC and EUR-Lex.

A directory entry is not a substitute for checking the current official text and its legal effect.

## Security posture

Public legal-information functions are enabled first. Sensitive-data features remain disabled until the required controls are actually implemented.

The Worker adds security headers to assets served through the Worker, including CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and a restrictive `Permissions-Policy`.

Do not store client secrets, privileged communications, health data, identity documents or other sensitive case evidence in the current public D1 corpus.

## Publication governance

1. Source and factual verification
2. AI review / research-assistance cycle where applicable
3. Citation and reference audit
4. Professional legal review
5. Human Gate approval
6. Final publication metadata
7. Formal publication
8. Persistent public DOI activation

AI-assisted review does not replace independent academic peer review, professional legal responsibility or authorial approval.

## Contact

- aiadvokat16@gmail.com
- aiadvokat@outlook.com
