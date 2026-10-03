# AI Advokat Response Provenance Contract v1

## Core chain

**source → legal claim → AI response → human control**

The Response Provenance Contract closes the evidentiary chain between the underlying source and the final machine-produced answer.

AI Advokat must be able to explain, at claim level, where a consequential proposition came from, what kind of authority supports it, which version/date was checked, how it was classified, and whether a human has reviewed the resulting response.

## 1. Source

Every consequential legal claim must point to a real source identity.

A source may be:
- A1 primary binding law;
- A2 judicial authority;
- A3 official guidance;
- A4 authorial analysis;
- A5 secondary reference.

A6 AI synthesis is never a source identity for the legal proposition it generated.

## 2. Legal claim

Each claim should have its own provenance record:

- claim ID;
- claim text;
- claim type;
- authority class;
- source identity;
- source version/date;
- locator;
- verification state;
- provenance record;
- response label.

The system must not hide a weak source behind a fluent answer.

## 3. AI response

A single answer may contain claims of different epistemic quality.

Therefore the response must not use one blanket “verified” badge where individual claims have different verification states.

Recommended response labels:

- **Проверено важечко право**
- **Судска/службена информација**
- **Авторска анализа**
- **Секундарен извор**
- **AI синтеза**
- **Непроверено**

AI prose may organise or explain evidence, but the underlying legal source remains separately visible.

## 4. Overall verification state

A response may be marked fully verified only if every consequential current-law claim has passed the Legal Claim Validator and no unresolved claim remains pending, conflicted, historical-only or superseded.

Mixed responses must be represented as mixed.

## 5. Human control

Human control is the final layer, not an optional decoration.

Every controlled response must record:

- whether human review is required;
- review state;
- release decision.

Allowed review states:
`not_reviewed`, `reviewed`, `approved`, `rejected`, `needs_revision`.

Allowed release decisions:
`not_authorized`, `internal_only`, `authorized_for_release`.

No AI-generated provenance record may self-authorize public release.

## 6. Fail-closed rules

The response must be blocked or downgraded when:

- a claim has no source;
- AI synthesis is used as the legal source;
- a current-law claim is not `verified_current`;
- a current-law claim lacks the checked source version/date;
- a high-risk current-law claim lacks a precise locator;
- human review metadata is missing;
- one unresolved claim is hidden behind an overall “verified” label;
- a superseded source is used as current law.

## 7. Human Gate

This contract does not replace legal judgment.

It makes the chain auditable so that a human reviewer can see:

**what the source says → what claim was derived → what AI added → what the human finally approved or rejected.**
