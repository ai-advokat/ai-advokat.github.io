# International Case-Law Source Policy

Version: 2026-10-11
Scope: AI Advokat international and comparative jurisprudence

## Core rule
The originating court or tribunal is the primary authority. Aggregators, academic research guides, domestic mirrors, translations, press releases and institutional directories may support discovery, but they do not replace the originating judicial document.

## Source tiers

### Tier A — originating official court / tribunal
Examples:
- European Court of Human Rights / HUDOC
- Court of Justice of the European Union / CURIA and EUR-Lex
- International Court of Justice
- International Tribunal for the Law of the Sea
- Inter-American Court of Human Rights
- International Criminal Court

Use:
- exact judgment, decision, advisory opinion, order or other judicial document;
- official case/docket metadata;
- official language and official identifiers;
- case-specific legal propositions.

### Tier B — official institutional discovery / official mirrors
Examples:
- North Macedonia ECHR Representation Bureau;
- UN Dag Hammarskjöld Library legal research guide;
- official treaty-body and tribunal research directories.

Use:
- locating authoritative materials;
- official domestic translations and mirrors;
- status and collection discovery.

Rule:
- bind material propositions back to the originating court/tribunal document whenever possible.

### Tier C — secondary/open aggregators
Examples:
- WorldCourts;
- WorldLII;
- other public legal-information aggregators.

Use:
- discovery;
- cross-database navigation;
- identifying possible case names, citations and institutions.

Rules:
- never upgrade an aggregator record to originating-court authority;
- never bulk-copy a proprietary or terms-restricted corpus without a lawful basis;
- verify material propositions against the originating court or tribunal;
- retain aggregator provenance when it contributed to discovery.

### Tier D — academic legal-research guides
Use for:
- source-selection methodology;
- citation and research orientation;
- identifying official court repositories.

Do not ingest academic guides as case-law authority.

## Domestic-effect rule
International case-law must not be labelled as automatically binding North Macedonian domestic precedent merely because it comes from an international court.

For every material use, classify:
- court/tribunal;
- jurisdiction;
- treaty or legal basis;
- parties/respondent State where relevant;
- decision type;
- binding/persuasive/comparative role for the concrete question;
- source language and translation status;
- official origin.

## Press releases and sessions
Press releases, hearing calendars, ordinary-session announcements, country profiles and news are context only. They may trigger follow-up research but are not judicial holdings.

## Chunk model
Primary international judicial retrieval unit = one official judicial document.

Index or docket pages create discovery chunks only:
- case title;
- case/docket number if displayed;
- document type if displayed;
- date if displayed;
- originating institution;
- official listing URL;
- needs_full_text_fetch=true.

Only the fetched official judicial document may generate:
- holdings;
- reasoning propositions;
- treaty/article interpretation;
- dispositive outcome;
- separate-opinion analysis.

## Retrieval ranking
1. exact originating-court judicial document;
2. official case/docket metadata;
3. official mirror/translation;
4. official research directory;
5. secondary aggregator;
6. academic commentary.

## Fail-closed rule
If the originating document cannot be resolved, the system may return discovery metadata, but must not fabricate a holding, finality status, jurisdictional effect or authoritative quotation.
