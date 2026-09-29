# LDBIS Version Rules

Status: STAGING DESIGN
Date: 2026-09-29

LDBIS is treated as a master metadata spine for North Macedonian law.

For each instrument/version capture:
- title;
- instrument type;
- Official Gazette reference;
- publication date;
- entry-into-force date;
- application-start date;
- validity end date where applicable;
- active/inactive status;
- linked amendments;
- Constitutional Court effects;
- source URL;
- Human Gate status.

A legal text may be marked CURRENT only when:
1. all later amendments and corrections are resolved;
2. Constitutional Court effects are resolved;
3. effective/application dates are verified;
4. the article-level chunks belong to the verified version.

When a new amendment, correction or court effect is detected, affected articles revert to VERSION_REVIEW_REQUIRED until re-verified.

Article granularity remains mandatory:
1 article = 1 authoritative retrieval chunk.
