# MK Current-Law Readiness Gate

Version: 2026-10-11
Status: REQUIRED BEFORE CURRENT-LAW PROMOTION

## Purpose

This gate turns the Master Legal Coverage principle into a machine-checkable rule.

A Macedonian instrument is **not** production-ready merely because:
- the base law is marked active in LDBIS;
- a consolidated or purified text exists;
- article rows exist in D1;
- an amendment chain is partially known;
- a version is labelled "current" by an importer or UI.

## Mandatory promotion gates

Every instrument must satisfy all eight conditions before `PRODUCTION_READY` / verified-current use:

1. `official_source_bound`
2. `article_level_text_present`
3. `article_set_version_bound`
4. `amendment_chain_resolved`
5. `constitutional_court_effects_resolved`
6. `application_dates_verified`
7. `current_version_verified`
8. `human_gate_approved`

Any false, unknown or unresolved gate means the system fails closed.

## First controlled sequence

The repository evidence supports this safe order:

1. **ZI / Закон за извршување** — strongest reproducible article snapshot: exact URL, SHA-256 and 258-row invariant.
2. **ZRO / Закон за работните односи** — 298-row historical snapshot plus 32 audited 2025 amendment events; current text is not reconstructed.
3. **ZKP / Закон за кривичната постапка** — 570-row reference consolidation from a secondary source; official current-law binding is still required.

The first task is **version binding**, not legal-currency promotion.

## Live-D1 state classes

The read-only preflight may classify each legacy article corpus only as:

- `absent` — no article rows;
- `legacy_unbound_exact_snapshot` — exact governed row count/source/hash, all version IDs NULL;
- `bound_exact_snapshot` — exact governed row count/source/hash, every row bound to the one expected non-current/pending version.

Any partial binding, unexpected hash, unexpected URL, row-count drift, multiple bound versions, current flag, or approved Human Gate is a **STOP** condition.

## No-write preflight

The preflight workflow:
- executes SELECT queries only;
- checks production and staging independently;
- never applies migrations;
- never changes `is_current`;
- never changes Human Gate;
- never rewrites legal text;
- never publishes a new legal-status claim.

A later mutation workflow requires a separate explicit Human Gate after the read-only results are reviewed.

## Temporal laws

For laws such as ZPP where entry into force and start of application differ, article sets must remain in separate version tracks. No automatic collapse into one "current" text is permitted.

## Promotion rollback

If a later amendment, correction, Constitutional Court effect or date conflict is detected, the affected instrument/article reverts immediately to `VERSION_REVIEW_REQUIRED`.
