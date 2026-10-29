# AI ADVOKAT 4 — MVP v2 Release Candidate 1

Status: RELEASE CANDIDATE / TEST ONLY / NO PRODUCTION
Date: 2026-10-29
Base branch: main
Base SHA at consolidation: ec7cafce17b1b5d8ec902ceccf09f14d109c5624
Source PR: #391
Pre-manifest integration HEAD: 1c6b8468ffc41824099dffbc7fca62f3ccd361f9

## Product boundary

This release candidate consolidates the existing governed PR-A/PR-B/PR-C/MVP-v2 work into one reviewable diff against main.

Included:
- domain-aware legal routing;
- CasePilot synthetic matter integration;
- governed Legal Document AST/export;
- professional WORKING DOCX rendering;
- separate internal Review Annex;
- server-owned Human Gate;
- fail-closed PROFESSIONAL export;
- local synthetic end-to-end test interface.

Explicitly excluded:
- production activation;
- production database changes or migrations;
- secrets or provider configuration;
- real client data;
- filing, signature or external legal transmission;
- Human Gate approval for professional use.

## Acceptance criteria

1. Consolidated PR remains mergeable against current main.
2. Full repository test suite passes on the consolidated candidate.
3. Security test workflow passes.
4. Structural verify workflow passes.
5. Workers preview build passes.
6. Synthetic flow remains: input -> analysis -> CasePilot -> Legal Document AST -> WORKING DOCX -> Review Annex.
7. Forged client Human Gate approval cannot unlock PROFESSIONAL export.
8. No production deployment is performed by this release-candidate step.

## Human Gate

Merge to main and any production activation remain separate Human Gate actions.

No release status beyond RELEASE CANDIDATE may be inferred from this file.
