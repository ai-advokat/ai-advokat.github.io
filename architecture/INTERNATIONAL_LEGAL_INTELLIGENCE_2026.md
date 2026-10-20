# International Legal Intelligence Layer

Version: 2026-10-20

## Purpose

This layer connects AI Advokat's domestic-law and case-law pipelines with official international sources while preserving authority, procedure, provenance, privacy and Human Gate boundaries.

It covers:
- ECHR / HUDOC plus the North Macedonia ECHR Representation Bureau;
- ICSID Convention, Additional Facility, Mediation and Fact-Finding;
- OHCHR Universal Human Rights Index and Treaty Body source material;
- supplied Supreme Court bulletins, case-discovery registers and secondary human-rights monitoring reports as governed document subtypes.

## Non-negotiable rules

1. Originating official source first.
2. Discovery metadata never becomes a holding automatically.
3. Event status is distinct from document type and legal effect.
4. A translation or mirror never silently replaces the originating text.
5. A recommendation is not a judgment.
6. A headnote, sentence or bulletin excerpt is not a full judgment.
7. Sensitive monitoring reports never become person-search databases.
8. Every production-facing material proposition remains behind Human Gate.

## ECHR

HUDOC remains the originating case-law source. The Bureau is a high-value official domestic discovery and translation layer. Existing Bureau intake keeps domestic translations pending HUDOC binding and Human Gate.

Regression cases include:
- D.H. and Others v. North Macedonia;
- Vasilkoski and Others v. Republic of Macedonia;
- Mitrov v. Macedonia;
- Taleski and Others v. North Macedonia.

The regression contract preserves:
- judgment versus decision;
- violation versus non-violation;
- no-separate-examination;
- inadmissibility and non-exhaustion;
- anonymisation;
- translation provenance;
- duplicate artifacts.

## ICSID

The live recent-case pages are treated as an event feed:
- registered;
- tribunal constituted;
- document published;
- concluded.

A published document is separately classified. For example, an Award and a Dissenting Opinion are distinct document objects even when surfaced together.

### Regimes

#### ICSID Convention
Convention arbitration awards may engage Articles 53-55, including Article 54 recognition and enforcement.

#### Additional Facility
The ICSID Convention does not apply to the conduct of Additional Facility proceedings. The system must never assign Article 54 Convention enforcement to an Additional Facility award.

#### Mediation
The mediator assists settlement and cannot impose a resolution. Mediation information is confidential by default under the 2022 Rules, subject to the stated exceptions.

#### Fact-Finding
The Committee establishes facts and issues a report. The report is non-binding by default unless the parties agree otherwise. Confidentiality is preserved.

## OHCHR / UHRI

The official UHRI full JSON export is the structured intake origin. It is filtered to North Macedonia using canonical state identity plus preserved historical labels.

Mechanism types remain explicit:
- Treaty Bodies;
- Special Procedures;
- Universal Periodic Review.

The intake stages official records as recommendations or observations. It never transforms them into domestic judgments, binding case law or current domestic legislation. UHRI's own completeness caveat is preserved.

## Domestic discovery and contextual materials

### Civil/commercial case discovery register
Route: review-only discovery register. Malformed case identifiers are preserved verbatim and flagged; the system never silently repairs them.

### Supreme Court bulletin
Route: review-only official case-law publication. Child objects may include legal opinions, conclusions, headnotes/sentences, significant-decision excerpts and reasonable-time materials. A bulletin excerpt is never represented as the complete originating judgment.

### Human-rights monitoring report
Route: review-only secondary non-binding context with elevated privacy risk. Sensitive family, minor, violence, health or sexual-orientation narratives must not be converted into person-search records.

## Supplied Macedonian laws

The supplied ZKP and unofficial consolidated Criminal Code remain regression evidence for the legal-instrument lane. They do not prove current-law status in 2026 by themselves. The Criminal Code fixture expressly preserves its unofficial-consolidated status, lettered articles and Constitutional Court/amendment-lineage review requirements.

## Automation

- ICSID recent-event discovery: daily, artifact only.
- UHRI North Macedonia snapshot: weekly, artifact only.
- ECHR Bureau full-text discovery: existing weekly governed intake.

None of these scheduled jobs promotes records to production authority. Production corpus promotion, binding-source verification and professional reliance remain separate governed steps.
