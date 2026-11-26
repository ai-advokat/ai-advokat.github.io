# OIC-2 / OIC2-DEV-B — FULL BASELINE + VERIFIED API CONTRACTS + INDEPENDENT ZIP REVIEW

# OIC-2 — Independent Main Compatibility Baseline

**Date:** 2026-11-23  **State:** AUDIT / DEVELOPMENT PREPARATION ONLY  **Decision:** NO-GO for merge, staging or production

**Repository:** https://github.com/ai-advokat/ai-advokat.github.io
**Verified base main:** `b83350fb9079f3780a03c540d6faa8d99b2aa54a`
**Isolated branch:** `integration/oic2-tech-handover-20261123`
**Prohibited without a separate Human Gate:** changes to `main`, protected/public deployments, staging activation, real-case processing, remote D1 migrations, Cloudflare secrets/bindings and any paid provider activation.

## Evidence classification

- VERIFIED: GitHub `main` commit and referenced source paths, relevant Wrangler configurations, existing workflow triggers, source-level routes, and creation of the isolated branch.
- VERIFIED: GitHub Actions full test suite and security workflow concluded `success` on 2026-11-19 for this main SHA. Not rerun by this audit; not evidence of OIC-2 end-to-end behaviour.
- AVAILABLE SECONDARY INPUT: `AI_ADVOKAT_OIC2_TECHNICAL_HANDOVER_2026-11-23.md` (earlier handover overview). It is not a substitute for byte-level candidate source.
- BLOCKER: The claimed OIC-1 and OFFLINE V5.15 archives and their SHA-256 manifests are not present as inspectable attachments in the current task. No hash comparison or candidate-vs-main diff was performed. DO NOT mark them compatible.
- NOT TESTED: browser OCR, private storage in a new environment, cross-account access live UAT, document fidelity, AI costs, concurrent load and staging isolation.

## Components that MUST be reused rather than cloned

| Capability | Existing main component | Integration rule |
|---|---|---|
| Unified case UI, multiple files and drag/drop | `casepilot-workspace.html`, `assets/casepilot-workspace-ui.js` | Wrap/reuse UI with a thin adapter; do not create independent login or data store |
| Case membership, access and case APIs | `src/index.js` (`handleCaseWorkspaceApi`), `src/case-workspace.js`, migrations `0029`, `0035` | Preserve account membership, active case access and owner/lawyer write restrictions |
| Private upload + multipart | `src/index.js`, `src/case-workspace.js`, migration `0044` | Reuse existing server SHA, MIME/signature checks and role guards; add batch idempotency only if needed |
| Private file storage | `caseObjectPut/Get/Head/Delete` in `src/index.js`; migration `0045` | Use a dedicated, separately authorised OIC-2 R2 binding; never use production D1/R2 for tests |
| Extraction and source-first analysis | `src/case-intelligence-runtime.js`, `src/case-intelligence.js`, `src/index.js` | Reuse extraction contract, source locators and legal source gates; validate scanned Macedonian OCR separately |
| Deterministic text classification | `src/document-ingest-router.js` | This is a classifier for already extracted text, NOT an OCR or PDF parser |
| Working draft + professional export | `src/case-export.js`, `src/legal-document-export.js`, `src/professional-docx-engine.js` | Use a shared versioned AST and server-approved export mode; keep court pleading distinct from internal reviewer annex |
| Professional Human Gate | `caseProfessionalFingerprint`, `latestCaseHumanGate`, `/api/cases/{id}/human-gate`, `/exports` in `src/index.js` | The server, not the browser, decides whether professional export is permitted |

## Independent findings, prioritized

**P0 — D1/R2 resource isolation.** Standard `wrangler.jsonc` has `DB`, AI and preview settings but no `CASE_FILES`; `wrangler.r2.jsonc` adds an R2 bucket while still naming the existing production DB. Never use it as an OIC-2 UAT config. `CASE_D1_FALLBACK_ENABLED=true` allows Base64 private file chunks in `case_private_object_chunks` (see `src/index.js` around lines 3960–4055). `casepilot-workspace.html` says D1 is metadata-only: reconcile this inaccurate operational description before any sensitive test. Preview URLs do not themselves prove separate storage.

**P0 — Candidate provenance.** OIC-1/OFFLINE V5.15 source archives, manifests, and hashes are missing from this review. Require file-by-file SHA-256 verification, ZIP traversal and secret scanning, source diff against exact base, and a component ownership map before code transplantation.

**P0 — OCR versus upload.** UI permits 20 files and advertises multipart up to 500 MiB, but `CASE_INTELLIGENCE_PROVIDER_MAX_BYTES` is 15 MiB; a successful multipart upload is NOT successful extraction. Workers AI `toMarkdown` and conditional OpenAI `input_file` / `input_image` exist, but no independent Macedonian scanned-page OCR, page-confidence and provenance benchmark has been run. Do not promise 500 MiB OCR or perfect transcription.

**P0 — Authorization / tenant boundary.** Existing `caseWorkspaceMembership` and `caseWorkspaceAccess` perform membership and case-scoped access checks; owner/lawyer permissions guard mutations. OIC-2 must use these checks unchanged, reject revoked users, and test guessed IDs, cross-case reads/writes, URL/path swaps and reviewer-only attempts. No parallel authentication layer.

**P0 — AI spend / concurrency.** Private extraction can invoke external OpenAI and then Workers AI fallback; execution and retries must be constrained by atomic per-account and global limits and a fail-closed cost policy. Draft PRs #733, #736, #737, #738 remain open and must NOT be blindly cherry-picked or merged; #737 is stacked on #736 and #738 on #733. Require independent security and cost review, with separate controlled verification of leased concurrency and no hidden paid UI fallback.

**P0 — Human Gate extension.** Existing server fingerprint covers case metadata, document IDs/hashes/states, and authority classifications, while professional export checks the current gate. New draft revisions must add immutable parent revision, diff, revision hash, analysis/source-version manifest, audit, rollback, and gate re-locking on each material change. Client-provided approval is never authority. Preserve WORKING DRAFT until a lawyer approves the exact current revision.

**P1 — GitHub governance.** GitHub reported `main` `protected=false` and no repository rulesets in this read. Production and Pages sync workflows are triggered by pushes to `main`, while legacy staging workflow is fail-closed. A separate repository-governance Human Gate should evaluate branch protection, required reviews/checks and release controls. This audit does NOT change settings.

## Acceptance evidence required (all NOT TESTED by this review unless specified)

| Gate | Objective | State |
|---|---|---|
| A00 | Source `main` SHA, isolated branch, no runtime mutation | PASS (GitHub source/branch inspection) |
| A01 | OIC-1/V5.15 file SHA-256 manifest, code diff and no hidden secrets | BLOCKED: source archive unavailable |
| A02 | Dedicated non-production D1 and R2; no shared resource ID/bucket or secret | NOT TESTED; staging forbidden |
| A03 | 20 synthetic mixed files, stable IDs/hashes, rejection + retries, no cross-case mixing | NOT TESTED |
| A04 | Digital PDF, scanned MK-Cyrillic PDF, DOCX, images, page locators, OCR uncertainty | NOT TESTED |
| A05 | Correct source-first legal analysis, contradictory facts, missing-law versions | NOT TESTED; lawyer review required |
| A06 | Immutable conversational revision, diff, rollback and new fingerprint-bound gate | NOT IMPLEMENTED / NOT TESTED |
| A07 | DOCX editable + PDF parity from the same version, no internal-note leakage | NOT TESTED |
| A08 | Revocation, cross-tenant, 429/503, budget exhaust, provider fallback, lease contention | NOT TESTED |
| A09 | Existing full unit/security test suites unchanged + new OIC-2 regression tests | BASELINE CI SUCCESS on 2026-11-19; NOT RERUN here |
| A10 | Separate owner infrastructure approval, lawyer approval, controlled UAT | HOLD |

## Safe next sequence

1. Attach original OIC-1 and OFFLINE V5.15 ZIP(s) plus canonical SHA-256 manifest; record byte hashes and source revision/date.
2. Create a file-by-file reuse/diff matrix, preserving the existing API and law corpus and avoiding parallel backend/auth.
3. Implement only a thin adapter and, if genuinely absent, immutable upload-batch/draft-revision contract in this branch. Keep new modules disabled by default.
4. Add synthetic tests for D1/R2 separation, case auth, OCR uncertainty, provider budget/concurrency, revisions, and fingerprint-bound Human Gate.
5. Run `npm ci`, `npm test`, focused case-workspace/casepilot/case-intelligence/security suites in isolated CI with no production secrets or remote writes. Capture exact counts and logs.
6. Request independent security/cost and lawyer review before proposing any PR; do not activate staging or merge without a distinct written Human Gate.

## Stop conditions

No production deploy; no staging unlock; no Cloudflare resource creation; no real client document uploads; no paid AI activation; no migration against the existing remote DB; no unchecked copying from draft PR stacks.

**Conclusion:** Existing main supplies reusable identity, case-scoped storage and document intelligence foundations. OIC-2 is a DEVELOPMENT CANDIDATE, not a verified integrated or deployable release. This commit is documentation-only.



---

# Annex A — Verified Case Workspace wire contracts (24 November 2026)

**Source:** GitHub `main` at SHA `b83350fb9079f3780a03c540d6faa8d99b2aa54a`, independently rechecked on 2026-11-24 by reading `src/index.js`, `src/case-workspace.js`, `src/case-intelligence-runtime.js`, `src/case-intelligence.js`, `src/case-export.js`, and `assets/casepilot-workspace-ui.js`. Source verification is not a live deployment test.

## Authentication / isolation

For private `/api/cases` routes the Worker obtains the membership key from `Authorization: Bearer <membership-key>` or `X-Membership-Key: <membership-key>`. It does **not** use the DEV-B assumption of same-origin cookies as a complete authentication mechanism. The existing UI explicitly uses `X-Membership-Key`. The membership plan must be `trial_pro` / `pro` / `office` and the user needs active case access. Unauthorised case IDs return 404. Mutation roles are `owner` and `lawyer`. Reviewer is read-only. Do not log/copy credentials; use the existing membership boundary, not a parallel login.

ID formats: `CASE-<UUID-v4>`, `DOC-<UUID-v4>`, `MPU-<UUID-v4>`, all server generated. The synthetic `DEMO-001` ID in DEV-B tests does not satisfy real Worker validation.

## Implemented routes and actual request/response keys

| Method | Route suffix after `/api/cases` | Actual wire request | Success response |
|---|---|---|---|
| GET | `/` | membership header | `{ok,cases,privacy,storage,documentLimit}` |
| POST | `/` | JSON `{title,clientReference?,legalArea?,retentionUntil?}` | 201 `{ok,case,humanGate,documentUpload}` |
| GET | `/{caseId}` | membership header | `{ok,case,documentUpload}` |
| GET | `/{caseId}/documents` | membership header | `{ok,caseId,documentLimit,documents,upload,note}` |
| POST | `/{caseId}/documents/upload` | raw file body and headers `Content-Type`, `X-File-Name`, optional `X-Page-Count` (NOT JSON or form-data) | 201 `{ok,caseId,document,humanGate,ingestion}` |
| POST | `/{caseId}/documents/multipart/init` | JSON `{name,mimeType,size,pageCount?}` | 201 `{ok,caseId,uploadSessionId,documentId,slotNumber,expectedSize,partSize,totalParts,expiresAt,storageState,integrity,ingestion,humanGate}` |
| PUT | `/{caseId}/documents/multipart/{sessionId}/parts/{n}` | raw bytes plus `X-Part-SHA256` | `{ok,uploadSessionId,partNumber,size,sha256,etag}` |
| POST | `/{caseId}/documents/multipart/{sessionId}/complete` | body unused; UI sends `{}` | `{ok,caseId,uploadSessionId,documentId,size,integrityManifestSha256,storageState,extractionState,sourceEligibility,ingestion}` |
| POST | `/{caseId}/documents/multipart/{sessionId}/abort` | body unused | `{ok,uploadSessionId,state}` |
| POST | `/{caseId}/documents/{docId}/extract` | body unused; UI sends `{}` | `{ok,caseId,documentId,extractionState,derivedSha256,extraction,privacy,humanGate}` |
| GET | `/{caseId}/documents/{docId}/download` | membership header | raw binary response |
| DELETE | `/{caseId}/documents/{docId}` | membership header | `{ok,caseId,documentId,storageState,humanGate}` |
| GET | `/{caseId}/intelligence` | membership header | `{ok,caseId,documents,counts,latestAnalysisAvailable,providerSingleDocumentLimitBytes,doctrine}` |
| POST | `/{caseId}/intelligence/analyze` | body unused; UI sends `{}` | `{ok,caseId,analysis,analysisSha256,provider,coverage,legalSources,caseLawSources,banner,humanGate,autonomousFiling}` |
| POST | `/{caseId}/intelligence/draft` | JSON `{draftType,instruction}` | `{ok,caseId,draftId,draftType,draft,draftSha256,provider,contract,banner,humanGate,filing,signature,externalTransmission}` |
| GET | `/{caseId}/casepilot` | membership header | `{ok,caseId,role,casePilot,authorityClassifications,ingestion,note}` |
| GET | `/{caseId}/case-law-classifications` | membership header | `{ok,caseId,classifications,humanGate}` |
| POST | `/{caseId}/case-law-classifications` | JSON `{caseLawId,role,reason,issueKey?}`; role supporting/adverse/distinguishing/neutral, reason ≥8 chars | 201 `{ok,caseId,classification,humanGate}` |
| GET | `/{caseId}/human-gate` | membership header | `{ok,caseId,professionalUseLocked,gate,doctrine}` |
| POST | `/{caseId}/human-gate` | JSON `{decision,reason}`; decision approved/rejected/needs_revision/revoked, reason ≥8 chars | 201 `{ok,caseId,professionalUseLocked,gate,note}` |
| POST | `/{caseId}/exports` | JSON `{format,report}` | binary for md/txt/docx/csv/json; JSON `{ok,format,filename,mode,renderer,exportModel,privacy}` for pdf/png/jpg |
| GET | `/{caseId}/audit` | membership header | `{ok,caseId,events}` |

Normal errors are HTTP 4xx/5xx with `{ok:false,error:"machine_code"}`; HTTP 200 with `ok:false` must also be handled as failure.

**Limits:** document slots 20; R2 regular upload 25 MiB; fallback D1 raw limit 15 MiB; R2 multipart >25 through 500 MiB, 8 MiB parts, ≤64 parts; `/extract` AI limit 15 MiB. Upload succeeds independently of extraction. Allowed MIME: PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG, WebP; extension and signature are checked. `pageCount` optional integer 1–5000.

## Source-grounded TypeScript projections (not generated OpenAPI)

~~~ts
type CaseView = {
  id:string; title:string; clientReference:string|null; legalArea:string|null;
  status:string; confidentialityClass:string; documentLimit:number;
  professionalUseLocked:boolean; retentionUntil:string|null; deleteRequestedAt:string|null;
  role:"owner"|"lawyer"|"reviewer"; createdAt:string|null; updatedAt:string|null;
};

// GET /documents returns DB column keys, NOT the camelCase upload document:
type DocumentRow = {
  id:string; slot_number:number; original_name:string; mime_type:string;
  sha256:string|null; page_count:number|null; storage_state:string;
  extraction_state:string; provenance_required:number;
  created_at:string; updated_at:string;
};

type SmallUploadDocument = {
  id:string; slotNumber:number; originalName:string; mimeType:string;
  sha256:string; pageCount:number|null; storageState:"uploaded";
  extractionState:"not_started"; provenanceRequired:true;
};

type ExtractionV1 = {
  document_type:string; summary:string;
  entities:Array<{name:string;role:string;page:number|null;locator:string|null}>; // 0..80
  dates:Array<{date:string|null;text:string;page:number|null;locator:string|null}>; // 0..80
  property_refs:Array<{cadastral_municipality:string|null;parcel:string|null;
    property_sheet:string|null;share:string|null;text:string;page:number|null;locator:string|null}>; // 0..80
  contracts:Array<{contract_type:string;parties:string[];date:string|null;
    subject:string;page:number|null;locator:string|null}>; // 0..50
  facts:Array<{id:string;text:string;fact_type:string;material:boolean;
    status:"source_confirmed"|"source_indication"|"disputed"|"professional_review_required";
    page:number|null;locator:string|null}>; // 0..120
  legal_issue_hints:string[];missing_context:string[];extraction_warnings:string[]; // 0..30 each
};
~~~

The provider extraction schema requires all listed top-level keys, sets `additionalProperties:false`, and requires the listed members of nested objects. Fact-level validation also requires a valid page or locator.

Draft type `draftType` enum: `lawsuit`, `appeal`, `objection`, `motion`, `request`, `legal_opinion`, `hearing_plan`, `evidence_request`, `registry_request`. The `instruction` must contain 3–3000 cleaned characters.

Actual `GET /human-gate` returns `gate` with `decisionId,decision,reviewer,reason,decidedAt,fingerprint,currentFingerprint,stale,effectiveApproved`. Server-side fingerprint currently includes **case metadata, documents and lawyer case-law classifications, but not draft content hash**.

Export `format`: `md`, `txt`, `docx`, `csv`, `json`, `png`, `jpg`, `pdf`. `report` accepts `title,caseVersion?,summary?,sections?,sourceManifest?,provenance?`; sections have `id,title,items`, items have `heading,text,status,sources`. Source refs: `id,locator,title`; manifest: `id,title,locator,version,sha256`; provenance: `claimId,sourceId,locator,note`. Server sets `caseId`, `generatedAt`, export `mode` and `humanGate`. Limits: 40 sections, 120 items/section, 500 manifest entries, 1000 provenance entries, 900000 aggregate text chars. PDF is an export model for browser rendering, **not a PDF binary returned by Worker**.

## No speculative APIs

The baseline's possible `/api/oic2/cases/.../batches` and `.../drafts/.../revisions` are **PROPOSALS**, absent from the verified `main`. `POST /intelligence/analyze` currently derives its task from case metadata and extracted legal hints, **not** from arbitrary user question body. `POST /intelligence/draft` creates a new `DRAFT-<UUID-v4>` without version ancestry, conversational diff or rollback; new revision-specific behaviour must be implemented in the existing Worker through a reviewed thin adapter, not by introducing a parallel backend.

---

# Annex B — Independent DEV-B ZIP review (24 November 2026)

**User attachment ZIP SHA-256:** `8299718b152880c5f011dbbff1f876d55605267adcbf8069a3bb71c31a013956`.

**Artifact verified:** 8 ZIP entries; no traversal/symlink/absolute paths; full extracted files inspected; 7/7 `SHA256_MANIFEST.json` hashes matched; the separately attached `ACCEPTANCE_REPORT (1).md` is byte-for-byte identical to `ACCEPTANCE_REPORT.md` in the ZIP. Two `node --check` passes. Independently executed `node --test tests/*.test.mjs` under Node.js v22.16.0: **27/27 PASS**, 0 failures, 0 skipped. No browser E2E, live Worker call, remote storage write, paid AI call or OCR test was performed.

**Reviewed files:** `src/oic2-adapter.mjs`, `src/oic2-workflow.mjs`, `tests/contract.test.mjs`, `tests/workflow.test.mjs`, `START_HERE.md`, `ACCEPTANCE_REPORT.md`, `TEST_RESULTS.txt` and manifest.

## Required DEV-C corrections (source-proven and four additional local probes)

1. **AUTH — P0 integration blocker.** DEV-B `OIC2Adapter.request` line 29 relies on same-origin cookies; the actual Worker only recognises membership-key Authorization Bearer or X-Membership-Key. Additional stub probe captured only `Accept: application/json`; live private access would fail for unauthenticated requests. Keep credentials memory-only and never log them. Do not use a new account/login backend.
2. **SUCCESS ENVELOPE — P0.** DEV-B `request` lines 32–35 checks HTTP `res.ok` and object shape but not JSON `data.ok === true`. Stub returned HTTP 200 `{ok:false,error:"case_workspace_membership_required"}` and the adapter **resolved as success**. Reject this envelope; redact server error details in UI.
3. **IDENTIFIERS — P0.** DEV-B accepts `DEMO-001`, `D01`; the Worker uses strict prefixed UUID-v4. Preserve synthetic test IDs inside local-only mocks; real API contract tests must use valid case/doc/session UUIDs.
4. **ROW MAPPING — P0.** DEV-B `validateDocumentLedger` expects `{id,name,sha256,bytes,uploaded,extracted,lawyerReviewed,sourceVerified}`. Real `GET /documents` returns `original_name,slot_number,mime_type,storage_state,extraction_state` and **no document byte size** or lawyerReviewed/sourceVerified fields. Native row caused `INVALID_DOCUMENT_NAME` in a controlled local probe. Build an explicit converter with server-verified statuses; do not invent missing bytes/review/authority verification. Where absent, set `UNVERIFIED`, not `true`.
5. **RELEASE/INTEGRITY — P0.** DEV-B correctly returns `legalReleaseAllowed:false`, but the existing case fingerprint currently omits draft SHA and the export route accepts client report content. A previous case-level approval must not authorise a revised professional document. Introduce revision-content-bound server fingerprint and forced relock; verify with negative tests before any professional mode.
6. **PROVENANCE — P1.** Local hash-only duplication (`DUPLICATE_FILE_CONTENT`) is a DEV-B product rule and is **not** an existing `GET /documents` rule. Duplicate evidence may be legally meaningful and should be marked/linked for attorney decision rather than dropped without a product requirement. Source `safeCaseAuditMetadata` also strips unlisted fields: `draftSha256`, `analysisSha256`, `derivedSha256` passed by callers are not currently persisted there. Add allowlist fields plus tests if used for immutable revisions.
7. **SCOPE — P0 for staging.** Test ZIP contains NO live OCR implementation, no parser, no browser UAT, no isolated D1/R2 bindings, no `main` import or runtime demonstration. Do not relabel 27 mocks as end-to-end. R2 and Workers AI/OCR cost and retry behaviour remain unverified.

**Disposition:** DEV-B is a trustworthy **isolated synthetic test candidate** with independently confirmed 27/27 tests and matching hashes. It is **NOT a verified Case Workspace integration** and is **NOT approved for staging/prod**.

**Gates unchanged:** `DEVELOPMENT GO` · `STAGING NOT VERIFIED` · `HUMAN GATE HOLD` · `LEGAL_HOLD ACTIVE` · `PRODUCTION NO-GO`.

**Sources:** immutable `main` source paths already listed in the baseline; the DEV-B ZIP and report were supplied on 2026-11-24. No code from the ZIP has been committed to the repo, and there were no changes to the corpus, existing production code, Cloudflare bindings or staging locks.
