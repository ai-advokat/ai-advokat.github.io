# MK Source Graph

Status: STAGING DESIGN
Date: 2026-09-29

## Primary legal spine
- Official Gazette
- LDBIS

## Judicial spine
- Judicial Portal
- Supreme Court
- Constitutional Court
- Basic courts
- Appellate courts
- Administrative Court
- Higher Administrative Court

### Judicial material classes
**Authority-bearing**
- judgments
- decisions
- rulings
- legal opinions
- principled positions

**Professional reference**
- bulletins
- collections
- professional papers

**Procedural resource**
- forms
- court rules
- public instructions

**Context only**
- press releases
- news
- hearing calendars
- reports
- statistics
- public notices

A press release about detention, a plea agreement, or a hearing is never treated as the judgment or ruling itself.

## Justice institutions
- Ministry of Justice
- State Attorney Office
- Bar Association
- Notary Chamber
- Chamber of Enforcement Agents

## Official verification/service sources
- Central Registry
- Cadastre
- Public Revenue Office
- National e-Services Portal
- Health Insurance Fund
- Ministry of Economy and Labour

## Regulatory monitoring
- Economic Chamber
- ENER

Draft/proposed legislation is never treated as law in force until enacted and officially published.

## Commercial/secondary systems
- DeJure
- Factum
- PRAKSIS
- PraVI

Use only for public feature benchmarking or discovery. Do not copy subscriber-only or proprietary legal corpora.

## Privacy and reuse boundary
Do not bulk-ingest:
- authenticated user data
- private e-delivery documents
- taxpayer-specific records
- private case files
- restricted registry datasets
- personal data from enforcement notices
- subscriber-only legal databases


## Historical legal archive: pravo.org.mk

Classification: historical legal resource / provenance source.

Metamorphosis records that pravo.org.mk was launched in October 2005 as part of the Legal Resource Centre project by MOST and the Parliament of the Republic of Macedonia. Its early database contained laws adopted from 1998-2004 and also included legislative analyses, Supreme/Constitutional Court decisions, legislative news and international acts.

AI Advokat policy:
- use surviving public material for historical discovery and provenance;
- preserve original publication/date/source metadata;
- never treat an old pravo.org.mk text as current law solely because it appears in the archive;
- re-verify current status through Official Gazette/LDBIS;
- re-verify court decisions through the originating court when possible;
- label historical acts with the correct temporal validity.


## ENER regulatory pipeline

Classification: official proposal / consultation / regulatory-impact source.

Public ENER functions to track:
- proposed regulations;
- latest proposed regulations;
- consultation-expiry monitoring;
- public comments;
- most-commented regulations;
- opinions on draft regulatory-impact-assessment reports;
- documents;
- initiatives;
- forum material;
- analyses.

### AI Advokat use
ENER feeds a PRE-LAW / CHANGE-DETECTION layer.

Status model:
- PROPOSED
- CONSULTATION_OPEN
- CONSULTATION_CLOSING
- CONSULTATION_CLOSED
- OPINION_PUBLISHED
- ADOPTED_PENDING_PUBLICATION
- PUBLISHED_IN_GAZETTE
- ABANDONED_OR_SUPERSEDED

Rules:
- a proposal from ENER is NEVER treated as law in force;
- no answer about current law may rely on a proposal as controlling authority;
- when an ENER proposal later appears in the Official Gazette, link proposal history to the enacted instrument;
- preserve ministry/issuer, consultation dates, comments/opinions and proposal versions;
- use ENER to alert version engine that a law may soon change;
- current-law status changes only after authoritative enactment/publication and effective-date verification.

### Useful output
For every current-law answer, where relevant:
- CURRENT LAW
- PENDING/PROPOSED CHANGE
- consultation deadline
- issuing ministry
- official ENER link
- publication/adoption status


## Akademik / Akademika

Classification:
- commercial legal publisher;
- commercial legal database;
- legal literature / training provider;
- coverage and freshness benchmark.

Publicly described characteristics:
- daily-updated collection of Macedonian regulations;
- claim of comprehensive current Macedonian legislation coverage;
- professional legal literature;
- practical legal training;
- contract/form collections and legal commentaries.

AI Advokat policy:
- use public information to benchmark corpus completeness, freshness, taxonomy and UX;
- use public catalog metadata to discover relevant secondary literature;
- never copy subscriber-only Akademika legal texts or proprietary editorial consolidation;
- never treat a commentary/practicum/template as primary authority;
- verify every legal proposition against Official Gazette/LDBIS/court sources;
- where a secondary work materially informs analysis, label it as secondary commentary and preserve attribution.

Secondary literature categories worth modelling:
- criminal-procedure practice;
- contract/template collections;
- competition-law commentaries;
- commercial/property-law forms;
- professional training materials.


## Ministry of Justice regulation lanes

The Ministry of Justice publicly separates its regulation area into:
- Закони на МП / Ministry laws;
- Пречистени текстови / consolidated or purified texts;
- Предлог закон / draft laws.

AI Advokat must preserve these as different legal-status classes.

### 1. Ministry law
Status candidate: ENACTED / OFFICIAL_SUPPORTING_SOURCE

Use as an official supporting source, but verify publication and current legal effect against Official Gazette/LDBIS before marking an article CURRENT.

### 2. Пречистен текст
Status candidate: CONSOLIDATED_OFFICIAL_SUPPORTING

Use as a strong official consolidation signal.
Still verify:
- amendment chain;
- Gazette provenance;
- effective/application dates;
- Constitutional Court effects;
- whether the ministry text itself states any limitation or date.

Never silently equate "пречистен текст" with "authoritative current text" unless source status and version chain are resolved.

### 3. Предлог закон
Status: PROPOSED

Rules:
- never answer a current-law question from a draft as controlling authority;
- connect the proposal to ENER/parliamentary procedure when available;
- if later enacted, link proposal history to the published Gazette act;
- preserve proposal date and originating ministry.

### Retrieval display
Where relevant, the user-facing result should distinguish:
- CURRENT LAW
- OFFICIAL CONSOLIDATED TEXT
- PROPOSED CHANGE

These labels must never be collapsed into one generic "law" result.
