# AI Advokat — Case Law Engine

Status: DESIGN + DATA MODEL
Jurisdiction order: North Macedonia -> ECHR/Strasbourg -> EU -> Balkan -> wider comparative law

## Core rule

Never show only "positive" authority.

For each legal issue return:
1. SUPPORTING — authority that supports the client's legal position;
2. ADVERSE — authority that cuts against it;
3. DISTINGUISHING — superficially similar authority that may be separated on facts/law;
4. NEUTRAL — useful background/procedural authority.

This avoids cherry-picking and makes the legal opinion professionally defensible.

## Domestic North Macedonia sources

Priority:
1. Supreme Court of the Republic of North Macedonia;
2. Constitutional Court;
3. appellate courts;
4. basic courts where publicly available and legally useful;
5. officially published legal opinions/principled positions where available.

Primary public sources include:
- vrhoven.sud.mk
- odluki.sud.mk
- ustavensud.mk

For each domestic decision capture:
- court
- chamber/department
- case number
- date
- finality where known
- legal area
- issue
- cited statutory articles
- holding/principle
- disposition/outcome
- factual tags
- source URL
- source locator
- related decisions
- Human Gate status

## ECHR / Strasbourg

Primary source: HUDOC.

Capture:
- case title
- application number
- respondent State
- Chamber / Grand Chamber / Committee
- judgment / decision / communicated case / advisory opinion
- date
- finality
- Convention article(s)
- violation / no violation / inadmissible / struck out / friendly settlement / other outcome
- keywords
- importance
- relevant domestic law
- Strasbourg precedents cited
- operative part
- legal principle/holding
- official language(s)
- translation status
- HUDOC item URL/identifier

### ECHR weighting
Typical hierarchy:
- Grand Chamber -> highest persuasive/interpretive weight
- Chamber -> strong
- Committee -> narrower/repetitive-case value
- Decisions/admissibility -> relevant for procedural/admissibility points
- Communicated cases -> never treated as final authority

Translation warning:
Non-official translations are informational only; authoritative legal analysis should preserve the official English/French text reference.

## Relevance ranking

Composite ranking should use:
- exact legal issue match
- exact statutory/Convention article match
- court level
- factual similarity
- procedural posture similarity
- recency
- finality
- whether later authority follows/distinguishes/overrules the case
- source quality

Do not rank a case highly merely because outcome is favourable.

## Supporting authority

A "positive" result must show WHY it supports the position:
- same legal rule?
- same procedural issue?
- materially similar facts?
- same burden/evidentiary problem?
- same remedy?
- same Convention article?
- same domestic provision/version?

Output:
- case name + number
- court/date
- short holding
- why it helps
- factual similarities
- factual differences
- source link

## Adverse authority

Always surface the strongest materially relevant contrary case when available.

Output:
- why it hurts
- whether it is binding/persuasive
- whether facts can be distinguished
- whether later authority limits it

## Distinguishing authority

The system should explicitly identify differences such as:
- different statutory version
- different date/effective regime
- different procedural stage
- different factual element
- different evidentiary record
- different applicant status
- different remedy requested

## Case-strength integration

The Predictor/Analyzer may use case law as one factor:
- supporting authority strength
- adverse authority strength
- factual fit
- court hierarchy
- legal-version fit
- evidentiary completeness

But:
- no outcome percentage is generated from case-law count alone;
- one strong Grand Chamber/Supreme Court authority may matter more than many weak decisions;
- no "80% chance" without a validated calibrated model.

## Example workflow

User uploads 15 pages concerning inheritance/property.

Engine:
1. extracts facts;
2. identifies legal issues;
3. retrieves current inheritance/property/procedure articles;
4. searches Macedonian decisions on the same issue;
5. searches ECHR only where Convention rights are genuinely implicated;
6. classifies relevant cases as supporting/adverse/distinguishing;
7. explains analogies and differences;
8. produces a case-strength assessment;
9. drafts next steps and filing;
10. Human Gate.

## Safety / integrity

- never fabricate case numbers or holdings;
- every cited judgment must resolve to a real source;
- distinguish binding law from persuasive authority;
- distinguish domestic precedent from Strasbourg minimum-rights jurisprudence;
- never call a case "positive" without identifying the client's position and issue;
- never hide materially adverse authority in professional-use mode.
