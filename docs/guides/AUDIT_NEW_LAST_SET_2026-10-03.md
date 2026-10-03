# AI Advokat — audit of NEW last-set guides

Date: 2026-10-03  
Author/source: attorney Zoran Stojankich / Paragraf.mk  
Status: **NEW LAST SET — LEGAL/SOURCE REVIEW IN PROGRESS**

## Inventory

Seven ZIP packages contain 10 unique guide pairs (DOCX + PDF):

1. Водич за промет со недвижности
2. Катастарски водич
3. Стручен водич АKN
4. Водич за наследство и оставинска постапка
5. Водич за административно право
6. Водич за кривично право
7. Водич за даночно право
8. Водич за граѓанска постапка
9. Водич за трговско право
10. Водич за семејно право

The inheritance guide belongs to this same new set. It already has a separately corrected legal/source candidate and remains Human-Gated.

## Batch rule

All 10 guides are treated as new authored secondary legal materials. None is promoted to:
- current-law authority;
- public downloadable master;
- production RAG;
- official legal corpus.

Each guide keeps source fingerprints and moves through the Professional Publication Standard.

## High-confidence blocking findings

### Administrative law — P1
The source list cites the 2006 Administrative Disputes Act (Official Gazette 62/2006). The active framework is the 2019 Administrative Disputes Act (96/2019), with Constitutional Court interventions including U.br.148/2024. Silence-of-administration deadlines and remedy wording must therefore be re-audited before publication.

### Civil procedure — P1
The source list cites the old Enforcement Act 35/2005 and an obsolete free-legal-aid regime. The current Enforcement Act is the 2016 act (72/2016, as amended, including 154/2023). Free legal aid is governed by the 2019 act (101/2019), amended in 2024 (194/2024). All execution and legal-aid sections need source replacement and deadline re-checking.

### Criminal law — P1
The guide refers to a legacy “juvenile justice” law. The current child-justice framework is the Law on Justice for Children, Official Gazette 66/2024, amended 55/2025. Child procedure, measures, terminology and age-linked rules must be aligned to that law.

### Real-estate transfer — P1/P2
The legal-source list uses the old Notary Act 55/2007; the current Notary Act is 72/2016, with later amendments. Property-transfer taxation must be anchored in the Property Taxes Act rather than treated as an isolated legacy tax-law title. Rates, taxpayer allocation, exemptions and filing steps require a current local-tax check.

### Professional AKN guide — P1/P2
The source list again contains the superseded Notary Act and the old Enforcement Act. Professional filing, annotation, enforcement and notarial workflow sections require article-level correction before release.

## Source-currentness findings

### Cadastre guide
The source list stops at an older amendment sequence. The Agency for Real Estate Cadastre publishes a current consolidated Real Estate Cadastre Act. The guide must be reconciled to that current consolidated text, especially registration types, annotations, prerequisites, fees and deadlines.

### Tax guide
Several core parameters are currently source-supported:
- personal income tax: 10% for most income categories;
- corporate profit tax: 10%;
- compulsory VAT registration threshold: over 2,000,000 denars;
- VAT rates include 18%, 5% and 10% categories.

However, annual personal allowance values, simplified-profit-tax thresholds, capital-gain exceptions, crypto treatment, contribution rates, deadlines, fines and filing forms are date-sensitive and need a 2026 line-by-line check.

### Commercial law guide
The guide contains many fixed numeric rules: minimum capital, payment timing, voting majorities, audit thresholds, insolvency triggers, creditor periods, rotation limits, filing deadlines and fines. These cannot be accepted from a single edition label alone. They remain article-level verification items.

### Family law guide
The source list correctly recognizes the 192/2025 amendment to the Family Act. The related domestic-violence statute was also amended in 2025 (39/2025), so references, institutional names, protective measures and procedure must be harmonised to the current text before publication.

## Inheritance guide

The inheritance guide is not an older unrelated file; it is one of these new last-set guides. Its corrected candidate has already closed major legal/source issues, including succession orders, forced heirs, wills, renunciation, debt liability, inheritance tax, international succession and sanctions.

Status now:
- author-approved candidate;
- author approval recorded on 2026-10-03;
- public release false;
- GitHub merge approval false;
- RAG eligibility false;
- production corpus-write approval false.

## Provenance

### DOCX / PDF SHA-256

- Promet-Nedviznosti: `f93088534c938b57fc62d0aad082898500b48556b6cb11a8e09f324099085dea` / `f0819dcad3aba318d12484ab538c4cddd0382084102549a1165d3ab16c2247b3`
- Katastarski-Vodic: `02540705ad7c7c76860643b21082daf63ddb61869df16273bd99039860f4cc2a` / `a01f735f51ca91c8fd75450fa88934731f21fc7250d311d681530d6690cf268d`
- Strucen-Vodic-AKN: `1ee023857b9415817f109db60f417489d477d7860de81276750a12720003016c` / `0a97bb5c6b12363b5a7f1ced1542582dad73503da191ec2458b5224799ee08d3`
- Administrativno-Pravo: `e0f8f29facddf4b63ae2ba7cd109a510f327252bf6f3bad05b8c52b1a1e2356d` / `305b5b2af6e33050a91c358073408496b218f922c7bfa7734d1b81f82bb4f481`
- Krivicno-Pravo: `cace6d28a3fa917a46b9b7e20974ddf431397f9f09c2270d1c4c9b49039d47f1` / `bb29197294c80581a39b6466c421f255a2b3a9c3e995127e12fb8e4fd61b75fc`
- Danocno-Pravo: `0dd052b4975c86a99c6c9145ec6ee53929fb259801c0a7d4739aaf0a07d8897a` / `dcf63b6bd04a24251983b0c2c00139687622b166be45291604ef4bf244f039b6`
- Gragjanska-Postapka: `7b42fd8225305f9e0be3de2c54a30d4cb08e3c1466b086f15165ff6ec06edd71` / `16aa946b028be3d47d8cb2cf9ed15d8656cdfee9fe2bd76b3b6a2ace53f9ced1`
- Trgovsko-Pravo: `49329ab1fb7cd83d5446c71910a465a2d29d1d326a3af52a457811d71d864238` / `c516dc2d019f0be93e6ad589a32337a5059cb0a0588ed655910798bc719e0955`
- Semejno-Pravo: `b0da8df1460b7f6b89174b7de82cecc17f87a02a4190489adbdc60416d122d72` / `f8a3d39070f745d0c2543f63b90a54b1296da90ee8bcef33a887de7b294ff8ca`

## Next upgrade pass

For each of the remaining nine guides:
1. replace stale/incorrect legal-source layers;
2. verify every hard deadline, amount, rate and sanction;
3. remove categorical claims not supported by the cited statute;
4. add last-verified date and official source register;
5. produce corrected DOCX/PDF candidate;
6. fingerprint the corrected pair;
7. keep author/public/RAG gates closed until Zoran approves.

