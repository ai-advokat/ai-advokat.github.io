# Paragraf.mk -> AI Advokat migration landing zone

Status: Phase A / inventory and staging preparation only.

## Safety rules
- No production cut-over in this phase.
- No deletion or redirect of paragraf.mk.
- No import of credentials, payment secrets, sessions, tokens or private upload URLs.
- Private client/case material must remain segregated from the public legal corpus.
- Public legal corpus and author publications require provenance, checksum and source metadata.
- User/account data requires a separate export, access-control review and explicit migration plan.
- All imports are dry-run by default and target staging before production.
- Human Gate approval is required before bot activation over migrated material.

## Target architecture
- D1: metadata, provenance, normalized text/chunk registry, five publications.
- R2: original PDF/DOCX/source files after R2 is explicitly enabled.
- Vectorize: semantic retrieval index after source validation.
- Worker: source-first retrieval, citations, fail-closed behavior.
- Admin access: restricted; never public repository storage for secrets or client files.

## Phase sequence
1. Public-route inventory and content snapshot.
2. Obtain authoritative Paragraf backup/export.
3. Classify: public corpus / private case data / accounts / billing / templates / media.
4. Normalize identifiers and checksums.
5. Import to staging only.
6. Count/checksum/parity audit.
7. Build retrieval tests against five publications + migrated Paragraf corpus.
8. Human Gate review.
9. Production import.
10. Cut-over/redirect only after parity and rollback checks pass.

## Required for complete 1:1 migration
One authoritative source package is still required for non-public content:
- hosting/cPanel backup, or
- application export + SQL dump, or
- database dump + uploads/storage archive.

Public web crawling alone cannot recover authenticated LexAI corpus, user accounts, private matters, uploaded files or server-side configuration.
