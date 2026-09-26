# AI Advokat portal — Worker + Static Assets v1.1

AI Advokat is a legal information and AI-research portal with source-first research, visible provenance and a mandatory human-review gate.

## Current architecture

- Static front end: `index.html` + `assets/`
- Worker entry point: `src/index.js`
- Cloudflare configuration: `wrangler.jsonc`
- Static asset allow/deny control: `.assetsignore`
- Production branch: `main`

Cloudflare Workers Builds settings:

- Build command: **None**
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

## API scaffold

The Worker exposes safe scaffold endpoints:

- `/api/health` — live Worker health
- `/api/capabilities` — current capability state
- `/api/search` — reserved, not enabled yet
- `/api/assistant` — reserved, not enabled yet
- `/api/documents` — reserved, not enabled yet
- `/api/zenodo` — reserved, not enabled yet

No legal AI output or DOI is fabricated. D1, R2, Vectorize and Workers AI remain unbound until configured deliberately.

## Zenodo

Zenodo is intentionally pending. Once Zoran Stojankic's real Zenodo account and records exist, the production integration can store real record IDs/DOIs and expose them through `/api/zenodo`.

## Contact

- aiadvokat16@gmail.com
- aiadvokat@outlook.com

## Legal integrity

AI output is research assistance only. Final legal judgment, citation verification and publication remain subject to professional human review.
