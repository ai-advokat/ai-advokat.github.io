# AI Advokat — Master Legal Coverage Gate (North Macedonia)

Status: REQUIRED BEFORE "MK COMPLETE"

## Principle

AI Advokat must not rely on a manually curated list of popular legal problems.
Coverage is source-driven.

A topic is considered covered only when the system can:
1. identify the controlling current legal instrument;
2. resolve the version effective on the relevant date;
3. retrieve the exact article(s);
4. show the official source and provenance;
5. route the matter to a practical workflow;
6. distinguish criminal / misdemeanour / civil / administrative / commercial / family / labour / tax / constitutional / international dimensions;
7. fail closed when the source/version is uncertain;
8. pass Human Gate for generated legal work.

## A. Criminal-law completeness

The system must ingest and map EVERY offence provision in the current Criminal Code, not only hand-picked offences.

For each offence article create:
- offence/article identifier
- official Macedonian title
- current version
- elements of the offence
- attempt / participation / complicity links where applicable
- aggravating / qualified forms
- penalty range from current source
- limitation / procedural links where applicable
- related Criminal Procedure provisions
- detention / evidence / search / seizure links
- victim-rights links where applicable
- juvenile-law overlay where applicable
- special-law overlay
- Human Gate status

The coverage engine must also capture offences or offence-like provisions in special statutes where criminal liability is created outside the Criminal Code.

## B. High-level criminal domains

All current offence articles must map into one or more domains, including:
- life and body
- liberty and coercion
- sexual offences
- offences involving children/minors
- domestic/family violence where criminally relevant
- property
- fraud/deception
- extortion/racketeering
- economic/business crime
- banking/financial crime
- tax/customs/excise crime
- corruption and abuse of office
- public-order offences
- offences against justice
- evidence/document forgery
- cyber/computer crime
- privacy/data/communications offences
- organized crime
- trafficking in human beings
- migrant smuggling
- narcotics/drug offences
- weapons/explosives offences
- transport/traffic crime
- environmental offences
- cultural-property offences
- intellectual-property offences
- election/public-function offences
- national/international security offences
- terrorism-related offences
- war crimes / crimes against humanity / international crimes
- offences affecting equality / hate-motive overlays
- other current statutory offence categories

This list is a routing taxonomy, not a substitute for article-by-article ingestion.

## C. Misdemeanour completeness

Build a separate misdemeanour corpus and workflow map:
- traffic
- public order
- communal/local
- labour
- tax/fiscal
- customs
- consumer
- environment
- construction/urbanism
- business/licensing
- data/privacy
- health/sanitary
- education
- immigration/foreigners
- other sectoral misdemeanours

Never mix criminal offences and misdemeanours in one authoritative classification.

## D. Civil and private-law completeness

Coverage must include:
- contracts
- damages/torts
- unjust enrichment
- property and possession
- co-ownership
- real-estate transactions
- mortgage/pledge
- inheritance/probate
- family/divorce/children/maintenance
- consumer disputes
- banking/credit
- utilities/telecom recurring claims
- debt/enforcement
- limitation periods
- insurance
- compensation
- personality/privacy rights
- defamation/reputation remedies where applicable
- mediation/settlement
- private international law

## E. Commercial / company / insolvency

- company formation/governance
- shareholder/member disputes
- directors/managers
- commercial contracts
- securities where applicable
- insolvency/bankruptcy
- liquidation
- secured transactions
- competition
- public procurement
- concessions/PPP where applicable
- accounting/reporting obligations
- beneficial ownership / AML overlays
- commercial enforcement

## F. Administrative / public law

- general administrative procedure
- administrative disputes
- urbanism/planning
- building/construction
- legalization/treatment of unauthorized buildings
- cadastre
- expropriation
- public property
- permits/licences
- concessions
- access to public information
- personal data
- citizenship
- foreigners/migration/asylum
- social protection
- pensions
- education
- health
- environment
- energy
- transport
- agriculture
- local self-government
- state aid/regulatory matters
- inspection procedures

## G. Labour and social law

- employment contract
- termination/dismissal
- wages
- working time
- leave
- discrimination/harassment
- workplace injury
- unions/collective rights
- social contributions
- pensions
- unemployment rights
- occupational safety and health

## H. Tax / fiscal / customs

- personal income tax
- VAT
- profit/corporate tax
- property tax
- inheritance/gift tax
- real-estate transfer tax
- excise
- customs
- local fees/charges
- tax audit
- assessment
- collection
- interest/penalties
- appeals and judicial review
- double-tax treaty layer where applicable

## I. Constitutional and human-rights overlay

Every workflow must be capable of linking:
- Constitution
- Constitutional Court effects
- ECHR / HUDOC
- applicable international instruments
- EU-law relevance where legally applicable
- equality/non-discrimination safeguards
- fair-trial rights
- privacy/family-life rights
- property rights
- effective-remedy rights

## J. Justice actors

Role-specific routing:
- courts/judges
- public prosecutors
- defence/attorneys
- state attorneys
- notaries
- enforcement agents
- police/investigative authorities
- experts
- mediators
- administrative bodies
- regulators
- municipalities
- City of Skopje
- Cadastre
- ministries
- public enterprises

## K. Language/access layer

Every user-facing workflow should support, as resources permit:
- Macedonian
- Albanian
- Romani
- English
- Serbian/Bosnian/Croatian regional access

Translation never replaces the official-language source.

## L. Coverage statuses

Every article/domain/workflow receives one:
- NOT_INGESTED
- SOURCE_CAPTURED
- ARTICLE_CHUNKED
- VERSION_VERIFIED
- WORKFLOW_MAPPED
- HUMAN_GATE_SAMPLED
- PRODUCTION_READY

No domain is called COMPLETE while any controlling current provision remains NOT_INGESTED or VERSION_UNVERIFIED.

## M. Safety boundary

Coverage includes dangerous/high-risk offence categories for lawful research, defence, victim support and procedural rights.
It must not turn offence knowledge into operational instructions for committing, concealing or evading crime.

## N. Automatic completeness rule

When a new amendment, correction, Constitutional Court effect or new statute is detected:
- affected article(s) revert from PRODUCTION_READY to VERSION_REVIEW_REQUIRED;
- current-law retrieval fails closed for those articles until re-verified;
- linked workflows are flagged for re-audit.

This rule is mandatory so AI Advokat cannot silently become stale.
