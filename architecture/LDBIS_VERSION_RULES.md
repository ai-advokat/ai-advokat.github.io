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


## Consolidated endpoint

Official public endpoint:
https://ldbis.pravda.gov.mk/Revidirani.aspx

The public interface exposes:
- Law / regulation selector
- Date selector
- Article selector

This endpoint is the preferred public discovery source for consolidated/revised text candidates.

### Article-level rule
For every retrieved consolidated instrument:
- resolve the selected law/regulation;
- preserve the requested reference date;
- split strictly by article;
- keep paragraph/item hierarchy inside the article;
- store one authoritative retrieval chunk per article;
- retain the LDBIS source URL and version metadata;
- never merge adjacent articles into one authoritative chunk.

### Version classes observed in LDBIS
- Изворен текст
- Текст измена/дополна
- Пречистена верзија
- other explicitly labelled version classes

Store the exact source label. Do not normalize different legal meanings into one generic "current" label.

### Required metadata from LDBIS law view
Capture when available:
- title
- instrument type
- version label
- territorial validity
- issuing institution
- official gazette
- issue number
- publication date
- entry-into-force date
- application-start date
- validity-end date
- active/inactive signal
- linked / related laws
- source URL

### Date-aware retrieval
The engine must distinguish:
- publication date
- entry into force
- beginning of application

These dates may differ. A provision cannot be treated as applicable on a case date merely because it had already been published.

### Consolidated-text gate
A LDBIS consolidated/revised text is a strong official signal, but each article remains subject to:
- amendment-chain verification;
- Constitutional Court effect verification;
- date-of-application verification;
- Human Gate before PRODUCTION_READY.
