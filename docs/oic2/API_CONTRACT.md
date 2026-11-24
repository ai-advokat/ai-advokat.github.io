# OIC-2 shared API contract v1.0 (source-pinned + proposed extension)
Date: 2026-11-24. Main pin `b83350fb9079f3780a03c540d6faa8d99b2aa54a`. Existing v1 source is verified, live availability NOT VERIFIED. V2 is PROPOSAL / CONTRACT FOR LOCAL FIXTURES ONLY until implemented and reviewed. Do not call proposed routes on a deployed server. No parallel backend.

## v1 existing Worker
Canonical full source contract: [DEV-B handover Annex A](OIC2_DEV_B_COMPLETE_HANDOVER_2026-11-24.md#annex-a--verified-case-workspace-wire-contracts-24-november-2026). Source links: [router](https://github.com/ai-advokat/ai-advokat.github.io/blob/b83350fb9079f3780a03c540d6faa8d99b2aa54a/src/index.js#L1007), [workspace validators](https://github.com/ai-advokat/ai-advokat.github.io/blob/b83350fb9079f3780a03c540d6faa8d99b2aa54a/src/case-workspace.js), [extraction schema](https://github.com/ai-advokat/ai-advokat.github.io/blob/b83350fb9079f3780a03c540d6faa8d99b2aa54a/src/case-intelligence-runtime.js), [draft enum](https://github.com/ai-advokat/ai-advokat.github.io/blob/b83350fb9079f3780a03c540d6faa8d99b2aa54a/src/case-intelligence.js), [export](https://github.com/ai-advokat/ai-advokat.github.io/blob/b83350fb9079f3780a03c540d6faa8d99b2aa54a/src/case-export.js).

Base: /api/cases. Existing membership header X-Membership-Key OR Authorization: Bearer (Bearer precedence). Never log or embed keys, never introduce a second login. Active case-scoped membership, plan and role verified server-side. CASE-/DOC-/DRAFT- + UUID v4; server issues IDs. Error: preserve HTTP + machine code; require data.ok === true for JSON success, validate route-specific shape; 200 ok:false/unknown envelope fails. For binary download validate status/content type, never treat JSON error as artifact. No automatic retry of non-idempotent mutation without a server idempotency contract.

| Operation | Method and v1 suffix | Request | Success shape (selected fields) |
|---|---|---|---|
| List/Create | GET / ; POST / | JSON title, clientReference?, legalArea?, retentionUntil? for POST | 200 ok,cases,privacy,storage,documentLimit; 201 ok,case,humanGate,documentUpload |
| Case | GET /{caseId} | none | ok,case,documentUpload |
| List docs | GET /{caseId}/documents | none | ok,caseId,documents,documentLimit,upload,note |
| Upload | POST /{caseId}/documents/upload | RAW bytes, Content-Type, X-File-Name, optional X-Page-Count | 201 ok,caseId,document,humanGate,ingestion |
| Extract | POST /{caseId}/documents/{docId}/extract | body unused | ok,caseId,documentId,extractionState,derivedSha256,extraction,privacy,humanGate |
| Status | GET /{caseId}/intelligence | none | ok,caseId,documents,counts,latestAnalysisAvailable,providerSingleDocumentLimitBytes,doctrine |
| Analyze | POST /{caseId}/intelligence/analyze | body unused, server derives task | ok,caseId,analysis,analysisSha256,provider,coverage,legalSources,caseLawSources,banner,humanGate,autonomousFiling |
| Draft | POST /{caseId}/intelligence/draft | draftType,instruction | ok,caseId,draftId,draftType,draft,draftSha256,provider,contract,banner,humanGate,filing,signature,externalTransmission |
| Gate | GET /{caseId}/human-gate; POST same | POST decision,reason only | GET ok,caseId,professionalUseLocked,gate,doctrine; POST 201 ok,caseId,professionalUseLocked,gate,note |
| Exports | POST /{caseId}/exports | format,report | binary md/txt/docx/csv/json; JSON pdf/png/jpg exportModel |
| Audit | GET /{caseId}/audit | none | ok,caseId,events |

GET documents row: id,slot_number,original_name,mime_type,sha256,page_count,storage_state,extraction_state,provenance_required,created_at,updated_at. Upload document object: id,slotNumber,originalName,mimeType,sha256,pageCount,storageState,extractionState,provenanceRequired. State complete, not completed/extracted. Preserve explicit UNKNOWN for unavailable metadata. Limits: 20 documents, regular R2 25 MiB, D1 fallback 15 MiB, extraction 15 MiB; multipart is separate existing contract in Annex A. Do not equate upload and extraction.

Existing draft types: lawsuit, appeal, objection, motion, request, legal_opinion, hearing_plan, evidence_request, registry_request. No dedicated appeal_response yet. Legal team must approve precise semantics; do not mislabel appeal as response. Proposal: add appeal_response to existing generator only after review. Existing instruction 3–3000 cleaned characters. Existing analyze does not accept a user question. Gate decisions approved/rejected/needs_revision/revoked; reason >=8 chars. Existing gate is case-level, not proof of exact draft revision approval. During OIC-2 development, do NOT use legacy gate to unlock professional export.

## V2 interface proposal (shared fixtures, not deployed)
Use same Worker and /api/cases base. Proposed operations extend existing endpoints: POST intelligence/analyze with optional question under versioned contract; POST intelligence/draft with reviewed appeal_response; GET/POST drafts/{draftId}/revisions, POST drafts/{draftId}/revisions/rollback (paths relative to /{caseId}, proposed); extend human-gate and exports using explicit contractVersion "oic2.v2". Old working mode retained only if safe; legacy approval cannot authorize V2 professional export. Implementation owner INFRA; LEGAL owns semantic payload/UX. Unimplemented V2 fails closed, no fallback to professional v1.

Reference types (not generated SDK):
```ts
type RevisionRef = {caseId:string; draftId:string; revisionId:string; revision:number;
  contentSha:string; sourceSnapshotSha:string; authoritySnapshotSha:string;
  sourceEpoch:number; authorityEpoch:number; authorizationEpoch:number; gateEpoch:number};
type ParentCAS = {expectedParentRevisionId:string; expectedParentRevision:number;
  expectedParentContentSha:string; idempotencyKey:string};
type AppendRequest = ParentCAS & {content:string}; // UTF-8 working text, server hashes
type RollbackRequest = ParentCAS & {targetRevisionId:string}; // new revision, never delete
type ReviewRequest = {contractVersion:"oic2.v2"; revision:RevisionRef;
  decision:"approved"|"rejected"|"needs_revision"|"revoked"; reason:string};
type ExportRequest = {contractVersion:"oic2.v2"; revision:RevisionRef;
  mode:"working"|"professional"; format:"docx"|"pdf"};
```
Proposed success JSON: {ok:true,revision:RevisionRef} for append/rollback (201); review adds decisionId,decidedAt,server actor ref,professionalUseLocked; export artifact binary after authorized release and audit receipt. Review request ref is expectation, not authority. Server computes identity/hash/snapshots, derives actor and permission, checks exact head, active hold and epochs atomically. Monotonic epochs avoid stale approval revival; idempotency bound to actor/case/draft/operation/payload. Approval references immutable revision and canonical export AST; approval alone never overrides LEGAL_HOLD. Rollback creates new identity even when text SHA equals historical SHA. Durable CAS requires local D1 transaction validation, no in-memory mutex as evidence. R2 bytes staged privately with digest and atomic authoritative pointer; revalidate before export release. Professional export never accepts client report/content/actor or forged approval; server renders reviewed immutable AST and records content/model/artifact hashes and renderer version. No autonomous filing, signature or transmission.

Proposed errors: 400 invalid payload; 401 no membership; 403 role/hold denied; 404 inaccessible; 409 CAS/snapshot/approval mismatch, idempotency conflict; 413 limit; 415 media; 429 quota; 503 provider/storage/contract unavailable. Exact final codes/statuses require Worker tests. UI preserves machine codes and redacts sensitive details. No secrets or actual client facts in fixtures.

## Integration points
Reuse src/index.js handleCaseWorkspaceApi, caseWorkspaceAccess, caseProfessionalFingerprint, latestCaseHumanGate, recordCaseAudit; src/case-workspace.js validators and audit allowlist; src/case-intelligence-runtime.js and src/case-intelligence.js; src/case-export.js normalize/render; existing legal export engines after review. Implement local code against pinned main only, disabled by default, with acceptance IDs A01–A12. No migration or deployment authorized.
