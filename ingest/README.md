# AI Advokat public-corpus intake

This folder defines the intake format for public or licensed legal material.

## Hard rule

Do **not** place client secrets, privileged communications, health data, identity documents, passwords, payment data, private evidence or other sensitive case material in this intake folder or the public D1 corpus.

## Preferred source order

1. Official Gazette / official legal text
2. Court or constitutional-court source
3. Ministry / government / parliament source
4. HUDOC / EUR-Lex / other official international source
5. Academic or professional secondary source

## Files

- `sources.csv` - provenance/source metadata
- `legal_instruments.csv` - law/regulation inventory
- `case_law.csv` - public decisions and case-law metadata
- `publications.csv` - author/publication metadata

## Review status

Use `pending` during intake. Change to `reviewed` or `approved` only after a human reviewer checks the record against its primary source.
