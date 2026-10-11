# ENER consolidated-text snapshots

Version: 1.0
Date: 2026-10-11
Scope: public ENER "Пречистени текстови" / consolidated-text documents.

## Source role

ENER has two legally different lanes in AI Advokat:

1. **Proposal / consultation history** — proposed regulations, consultation windows, RIA/PVR materials, comments, opinions and initiatives. These are not current law.
2. **Consolidated-text snapshots** — public documents listed under ENER "Пречистени текстови". These may contain complete laws divided into articles and often identify Official Gazette issue lineage.

A consolidated text hosted on ENER is useful legal research material, but it is **not automatically treated as the currently applicable law**.

Reasons include:
- the ENER listing date may be historical;
- some ENER entries explicitly say "неофицијална верзија";
- later amendments, Constitutional Court effects or replacement statutes may exist;
- current-law status must be bound to the Official Gazette / LDBIS version chain.

## Chunking rule

For a consolidated-text snapshot:

- one ENER document = one source snapshot;
- one legal article = one retrieval chunk;
- paragraph/item segmentation is retained below the article;
- two different articles are never merged into the same retrieval chunk;
- the original PDF SHA-256 is inherited by all chunks from that snapshot;
- ENER listing date is stored separately from legal effective date;
- explicit labels such as "неофицијална верзија" are preserved.

Use the existing Macedonian legal parser:

```bash
node scripts/ener-consolidated-meta.mjs intake.json /tmp/ener-meta.json
node scripts/parse-mk-legal-text.mjs extracted.txt /tmp/ener-meta.json /tmp/ener-articles.ndjson
node scripts/legal-ndjson-to-sql.mjs /tmp/ener-articles.ndjson /tmp/ener-articles.sql
```

The preparer forces:

- `status=needs_version_review`;
- `human_review_status=pending`;
- an ENER source URL;
- a valid source SHA-256;
- no claim that the snapshot is the current consolidated law.

## Verification path

Before an ENER article becomes current-law authority:

1. identify the base act and all Official Gazette issues named by the snapshot;
2. check later Official Gazette amendments;
3. check relevant Constitutional Court effects;
4. compare with LDBIS/current official sources;
5. record the verified version window;
6. Human Gate review;
7. only then may the applicable version be promoted.

## Explicit unofficial versions

If ENER calls a record an "неофицијална верзија", store:

`ener_officialness = explicit_unofficial_version`

That label must remain visible in provenance and must never be silently upgraded.

## Retrieval order

For a current-law question:

1. verified current Official Gazette/LDBIS article;
2. verified current ministry/official text where appropriate;
3. ENER consolidated snapshot;
4. ENER proposal/consultation history;
5. secondary commentary.

ENER snapshots are highly useful for historical reconstruction and article-level discovery, but a later official source overrides them.
