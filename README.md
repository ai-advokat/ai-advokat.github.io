# AI Advokat portal - Worker + Static Assets v1.3.2

AI Advokat is an independent, source-first legal-information and research-assistance portal with visible provenance and a mandatory Human Gate.

## Architecture

- Public static portal: `index.html` + `assets/`
- Worker API: `src/index.js`
- Production D1: `ai-advokat-db`
- Preview/staging D1: `ai-advokat-db-staging`
- Production branch: `main`
- Preview repair branch: `ai-advokat-v1.3.2-repair`

The production and Preview D1 databases are intentionally separate. Preview configuration points only to the staging database.

## Safety posture

Sensitive client/case storage, confidential uploads, R2, Vectorize and generative legal synthesis remain disabled until authentication, authorization, retention/deletion, encryption, access logging and incident controls are in place.

AI output is research assistance only. Final legal interpretation, citation verification, filing, authorship approval and publication remain subject to professional human review.

## API

Public/limited endpoints:

- `/api/health`
- `/api/capabilities`
- `/api/db-status`
- `/api/search`
- `/api/assistant` - retrieval only
- `/api/citation-audit`
- `/api/versions`
- `/api/templates`
- `/api/web-sources`
- `/api/zenodo`
- `/api/orcid`

Governed/locked endpoints:

- `/api/documents`
- `/api/cases`

## D1 migrations

Schema:
- `migrations/0001_initial_schema.sql`

Verified public-source and draft-publication seed:
- `migrations/0002_public_source_seed.sql`

Apply to staging/Preview first:

```bash
npm install
npm run verify
npm run db:migrate:staging
npm run db:status:staging
npm run preview
```

Do not apply migrations to production until the Preview deploy and endpoint checks pass.

## Zenodo

The two DOI identifiers in the portal are unpublished reserved Zenodo draft metadata:
- `10.5281/zenodo.22981554`
- `10.5281/zenodo.22981744`

Private Zenodo editor/upload URLs are intentionally not exposed. Public DOI links remain inactive until formal publication.

## ORCID

Zoran Stojankich: `0009-0001-0702-2371`

## Contact

- aiadvokat16@gmail.com
- aiadvokat@outlook.com
