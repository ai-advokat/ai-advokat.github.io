# AI Advokat portal — Worker + Static Assets v1.2

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

## API scaffold

The Worker exposes:

- `/api/health` — live Worker health
- `/api/capabilities` — current capability state
- `/api/db-status` — D1 binding, reachability and schema status
- `/api/search` — reserved, not enabled yet
- `/api/assistant` — reserved, not enabled yet
- `/api/documents` — reserved, not enabled yet
- `/api/zenodo` — reserved, not enabled yet

D1 is active. R2, Vectorize and external AI research remain deliberately disabled until their respective implementation and governance stages are completed.

No legal AI output or DOI is fabricated.

## Zenodo

The Zenodo profile for **Zoran Stojankich / AI Advokat** is active.

Two publication records currently exist as unpublished Zenodo drafts with reserved DOI identifiers.

### Кочани – „Пулс“

**Кочани – „Пулс“: индивидуална кривична, институционална и политичка одговорност**

- Resource type: Journal article
- Status: Draft
- Reserved DOI: `10.5281/zenodo.22981554`
- Publisher: World Protocol Academy
- Creator: Stojankich, Zoran (AI Advokat)

### „СИНЏИР“

**„СИНЏИР“ — Спогодување со обвинителството, признавање вина и границите на казнената правда**

- Resource type: Working paper
- Status: Draft
- Reserved DOI: `10.5281/zenodo.22981744`
- Publisher: World Protocol Academy
- Creator: Stojankich, Zoran (AI Advokat)

The reserved DOI identifiers are displayed as draft metadata only. They must not be represented as published records until the corresponding Zenodo deposits are formally published.

While the records remain in Draft status, the public AI Advokat portal does not expose private Zenodo upload URLs or rely on a public author-search result. It displays the verified reserved DOI metadata and the current publication status only.

Direct DOI links will be activated after formal Zenodo publication.

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
