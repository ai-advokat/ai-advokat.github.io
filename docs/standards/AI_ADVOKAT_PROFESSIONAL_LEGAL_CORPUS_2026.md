# AI Advokat Professional Legal Corpus 2026

**Status:** controlled implementation standard  
**Doctrine:** source-first · version-aware · human-gated  
**Scope:** practical guides, professional manuals, research papers and future authored legal publications

## 1. Purpose

The Professional Legal Corpus is not a folder of documents. It is the controlled evidentiary layer of AI Advokat.

A document may be present in the repository without being legally current, author-approved, public, or eligible for AI retrieval. Presence is never treated as approval.

The governing motto remains:

> Правото, организирано. AI, под човечка контрола.

## 2. Five corpus lanes

Every publication must occupy exactly one lifecycle lane:

1. **SOURCE** — author-delivered material preserved with provenance.
2. **LEGAL/SOURCE REVIEW** — current-law, citation, version and internal-consistency review is open.
3. **CORRECTED CANDIDATE** — legal/source corrections are complete and a new candidate fingerprint exists.
4. **AUTHOR-APPROVED CANDIDATE** — the author has explicitly approved the corrected candidate.
5. **PUBLICATION MASTER** — publication QA is complete and a separate public-release Human Gate has been granted.

No lane implies the next lane.

## 3. Epistemic labels

Material used by AI Advokat must carry a machine-readable epistemic label:

- `verified_current_law` — checked against identified current primary/official sources on a recorded date.
- `historical_source` — valid as historical evidence but not represented as current law.
- `authorial_analysis` — interpretation, commentary or argument attributed to its author.
- `pending_verification` — not safe to present as a current-law proposition.
- `superseded` — replaced by a newer controlled version.

A legal proposition cannot be promoted from `pending_verification` merely because it appears in an authored publication.

## 4. Source hierarchy

For current-law claims, use the strongest available source in this order:

1. Constitution, statute, official gazette or official consolidated text.
2. Constitutional Court / Supreme Court / other competent domestic court or authority.
3. HUDOC / CJEU / EUR-Lex where relevant.
4. Official ministry, agency, regulator or tax-administration guidance.
5. Scholarly and professional commentary.
6. Secondary summaries and media only as discovery aids unless the secondary source itself is the object of analysis.

Conflicts are recorded, not silently reconciled.

## 5. Version contract

Every controlled publication must record, where applicable:

- stable corpus ID;
- title and publication type;
- source edition;
- author-delivered source fingerprint;
- legal/source review date;
- corrected-candidate fingerprint;
- author-approval evidence/date;
- supersedes / superseded-by relation;
- public-release state;
- AI/RAG eligibility state;
- GitHub-merge state;
- production-corpus-write state.

A later file with the same title does not silently replace an earlier version.

## 6. Human Gate matrix

The following decisions are separate and require separate evidence:

| Gate | Meaning |
|---|---|
| Author approval | Author accepts the corrected candidate |
| GitHub merge | Repository change may enter the target branch |
| Public release | Publication may be exposed to the public |
| AI/RAG eligibility | Content may be retrieved as controlled AI evidence |
| Production corpus write | Content may be written to production corpus/storage |

Approval of one gate never implies another.

## 7. AI retrieval contract

AI Advokat must not retrieve a document as current-law authority merely because it exists in the corpus.

For future RAG eligibility, the minimum record must include:

- publication identity and version;
- current status;
- source verification date;
- citation/source basis;
- author approval where the content is authorial;
- explicit `rag_eligible=true` Human Gate;
- no unresolved blocking legal finding.

When a source may be stale, the system should surface the version date and require re-verification rather than inventing currency.

## 8. Publication card contract

Future public corpus cards should distinguish four things visually and semantically:

- **what the source says**;
- **what law/source was verified**;
- **what the author analyses or concludes**;
- **what AI generated or organised**.

AI synthesis must never be rendered as if it were statutory text, a judicial holding, or the author's approved wording.

## 9. Current 2026 implementation

The first controlled cohort is the ten-guide set `last_set_2026_10_03`.

The inheritance guide has advanced only to `author_approved_candidate`. The remaining nine are in active legal/source upgrade. Their audit files are linked from the publication-governance register.

All public release, AI/RAG, merge and production-write gates remain fail-closed unless separately approved.

## 10. Design principle

The distinctive feature of AI Advokat is not that it can generate more text.

It is that every consequential legal statement can be placed inside a visible chain of **source → version → verification → authorial responsibility → human approval → controlled use**.
