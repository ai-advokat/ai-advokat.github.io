# AI CONTRACT · DPRO-14R Integration

Status: RELEASE CANDIDATE WITH BLOCKERS  
Source date: 2026-11-09  
Human Gate: REQUIRED

## Mandate
Integrate the user-supplied AI ДОГОВОРИ PRO OFFLINE/ONLINE archive into the existing AI Advokat Contract Intelligence module without weakening legal, privacy, provenance or Human Gate controls.

## Canonical imported facts
- Baseline: DPRO-14R Dual Prototype.
- Six contract profiles: NDA, business cooperation, services, lease, loan, debt regulation.
- Archived findings: 50 total = 28 HIGH + 20 MEDIUM + 2 LOW.
- Final lawyer approvals recorded in the supplied archive: 0/28 HIGH.
- Legal validation: HOLD.
- Production: NO-GO.
- Offline engine SHA-256: `f2a5e6eff26a922e2bffef9c2ab1a58b54f2466f5421326b67a3d6210d9604d8`.
- The supplied OFFLINE engine and ONLINE generator had the same SHA-256.
- The supplied ONLINE server was localhost-only demonstration software and explicitly not production hosting.
- The supplied QA record reported six-model smoke, four-step flow, NDA DOCX/JSON export and local server checks, but did not claim a fresh full six-model export regression.

## Product boundary
### In scope for this integration
- Existing AI Advokat deterministic clause spotting.
- Six DPRO model profiles and archived risk counts.
- Local playbook comparison.
- Local JSON review export.
- DPRO provenance/source register.
- Secure Case Workspace handoff for confidential documents.
- Explicit Human Gate and LEGAL HOLD status.

### Out of scope until separately verified
- Publishing the 785 KB archived drafting engine as a production legal drafting service.
- Claiming any of the 28 HIGH findings is finally lawyer-approved.
- Automatic contract acceptance, signing, submission or sending.
- Automatic declaration of current law, enforceability, tax treatment or jurisdiction.
- Sending confidential real-case contracts through the public chat.
- Treating archived source metadata as proof of a currently consolidated statute.

## Acceptance criteria
1. AI CONTRACT displays six DPRO profiles.
2. Risk counts total exactly 50 / 28 HIGH / 20 MEDIUM / 2 LOW.
3. Deterministic analysis does not call `/api/chat`.
4. DPRO archived risk data is labelled as archive baseline, not live legal conclusion.
5. Review JSON preserves Human Gate and LEGAL HOLD.
6. Confidential-document workflow points to Secure Case Workspace.
7. Source register contains the ten imported normative records.
8. No automatic signing/submission/acceptance path is introduced.
9. CI full-test-suite and security-tests pass before merge.
10. Production deployment remains subject to Human Gate.

## Rollback
Revert the integration PR. The pre-existing Contract Intelligence v1 remains recoverable from Git history; no database migration or secret change is required by this integration.

## Next gated phase
After independent legal review of the high-risk clause set, the original offline DPRO drafting engine can be decomposed into reviewable model templates and imported behind explicit versioning. Do not remove LEGAL HOLD merely because software tests pass.
