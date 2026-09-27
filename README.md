# AI Advokat portal - safe activation v1.3.3

AI Advokat is a source-first legal information portal with visible provenance and a mandatory Human Gate.

## Release scope

This release activates only the lowest-risk public capability:

- read-only search over a verified public D1 corpus;
- curated official-source directory;
- public ORCID metadata;
- public Zenodo status metadata without private editor/upload URLs.

The following capabilities remain locked:

- generative/retrieval legal assistant;
- confidential document uploads;
- case workspaces;
- automated citation conclusions;
- automated version comparison;
- Workers AI;
- Vectorize;
- R2 confidential storage.

## Architecture

- Static public portal: `index.html` + `assets/`
- Worker API: `src/index.js`
- Production D1: `ai-advokat-db`
- Preview/staging D1: `ai-advokat-db-staging`
- Production branch: `main`
- Safe activation branch: `activate-public-search-v1-safe`

Production and staging D1 databases are intentionally separate.

## Required gate before production

1. Run structural verification.
2. Apply migrations to staging D1 only.
3. Confirm staging schema versions 1 and 2.
4. Deploy/test Worker Preview.
5. Verify:
   - `/api/health`
   - `/api/capabilities`
   - `/api/db-status`
   - `/api/search?q=Official`
   - `/api/search?q=Службен`
   - `/api/web-sources`
   - `/api/zenodo`
   - `/api/orcid`
6. Confirm `/api/assistant`, `/api/documents`, `/api/cases`, `/api/citation-audit` and `/api/versions` remain blocked.
7. Human review.
8. Only then apply production D1 migrations and merge/deploy.

## D1 migrations

- `migrations/0001_initial_schema.sql`
- `migrations/0002_public_source_seed.sql`

The seed contains only public-source directory metadata and unpublished publication metadata. Reserved Zenodo DOIs are never represented as published records.

## Data rule

Do not place client secrets, privileged communications, identity documents, health data, confidential evidence or other sensitive material in the public corpus or ingest templates.

## Human Gate

Search results are research pointers, not legal conclusions. Open and verify the primary source, current text, effective date, procedural posture and finality before professional reliance.
