# ECHR / HUDOC Retrieval and Provenance Rules

Version: 2026-10-11
Scope: AI Advokat ECHR jurisprudence

## Authority order
1. Actual ECHR judgment/decision/advisory opinion in HUDOC.
2. HUDOC Case Details metadata attached to that document.
3. Official domestic translation/reference supplied by the North Macedonia ECHR Representation Bureau.
4. Official Macedonian judicial-portal translation/reference archive.
5. Legal summaries and official press materials for orientation only.
6. Secondary commentary.

## Mandatory binding
A Macedonian translation, domestic archive listing, legal summary, press release or country profile may help discovery, but a material legal proposition must be bound back to the actual HUDOC case document whenever possible.

## Translation rule
English and French are the Court's official languages. HUDOC may contain non-official-language translations. Unless HUDOC indicates otherwise, those translations are informational, are not produced by the Registry and are not checked by the Registry for accuracy or linguistic quality.

Therefore:
- preserve translation source and language;
- keep the authoritative-language document identifiable;
- do not silently quote a non-official translation as the Court's authoritative wording;
- do not use translation differences to create a legal proposition without checking the official text.

## Importance
HUDOC importance levels are research-significance metadata:
- Key case;
- 1 high importance;
- 2 medium importance;
- 3 low importance.

They may affect retrieval ranking, but they do not create a hierarchy of formal legal binding force.

## Analytical completeness
Key cases and levels 1 and 2 have full analytical indexing across HUDOC search fields. Level 3 cases have limited analytical information from 2007 onwards. Missing metadata in a Level-3 record must never be interpreted as proof that the issue, domestic law, international law, separate opinion or Strasbourg precedent is absent from the judgment.

## Case Details
Where available capture:
- originating body;
- document type;
- languages;
- title;
- application number;
- respondent State;
- date;
- importance;
- applicability;
- conclusions;
- Convention articles;
- Rules of Court;
- separate opinions;
- cited Strasbourg case-law;
- domestic law;
- international law / relevant material;
- keywords;
- ECLI.

## North Macedonia domestic mirrors
The Bureau for Representation of the Republic of North Macedonia before the ECHR is a high-value official domestic index/translation source for cases against North Macedonia. Its records remain subject to HUDOC binding for application number, decision/judgment date, official-language text, finality and exact holding.

The legacy odluki.sud.mk ECHR archive is useful for Macedonian-language discovery of selected cases against other States. It is not the authoritative ECHR origin and must be verified against HUDOC before the case is used for a material legal proposition.

## Context-only material
ECHR press releases, press-service pages, country profiles, statistics and hearing calendars are not judgments and must never be ranked as case-law authority.

## Chunk model
Primary ECHR retrieval unit = one case document.

Recommended canonical key:
`ECHR:<application-number>:<document-date>:<document-type>`

Translations and domestic mirrors use child provenance records linked to the canonical HUDOC case.
