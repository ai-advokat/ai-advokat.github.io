# OIC-2 MASTER DEVELOPMENT PLAN v1.0
Date: 2026-11-24 | Status: DEVELOPMENT BASELINE / REVIEW ONLY
Canonical main: `b83350fb9079f3780a03c540d6faa8d99b2aa54a`
Integration branch: `integration/oic2-tech-handover-20261123`
Pre-existing handover branch head: `080a575d27027aac344395b02f04d25c66043fb9`

## Mandate
One AI ADVOKAT, one Case Workspace, one Worker/backend, one membership/authorization boundary, one server Human Gate. Reuse existing components. Preserve all prior archives; never infer server readiness from local test counts. This documentation commit does not change Worker, data, migration, credentials, workflows or deployment configuration. No PR, merge, staging activation, provider activation, production changes or remote migrations without a separate explicit approval. LEGAL_HOLD ACTIVE; professional release forbidden. All fixtures synthetic.

## Single source of truth
- This plan governs sequencing and ownership.
- [TASK_REGISTER.md](TASK_REGISTER.md) owns task IDs, status and evidence.
- [ACCEPTANCE_MATRIX.md](ACCEPTANCE_MATRIX.md) owns acceptance requirements and results.
- [API_CONTRACT.md](API_CONTRACT.md) distinguishes source-verified v1 from proposed v2; no unimplemented route is callable.
- [SYNTHETIC_CASE_001.json](SYNTHETIC_CASE_001.json) is the shared synthetic scenario specification, not an uploaded case.
- Historical evidence remains in [DEV-B handover](OIC2_DEV_B_COMPLETE_HANDOVER_2026-11-24.md) and [main baseline](OIC2_MAIN_COMPATIBILITY_BASELINE_2026-11-23.md); newer evidence supersedes status only when reproduced and linked. Main pin must be rechecked before any patch.

## Phase I — Legal workflow (legal team)
Reuse casepilot-workspace.html and assets/casepilot-workspace-ui.js; prepare thin UI/adapter components and fixtures, source-linked facts, disputed facts, legal question, draft structure, conversation/diff/rollback UX, professional document AST and rendering expectations. Lawyer owns procedural semantics and substantive approval. Interface tests target exact v1 and proposed v2 fixture contracts separately. No mock is server authority.

## Phase II — Online integration (infrastructure team)
Own src/index.js, src/case-workspace.js, case-intelligence runtime, existing export engines, D1/R2 bindings, provider budget, authentication and single Human Gate. Start with pinned local Worker and synthetic fixtures. Restore legacy regressions; adapt existing modules, do not copy entire standalone backend. Design durable CAS, monotonic snapshot epochs, exact revision approval and server-derived export. New migration proposals are REVIEW ONLY, not executed; 0033/0034/0035/0049 remain HUMAN REVIEW. Explicit gate before any isolated HTTPS UAT; no production credentials.

## Phase III — Joint functional acceptance
Run SYNTHETIC_CASE_001 end to end on isolated local Worker first, then separately authorized HTTPS environment: create case -> upload decision and appeal -> extract -> analysis -> working appeal response -> lawyer revision/diff -> working DOCX/PDF -> negative tests under active hold. After distinct permission to change the synthetic environment's release policy, test exact revision approval, revocation, professional DOCX/PDF parity; production remains NO-GO. Record exact commit, environment isolation evidence, sanitized logs, artifact hashes and independent lawyer review.

## Change control
Each task has one implementation owner; other team reviews the interface only. No parallel backend, authentication or gate. Contract changes must update API_CONTRACT, task and acceptance records together, preserve backwards compatibility or explicitly version, and be agreed before either team relies on them. Each result records commit, command, environment, PASS/FAIL/NOT TESTED, evidence location and reviewer. Local mock PASS never implies D1/HTTP/live PASS. All substantive defects remain open until evidence closes them. Do not create a new demo as the next deliverable; submit a bounded patch against pinned Worker, disabled by default, and shared test scenario.

## Gates
DEVELOPMENT GO / INTEGRATION CONDITIONAL / HUMAN GATE HOLD / LEGAL_HOLD ACTIVE / STAGING NOT VERIFIED / PRODUCTION NO-GO. PP-12 mandate, scope and plan documented; build and integration acceptance pending; release not authorized.
