# AI Advokat Legal Claim Validator v1

The Legal Claim Validator is the enforcement layer for the Citation & Authority Engine.

It does not decide legal disputes. It checks whether a claim is sufficiently sourced and classified to be presented with the requested level of certainty.

## Decisions

- `accept` — classification and verification requirements are satisfied.
- `downgrade` — the material may still be shown, but not with the requested current-law certainty.
- `reject` — the claim is structurally unsafe, for example because the source identity is missing, AI synthesis is the only purported authority, or a locator is marked as invented.

## Current-law capability

A claim may be marked `current_law_capable=true` only when:

- claim type is `current_law`;
- authority class is A1, A2 or A3;
- verification state is `verified_current`;
- mandatory provenance fields are present;
- the checked source version/date is recorded.

For high-risk current-law claims, a precise locator is additionally expected.

## Safety principle

The validator is deliberately conservative.

A4 authorial analysis and A5 secondary references may be useful and publishable, but they cannot independently establish verified current law.

A6 AI synthesis can organise evidence, but can never become the authority supporting the proposition it generated.

## Integration posture

This validator is currently an internal control component only.

It does not activate public publication, RAG eligibility, GitHub merge approval or production-corpus writes.
