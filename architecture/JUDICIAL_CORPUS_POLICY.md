# Judicial Corpus Ingestion Policy — North Macedonia

Version: 2026-09-29
Mode: public-source only, source-first, Human Gate

## Goal
Ingest all lawfully and publicly accessible judicial material that improves legal research without mixing private e-delivery or user-specific court records into the public corpus.

## Authority corpus
May feed Case Law Engine after provenance checks:
- court decisions
- judgments
- rulings
- Supreme Court legal opinions / principled positions
- Constitutional Court decisions and rulings
- official bulletins and collections when they reproduce or analyse identifiable decisions

## Professional reference
Useful but not independently binding:
- professional papers and presentations
- court publications
- training/educational materials

## Procedural resources
Useful for workflows, not case-law authority:
- forms/templates
- court rules
- public instructions

## Context-only
Never rank as a judgment:
- press releases
- news
- hearing calendars
- statistics
- annual/monthly/quarterly reports
- public notices

A press release saying that detention was ordered is NOT the detention decision itself.

## Basic Criminal Court Skopje
Public surface includes:
- Decisions
- Trial calendar
- Reports and statistics
- Forms
- Publications
- Professional works/presentations
- Bulletins
- Collections
- Public announcements/news

Each category is routed separately.

Examples:
- detention announcement -> context
- plea-agreement announcement -> context
- actual ruling/judgment -> primary_case_law
- bulletin with reasoned legal holding -> professional_reference or strong_authority after Human Gate

## Court hierarchy
Registry categories:
- Basic courts
- Appellate courts
- Administrative Court
- Higher Administrative Court
- Supreme Court
- Constitutional Court

Known appellate seats:
- Bitola
- Gostivar
- Skopje
- Shtip

The ingestion engine must discover and verify all individual Basic Court portal entries before claiming full national coverage.

## Required fields per judicial decision
- originating court
- chamber/department where available
- case number
- decision type
- decision date
- publication date
- finality where known
- legal area
- cited statutory/Convention articles
- holding/proposition
- outcome
- source URL
- source locator
- source hash if document is downloaded
- language
- human review status

## Privacy boundary
Exclude:
- e-Delivery
- authenticated case files
- private pleadings
- non-public personal data
- user-specific court account information
