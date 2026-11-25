# OIC2 — atomic source gate design (review-only)
Date: 2026-11-25. Runtime baseline: 6cf8d9ea2410e9165973f4e315dafb87c49c741f.
Status: PROPOSAL, NOT IMPLEMENTED. HUMAN GATE HOLD; LEGAL_HOLD ACTIVE; PRODUCTION NO-GO.
No deployment, migration, provider activation, or release authorized.

## Observed gap
The existing response review is a historical receipt: appendResponseReview performs a single conditional D1 INSERT for the decision sequence and current actor/key/entitlement/role. handleResponseRevisionReview reads the revision, immutable draft receipt and current extraction bytes before that INSERT. These observations are not one atomic transaction across D1 and R2. A change between the final read and INSERT is possible. A case fingerprint is not an authority epoch or a proof of current law. R2 conditional creation of a revision does not make the D1 source snapshot atomic. Never treat a receipt as a release token; no approval can override active LEGAL_HOLD. Existing general non-response professional export also accepts client report sections; keep that risk in scope for the release gate.

## Proposed architecture (one existing Worker, one authorization system)
1. Establish one authoritative D1 integrity state for each case/draft, with monotonic revision/head, source, authority, authorization and hold epochs; default deny if missing. All effective document/extraction/analysis/authority/access/hold mutation paths must advance the appropriate epoch in the same authoritative transaction, including deletion, re-extraction, replacement, role/key/entitlement revocation and rollback/restore. A global authority change must also be captured by a governed authority epoch; do not equate a stored citation with current law.
2. For R2, stage immutable content-addressed object bytes privately, verify SHA-256 from actual bytes, and publish the pointer and epoch through a conditional D1 transaction. For D1 fallback, equivalent immutable object identity and pointer commit are required. Mutable legacy object keys must not remain an authoritative release path. R2 and D1 do not provide a single cross-service ACID transaction: the D1 pointer commit is the linearization point; orphan staged objects are never release evidence. No overwrite/restore of published bytes is permitted; digest mismatch or missing storage blocks release.
3. Bind explicit review to actor, decision sequence, exact immutable revision/draft identity, source snapshot, authority snapshot and all captured epochs. Use a conditional D1 write whose predicate checks the expected state and membership at write; zero changed rows is a conflict, not success. Revocation advances the decision/hold state; a later return to identical text/bytes cannot revive an old approval. Preserve historical receipts, not current authorization.
4. Professional export remains disabled. For future reviewed implementation, reserve an export only for the exact approved revision and trusted canonical server model; render privately, hash output, then perform a final conditional D1 commit/recheck of current head, snapshots, epochs, active authorization, current decision and hold state before releasing bytes. Persist receipt with model/artifact hashes and renderer version. No client report, actor identity, approval flag or browser-generated PDF is trusted for professional release. A fresh request must always recheck, including retries; define revocation linearization relative to already-authorized in-flight delivery. No filing/signing/transmission.
5. Treat storage/DB/authority validation failure as locked. Keep working exports visibly unapproved. Review retention, deletion, access privacy and recovery of orphan objects, with synthetic inputs only. Migrations, if required, must be explicitly reviewed and exercised in a disposable local/isolated database; do not apply the frozen migrations or this design to remote resources.

## Proposed acceptance matrix
| ID | Negative or positive scenario | Required evidence |
|---|---|---|
| AT01 | Two revision writes from one exact head | One authoritative commit, one 409; no duplicate head |
| AT02 | Source changes between validation and review CAS | 409 or receipt demonstrably historical, never effective release |
| AT03 | Source A -> B -> A, same bytes/hash | Old approval not revived; monotonic epoch advances |
| AT04 | Authority version/status changes or is withdrawn | Old approval cannot authorize new export |
| AT05 | Role/key/entitlement revoked during decision/export | Write/final release denied by authoritative predicate |
| AT06 | Concurrent approvals/revocation | One CAS winner for same decision head; no stale release |
| AT07 | R2 missing/tampered bytes, D1 pointer absent/mismatched | Fail closed; no effective release or professional artifact |
| AT08 | Crash after staging before pointer commit; duplicate retry | No visible authoritative object; idempotent recovery/orphan handling |
| AT09 | Dirty editor, stale revision, legacy or forged client report | No professional export; canonical server content only |
| AT10 | Change/hold/revocation between render and final release | No bytes released; denied audit/receipt |
| AT11 | Active LEGAL_HOLD even with exact approved receipt | Deny professional DOCX/PDF and legacy bypass |
| AT12 | After separate human release authorization in isolated environment only | Exact server-rendered DOCX/PDF, content/model/artifact digest and decision receipt; distinct working outputs |
| AT13 | Independent full suite and Chromium on exact SHA; configured OCR/AI/current-law source | Recorded logs and source hashes, separate D1 fallback and R2 runs; no real client data |
| AT14 | Isolated HTTPS integration and governance sign-off | Explicit environment/resource manifest, scoped keys, cost cap, no production access |

## Decision gates
No schema or runtime implementation is included in this document. Before writing an implementation, inventory every mutation path and settle authoritative pointer/epoch schema and migration review. Reproduce controlled interleavings with a local real SQLite engine and R2 test double, then separately test actual Cloudflare D1/R2 semantics in an explicitly authorized isolated account/environment. Review current-law applicability and lawyer role verification with the legal team. Until those gates pass, no professional release; retain the existing historical receipt as evidence only.
