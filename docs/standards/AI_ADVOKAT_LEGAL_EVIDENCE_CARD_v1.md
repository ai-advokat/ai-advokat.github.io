# AI Advokat Legal Evidence Card v1

The Legal Evidence Card is the operational display contract for controlled legal publications.

It answers five questions before any document can be trusted or surfaced by an AI workflow:

1. **What is this?** — stable identity, title, type and edition.
2. **Where did it come from?** — source set, original files and provenance.
3. **What has been verified?** — legal/source review date, audit and epistemic status.
4. **Who stands behind it?** — source role and author approval.
5. **What may the system do with it?** — public release, AI/RAG, GitHub merge and production-write gates.

## Visual semantics for future UI

A future public/internal card should never use a single green/red “verified” badge for the whole document. It should show separate states:

- **Law/source verification**
- **Author approval**
- **Public release**
- **AI/RAG eligibility**

This prevents a reviewed document from being mistaken for a publication master, and prevents an author-approved document from being mistaken for RAG-approved evidence.

## Fail-closed rule

Missing gate data means **not approved**.

Missing verification date means the document must not be represented as verified current law.

A title match or newer upload never silently supersedes a controlled version.

## Human-readable status language

Recommended labels:

- „Правна проверка во тек“
- „Правно-изворно проверено“
- „Авторски одобрено“
- „Јавно објавување не е одобрено“
- „Не е одобрено за AI/RAG“

These labels describe state; they are not legal advice and do not guarantee substantive correctness beyond the recorded verification scope.
