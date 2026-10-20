# MK Supreme Court public-decision collector

This collector is the governed intake step before the AI Advokat case-law metadata pipeline.

## Purpose

Retrieve a bounded batch of **public decisions** from the official Supreme Court host, preserving provenance before any parsing or corpus import.

Pipeline:

```
official Supreme Court URL
  -> discovery / URL queue
  -> robots + host check
  -> bounded retrieval (50 default, 100 max)
  -> SHA-256 + manifest.ndjson
  -> Case-Law Metadata Processor
  -> privacy / source review
  -> Human Gate
  -> governed Case Law corpus
```

The collector does **not** create ECLI, does not bypass authentication, does not access private case files and does not make downloaded material production-eligible.

## 1. Discovery only

The official Supreme Court homepage is now the default discovery entry point. Its navigation contains the public **Одлуки / Пребарување одлуки / Судска пракса** surfaces, so the normal first run is:

```bash
node scripts/download-mk-supreme-decisions.mjs \
  --limit 50 \
  --dry-run
```

You may still override the starting page explicitly with `--index-url` if the portal structure changes.

The command writes `queue.json` under `work/mk-supreme-decisions/YYYY-MM-DD/`.

If the site structure changes, create a UTF-8 text file containing one verified public decision URL per line and use:

```bash
node scripts/download-mk-supreme-decisions.mjs \
  --url-file supreme-urls.txt \
  --limit 50 \
  --dry-run
```

## 2. Rights / terms gate

The current Open Legal Sources registry treats the Supreme Court as an official public source but keeps unrestricted automated bulk reuse fail-closed pending terms review.

Start from:

`data/mk-supreme-rights-review-template.json`

A human reviewer may set `approved_for_bounded_automated_retrieval=true` only after recording the current basis and scope.

## 3. Bounded retrieval

After the rights review is documented:

```bash
node scripts/download-mk-supreme-decisions.mjs \
  --url-file supreme-urls.txt \
  --limit 50 \
  --execute \
  --rights-review mk-supreme-rights-review.json
```

For a 100-document batch use `--limit 100`. The hard maximum is 100 per run.

Safeguards:

- HTTPS only;
- `vrhoven.sud.mk` / `www.vrhoven.sud.mk` only;
- robots rules checked;
- minimum delay 1500 ms, default 2500 ms;
- retry/backoff for 429/503;
- maximum file size 25 MiB;
- no login, cookies, credentials or private surfaces;
- exact SHA-256 for every retrieved file;
- duplicate content hashes are recorded;
- `production_eligible=false`;
- Human Gate remains mandatory.

## 4. Output

Each run creates:

- `queue.json` — discovery/provenance queue;
- the downloaded public documents;
- `manifest.ndjson` — one provenance record per downloaded file, including source URL, final URL, MIME type, byte size, SHA-256, retrieval time and duplicate relationship.

The manifest and documents are review inputs. They are not authoritative corpus records until the existing Case-Law Metadata Processor, official-source binding and Human Gate stages are completed.
