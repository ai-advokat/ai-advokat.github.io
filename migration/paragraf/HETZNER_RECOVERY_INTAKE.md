# Hetzner recovery intake for Paragraf.mk / Lex Nova / LexAI

This procedure starts only after Hetzner or another authorized custodian supplies an export, snapshot, volume, backup archive, or restored server copy.

## First rule

**Never upload the raw recovered backup to the public GitHub repository.** Keep the authoritative package in private storage and preserve it unchanged.

## Intake sequence

1. Preserve the provider-supplied original read-only.
2. Record provider ticket/reference, delivery date, archive filename, byte size and provider checksum if supplied.
3. Compute a local SHA-256 for the original archive or disk image.
4. Extract or mount only into an isolated working copy.
5. Run:

```bash
node scripts/paragraf-hetzner-backup-inventory.mjs /secure/path/to/recovered-copy /secure/path/paragraf-hetzner-inventory.json
```

6. Review the inventory before opening or parsing application data.

The inventory classifies files into:

- `database_dump` — SQL/SQLite/dump/backup candidates;
- `legal_document` — PDF/DOC/DOCX/ODT/RTF candidates;
- `structured_export` — JSON/JSONL/NDJSON/CSV/XML/XLS/XLSX;
- `archive` — nested packages to unpack offline and re-inventory;
- `application_source` — application/config source that may explain schemas and storage paths but is not legal knowledge;
- `credential_or_secret` — keys, environment files, credentials, sessions and similar material; always quarantine;
- `media` and `other` — preserve pending manual classification.

## Secret handling

Credential/session/key material is evidence for reconstruction but **must never be ingested into AI Advokat legal retrieval, committed to GitHub, pasted into chat, or copied into corpus manifests**. Keep it in a separate restricted recovery vault and rotate/revoke it after lawful access restoration.

## Routing after inventory

- Database dumps: identify engine/version and schema before import.
- Structured exports: map to the Paragraf full-export manifest and run the governed normalizer.
- Legal documents: extract text/metadata into staging, retaining original file SHA-256.
- Case-law records: run the Paragraf case-law bridge and official-source binding queue.
- App source/config: use only to understand database names, upload paths and schema semantics.
- Private client material: keep outside public/legal retrieval and route only to authenticated private storage if explicitly required.

## Completion condition

Recovery is not complete until the authoritative backup is preserved, every file is inventoried, secrets are quarantined, legal records are normalized, staging parity passes, case-law binding status is visible and Human Gate review is complete.
