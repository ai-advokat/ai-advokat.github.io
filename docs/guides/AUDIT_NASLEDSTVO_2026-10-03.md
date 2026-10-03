# Audit / legal-source revision — Водич за наследство и оставинска постапка

Date: 2026-10-03  
Source edition: Paragraf.mk, first edition 2025  
Status: **CORRECTED CANDIDATE — AUTHOR APPROVAL / HUMAN GATE PENDING**

## Scope

The supplied 13-page DOCX/PDF pair was reviewed structurally, legally and visually. A corrected publication candidate was produced outside the repository. The source files are **not** published by this PR and are **not** ingested into AI/RAG.

Candidate fingerprints:

- DOCX SHA-256: `ccc2280b06d50b7ad7f2213c1a3f0bc4c3b016dd708e4a9ca05ef607cf4f3a86`
- PDF SHA-256: `b60c8f2407026361caff7cf5de82d3cb58f6731bc215e9e1460b0e2ba580a741`

Visual QA: the corrected DOCX/PDF renders to 15 pages; all pages were inspected for clipping, overlap, table breakage and missing glyphs.

## P1 corrections closed in the candidate

### 1. Statutory succession structure
The source version incorrectly separated siblings into a third order and grandparents into a fourth. The candidate aligns the hierarchy with the current Law on Inheritance: descendants/spouse; parents/spouse with representation through the parents' descendants; grandparents and their descendants; estate to the state if there is no heir.

### 2. Right of representation
The source said representation exists only in the first and second orders. The candidate removes that restriction and reflects the statutory operation within the third order as well.

### 3. Forced heirs
The source table treated parents as automatic forced heirs and omitted the statutory conditions for parents/siblings and descendants of children/adoptees. The candidate now records the conditions and the 1/2 vs 1/3 statutory-share distinction.

### 4. Testament forms and revocation
The candidate removes several overbroad statements:
- date is not stated as a constitutive condition for every holographic testament;
- court testament is not presented as always requiring two witnesses;
- a computer-written document is not called universally invalid — only insufficient as a holographic testament;
- oral testament is tied to exceptional circumstances rather than only danger to life;
- birth of a child is not presented as automatic revocation.

### 5. Inheritance procedure / notary role
The outdated “notary drafts / court confirms” model was replaced with the current court-commissioner framework. Unverified article/deadline claims in the professional notary table were removed.

### 6. Renunciation
“Until finality of the inheritance decision” was replaced with the statutory rule tied to conclusion of the inheritance hearing, and renunciation was distinguished from assignment in favor of a particular heir.

### 7. Liability for debts
A serious error was corrected. Liability is limited to the value of inherited property; it is not unlimited merely because no inventory was made. The creditor-separation mechanism is also flagged.

### 8. Cadastre
The source implied title is created only by registration and used a fixed fee range. The candidate distinguishes inheritance as the acquisition basis from the public-registration function and removes the unverified fixed fee.

### 9. Inheritance and gift tax
The source incorrectly treated this as a UJP-administered tax, used incorrect rates and a 30-day filing rule. The candidate reflects the Property Taxes Act:
- first order exempt;
- second order 2–3%;
- third order / unrelated 4–5%;
- local municipality / City of Skopje administration;
- tax return generally within 15 days from occurrence of the tax obligation.

### 10. International succession
The source’s “EU 650/2012 if one party is in the EU” and blanket lex rei sitae wording were removed. The candidate uses the 2020 Private International Law Act as the domestic starting point and keeps EU Regulation 650/2012 within its proper scope.

### 11. Sanctions
Automatic criminal liability, “+30% fine”, automatic nullity and similar categorical sanctions were replaced with consequence-by-statute wording. Criminal, disciplinary, civil or tax liability is stated only conditionally on the statutory elements being met.

## P2 / publication upgrades

- updated legal-source list;
- source-verification date added;
- original 2025 first-edition provenance retained;
- candidate status explicitly shown on cover and legal note;
- corporate-share and digital-asset sections made more conservative;
- institution/contact table corrected so inheritance tax points to the competent local tax administration;
- final source and verification page added.

## Controlling sources used for the correction

- Ministry of Justice — Law on Inheritance / legal database.
- Ministry of Justice — Property and Other Real Rights Act.
- Ministry of Justice — Notary Act and consolidated notary legislation.
- Ministry of Justice — Private International Law Act (Official Gazette 32/2020).
- Ministry of Finance — Property Taxes Act and inheritance/gift tax guidance.
- EUR-Lex — Regulation (EU) 650/2012, only within its field of application.

## Release gate

This audit does **not** mean:
- author approval;
- GitHub merge approval;
- public DOCX/PDF approval;
- RAG ingest approval;
- production D1/corpus-write approval.

Those remain separate Human Gates.


## Author approval recorded

On 2026-10-03, attorney Zoran Stojankich explicitly approved the upgraded inheritance guide candidate ("odlicno").

Governance effect:
- author approval: **APPROVED**
- candidate status: **author_approved_candidate**
- public DOCX/PDF release: **NOT approved by this approval alone**
- GitHub merge: **separate Human Gate**
- AI/RAG ingest: **separate Human Gate**
- production D1/corpus write: **separate Human Gate**
