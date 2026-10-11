# Common-Law Comparative Source Policy

Version: 2026-10-11
Scope: AI Advokat comparative common-law research

## Core rule
A popular, educational, encyclopedic or practitioner summary may identify an important case or explain a doctrine, but it must never create an authoritative holding by itself.

For common-law case analysis, the controlling unit is the judicial decision and the proposition necessary to decide the controversy. A secondary source may suggest the issue or possible holding; the system must bind the proposition to the actual judgment or an authorized law report before treating it as case-law authority.

## Required distinctions
For every common-law proposition, distinguish:
- holding / ratio necessary to the result;
- dicta / explanatory observations;
- factual similarity and factual distinction;
- whether the earlier authority remains good law;
- whether it has been overruled, reversed, limited or displaced by legislation;
- court hierarchy and jurisdiction;
- decision date and later treatment.

A label such as "landmark", "famous", "leading" or "case every student should know" is educational/editorial metadata, not a formal precedential status.

## Source classes

### A. Originating court / authorized law report
Preferred for:
- exact holding;
- dispositive outcome;
- judicial reasoning;
- citations and subsequent treatment.

### B. Legal-information institute
Example: BAILII.

Use:
- manual case discovery and link resolution where terms permit;
- locating case names and citations.

BAILII-specific rule:
- the supplied public notice states that its Terms of Service prohibit bulk downloading, scraping and automated systems;
- AI Advokat therefore treats BAILII as link/manual-discovery only;
- no automated crawling, bulk retrieval or bot-based ingestion;
- a user-supplied excerpt may be analysed as user-provided material, but must not be silently promoted to originating-court authority.

### C. Academic / educational secondary source
Examples:
- BBC Bitesize legal-history materials;
- University of Law educational blog content;
- encyclopedia articles.

Use:
- legal history;
- doctrinal orientation;
- case-name/topic discovery;
- terminology.

Not for:
- current law;
- authoritative holdings;
- finality/status;
- binding-effect claims.

### D. Practitioner commentary
Example:
- law-firm insight articles.

Use:
- issue spotting and case discovery.

Not for:
- authoritative holdings without primary binding;
- unqualified current-law statements.

## Historical material
Historical explanations of Anglo-Saxon or medieval enforcement and punishment are educational history only. They must never enter a modern answer as current criminal procedure, punishment or police law.

## Comparative domestic effect
English, UK, US or other common-law authorities are not automatically binding in North Macedonia. The answer must label them as comparative/persuasive unless a specific legal rule gives them a different role.

## Retrieval rules
1. Search exact official/current Macedonian authority first for a Macedonian legal question.
2. Use ECHR/EU/international sources according to their applicable legal basis.
3. Use common-law cases only when comparative reasoning is useful or expressly requested.
4. Resolve a secondary case mention to the originating judgment/authorized report before extracting holdings.
5. Check subsequent treatment and legislation before presenting an old common-law rule as current.
6. If primary binding fails, return the case as a discovery lead, not as a verified holding.

## Fail-closed rule
If a case name is known only from an educational or practitioner summary:
- store it as discovery metadata;
- set official_binding_verified=false;
- do not generate an authoritative quotation or holding;
- require Human Gate before material legal reliance.
