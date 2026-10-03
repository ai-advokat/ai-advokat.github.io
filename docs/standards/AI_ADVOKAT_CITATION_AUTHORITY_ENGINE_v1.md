# AI Advokat Citation & Authority Engine v1

**Status:** controlled internal implementation  
**Doctrine:** classify first · cite precisely · preserve provenance · never elevate AI synthesis into authority

## 1. Purpose

The Citation & Authority Engine gives every legal proposition an explicit source role before it can be displayed, indexed or used by a controlled AI workflow.

The system must distinguish between **authority**, **evidence**, **commentary** and **synthesis**.

## 2. Authority classes

### A1 — Primary binding law
Examples:
- Constitution;
- statute;
- regulation/bylaw where legally applicable;
- official gazette text;
- official consolidated legal text where provenance is known.

Machine label: `primary_binding_law`

### A2 — Judicial / adjudicative authority
Examples:
- Constitutional Court;
- Supreme Court;
- competent domestic courts;
- ECtHR / HUDOC;
- CJEU / CURIA, where relevant.

Machine label: `judicial_authority`

The engine must preserve the difference between the **holding/result**, the **court's reasoning**, and later commentary about the decision.

### A3 — Official administrative guidance
Examples:
- ministry;
- regulator;
- Public Revenue Office;
- cadastre;
- other competent public authority.

Machine label: `official_guidance`

Official guidance is not silently represented as legislation.

### A4 — Authorial legal analysis
Examples:
- signed professional guide;
- research paper;
- monograph;
- doctrinal commentary.

Machine label: `authorial_analysis`

The author must be attributable. Authorial analysis does not become binding law because it is approved or published.

### A5 — Secondary reference material
Examples:
- textbook;
- legal portal summary;
- professional article;
- non-official explanatory material.

Machine label: `secondary_reference`

Use as support or discovery aid, not as a substitute for stronger current primary authority when a primary source is available.

### A6 — AI synthesis
Machine label: `ai_synthesis`

AI synthesis is never a legal authority. It may organise, compare, summarise or explain controlled sources, but must remain visibly distinguishable from them.

## 3. Claim contract

Every consequential legal claim should be representable as:

`claim -> authority_class -> source_identity -> version/date -> locator -> verification_state -> provenance`

Where available, the locator should identify an article, paragraph, decision number, section or other precise anchor.

A bare URL is not sufficient provenance for a high-risk current-law claim.

## 4. Current-law rule

A current-law statement should prefer A1/A2/A3 evidence over A4/A5.

If the strongest available evidence is A4/A5, the system should present the proposition as commentary/analysis and avoid claiming verified current law unless the underlying primary source has separately been verified.

## 5. Conflict rule

When sources conflict:

1. preserve both source identities;
2. record the conflict;
3. prefer stronger legal authority only where the hierarchy actually resolves the issue;
4. do not fabricate reconciliation;
5. require Human Gate escalation where the conflict is material.

## 6. Citation rendering contract

Future AI Advokat answers should be able to render citations with a source-role label, for example:

- **[Закон]** Article/section citation;
- **[Суд]** decision and relevant paragraph/holding;
- **[Службено упатство]** issuing authority and date;
- **[Авторска анализа]** author, title and version;
- **[AI синтеза]** never shown as a citation to itself.

AI-generated prose may cite the underlying evidence but may not cite the AI as the evidence for the legal proposition.

## 7. Fail-closed safety rules

The engine must reject or downgrade a claim when:

- authority class is missing;
- source identity is missing;
- a current-law claim relies only on `ai_synthesis`;
- an A4/A5 source is mislabelled as binding law;
- a historical or superseded source is presented as current without explicit qualification;
- a citation locator is invented;
- verification state is missing for a high-risk current-law claim.

## 8. Human Gate

The Citation & Authority Engine classifies and constrains evidence use. It does not itself grant:

- author approval;
- public release;
- RAG eligibility;
- GitHub merge;
- production corpus write.

Those remain separate Human Gates.

## 9. Design doctrine

AI Advokat should not merely answer “what does the law say?”

It should be able to show **which kind of authority is speaking, which version was checked, where the proposition is anchored, and where human responsibility begins**.
