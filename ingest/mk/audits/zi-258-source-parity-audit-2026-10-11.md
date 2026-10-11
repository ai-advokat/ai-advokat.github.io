# ZI 258-article official-source parity audit

Date: 2026-10-11
Run: 38170893630
Status: **MACHINE PARITY PASS / HUMAN GATE STILL BLOCKED**

## Exact official source

- Ministry-hosted editorial consolidated PDF: `zakoni-izvrsuvanje-file-zhwP.pdf`
- Pages: 99
- PDF SHA-256: `15d8b0961d1beb1b5bc7de8f43d4b6ff4c1d79cdc46b241e829530039eefaa55`

The audit downloaded the official PDF again, verified the PDF signature, exact 99-page count and exact SHA-256, then re-extracted and re-parsed it from zero.

## Machine parity result

The source produced exactly **258 article records**.

Full article-by-article comparison then checked:
- article number;
- normalized article number;
- article heading;
- complete article body;
- source URL;
- source SHA-256;
- bound version label/class;
- current flag;
- article and version Human Gate status.

Results:

- **Production: 258/258 exact parity — PASS**
- **Staging: 258/258 exact parity — PASS**
- **Production vs staging digest — PASS**
- Canonical article-corpus digest:
  `56a69c8c0d278f237984ad7d0e4271f12e48ee54f5ffd8fdd0f804826b361609`
- Database writes performed: **none**

This proves that the stored production/staging ZI article sets faithfully match the governed extraction from the exact official PDF used by the corpus.

## Why current-law promotion remains blocked

Parser v0.3 reports **28 review findings** on that exact source/hash:

- 11 `mixed_script_token` findings;
- 2 `editorial_note_contamination` findings;
- 15 `unexplained_gap` findings.

The findings do not represent D1 parity failures. They are source/extraction interpretation issues that require Human Gate review.

### Mixed-script tokens

Articles:
4, 29, 33, 68, 73, 74, 86, 110, 163, 245, 261.

No automatic character substitution is permitted.

### Editorial-note candidates

- Article 104 — "Забелешка наместо попис"
- Article 269 — editorial amendment note beginning "*Членот 269 е изменет..."

No note is removed automatically.

### Missing numeric article slots

95, 240–244, 247, 248, 250, 252, 256–260.

No missing article is synthesized. Human review must confirm whether each number is deleted/abolished/not present in the governing consolidated text.

## Legal-status overlays

The separate Article 218 / U.br.86/2025 pending Constitutional Court review warning remains mandatory. Text parity does not resolve that pending proceeding.

## Gate decision

The following machine evidence is now strong:
- official source fingerprint: verified;
- article count: verified;
- production article-body parity: verified;
- staging article-body parity: verified;
- production/staging corpus digest parity: verified.

The following remain **false**:
- `current_version_verified`
- `human_gate_approved`

No `is_current`, `current_consolidated`, article text or Human Gate field is changed by this audit.
