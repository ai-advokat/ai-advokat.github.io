# OIC-2 ACCEPTANCE MATRIX v1.0
All functional gates below start NOT TESTED against the integrated Worker. Local mock tests are separate evidence. Baseline source inspection is not live acceptance.

| ID | Task | Test & required result | Initial state |
|---|---|---|---|
| A00 | OIC-00 | Main SHA and branch verified; only authorized branch changes | SOURCE VERIFIED |
| A01 | OIC-04 | Valid CASE-/DOC-/DRAFT- UUID v4; malformed IDs rejected; list snake_case normalized without invented facts; 200 ok:false and unknown envelope rejected | NOT TESTED |
| A02 | OIC-01,04,05 | Two synthetic files raw bytes with MIME/signature checks; document hashes match; 20 limit; duplicate handling explicit; unauthorized or wrong-case denied | NOT TESTED |
| A03 | OIC-06 | MK Cyrillic scanned decision + digital appeal; material amounts/dates/IDs and locators match reference; uncertain text flagged; no guessed facts | NOT TESTED |
| A04 | OIC-07 | Both extractions complete; analysis covers evidence, disputes, omissions, adverse arguments and current-law version provenance; unverified law explicitly flagged | NOT TESTED |
| A05 | OIC-03,07 | Generate WORKING DRAFT response to appeal (type semantics approved by lawyer); no filing/signature/transmission; editable content and source locators | NOT TESTED |
| A06 | OIC-08 | Save, conversation revision, reload, history, diff, rollback-as-new; two concurrent same-parent requests exactly one accepted, including same content and ABA; idempotent retry/crash | NOT TESTED |
| A07 | OIC-05,08,09 | Snapshot change then restore never revives approval; source/authority/auth/gate epochs monotonic; races and revocation fail closed; missing or fabricated actor denied | NOT TESTED |
| A08 | OIC-09,11 | Under active hold professional export denied, working export distinctly labeled; exact approved identity only in separately authorized synthetic policy test; stale/altered content and wrong case rejected | NOT TESTED |
| A09 | OIC-10,11 | DOCX opens and editable; PDF opens, readable Cyrillic; court pleading/annex separation, same approved/working AST, content + model + artifact hashes, no private leak | NOT TESTED |
| A10 | OIC-04,12 | All inherited/new applicable tests run, including legacy import failures and 18 reported mismatches reconciled; full local Worker regression/security suite clean | NOT TESTED |
| A11 | OIC-06,13 | Local then separately approved HTTPS isolation; no production DB/R2/bindings, credentials or confidential data; bounded quota/timeout/retry and auth | HOLD |
| A12 | OIC-12,14 | Single end-to-end synthetic case: decision + appeal -> extraction -> analysis -> response -> attorney edit -> DOCX/PDF; record evidence and legal review | NOT TESTED |

Minimum evidence per executed test: test ID, exact commit, environment (mock/local Worker/local D1/authorized HTTPS), command/request type (no credentials), expected/actual, status, sanitized log or artifact hash, reviewer/date. Test-only approval must never unlock real professional release. Separate authorization required for HTTPS UAT and production. No migration execution or production changes.
