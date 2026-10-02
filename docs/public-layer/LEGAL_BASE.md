# Legal Base (Правна база): public layer

The Legal Base section of the homepage presents the governed layers of the portal. It is **presentation only**: every status shown comes from the Worker API. Front-end code never infers legal status. The helpers live in `assets/legal-base.js` and are tested in `test/legal-base.test.mjs`.

## Source-first ladder

| Layer | What it is | Where it comes from |
|---|---|---|
| 1 · Official source | Official Gazette, courts, HUDOC, EUR-Lex. Always controls. | `/api/web-sources` (mirrors `PUBLIC_WEB_SOURCES`) |
| 2 · Article and version | Article-level text bound to one version | `/api/instruments`, `/api/articles` |
| 3 · Case law | Court decisions; currently a directory only | `/api/capabilities` → `caseLawCorpus` |
| 4 · Professional analysis | Author papers with DOIs | Publications section, `/api/zenodo` |
| 5 · AI synthesis | Research assistance over cited articles | `/api/assistant` |

Every Legal Base panel, the publications section and the AI Researcher carry a layer label. This way the reader always knows which layer they are reading.

## Card states

A card is shown as **active** only when `/api/capabilities` returns one of the exact values `live`, `live_read_only` or `live_corpus`. Any other value, including an unknown, misspelled or missing value or a failed request, keeps the card inactive.

| Card | Shown state today | Becomes active when |
|---|---|---|
| Laws and Regulations | LIVE · n laws with text | `articleCorpus` is live and at least one law has text |
| Case Law | DIRECTORY | `caseLawCorpus` is `live_corpus` |
| ECHR and International | DIRECTORY | `echrCorpus` is `live_corpus` |
| Versions and Amendments | PREVIEW · GOVERNED | `versionCompare` is `live` |
| Citation Audit | PREVIEW · GOVERNED | `citationAudit` is `live` |
| Documents and Case Files | LOCKED · IN PREPARATION | `documentUpload` **and** `caseWorkspace` are both `live` |

States carry a text label and a symbol, so meaning never depends on colour alone.

## Panels

- **Laws and Regulations.**
  - The registry is split into laws *with article-level text* and laws with *official metadata only*.
  - Each law lists its layers: official metadata, linked official source, article-level text with count, and Human Gate state.
  - The status glossary explains: historical snapshot, version review, and current·verified. Current·verified appears only when the backend says `current_verified`.
  - The article browser shows the version table and accepts a date.
  - A version refusal (409) lists the loaded versions; previously it appeared as “API unavailable”.
- **Case Law.**
  - Lists the courts' official databases.
  - The court / legal issue / date / outcome filters are **disabled** while `caseLawCorpus` is not live.
  - When it becomes live, keyword search through `/api/search?type=case` is enabled. Court, date and outcome stay disabled until the API supports them.
  - No case is ever shown from front-end code.
- **ECHR and International.**
  - HUDOC and EUR-Lex cards each state jurisdiction, source type and that they are “not indexed”.
  - They are explicitly *not* presented as Macedonian legislation.
- **Versions and Amendments.**
  - Choose a law and an article. With one resolvable version, the panel says there is nothing to compare.
  - When the API answers 409 with several versions, you choose two. Each is fetched by its own start date (`application_from` or `valid_from`) and shown with: version, version class, `valid_from`, `application_from`, `valid_to` (exclusive), source issue/date, Human Gate and status category.
  - The word-level diff uses text markers `[− …]` and `[+ …]` and is labelled “not a legal assessment”.
- **Citation Audit (PREVIEW).**
  - Input types: article (`/api/articles`), DOI (the portal's own `/api/zenodo` registry; doi.org is never contacted), official-source URL (checked against the directory) and court decision (unavailable while case law is not indexed).
  - The system reports only `UNRESOLVED` (source found; a human must compare it) or `SOURCE UNAVAILABLE`.
  - `SUPPORTED` and `UNSUPPORTED` exist only as the user's own verdict. It is labelled as such and is not stored or sent.
  - The citation is never rewritten.
- **Documents and Case Files.** LOCKED. The panel explains what future workspaces may include (timelines, evidence matrices, notes, Human Gate review) and contains no input, upload or storage.

## Status vocabulary (versions)

| Category | Condition (backend fields only) |
|---|---|
| CURRENT · APPROVED (Human Gate) | `isCurrent` **and** `humanReviewStatus = approved` |
| REFERENCE CONSOLIDATION · PENDING REVIEW | `class = reference_consolidation` (not approved current) |
| VERSION WITH END DATE · NOT CONFIRMED AS CURRENT | `validTo` present |
| PENDING REVIEW · NOT CONFIRMED AS CURRENT | otherwise |
| REJECTED | `humanReviewStatus = rejected` |
| NO VERSION METADATA (legacy) | `legacyUnversioned` |

## What this layer must never do

- show a PREVIEW or LOCKED card as active;
- label a version or article current without the backend saying so;
- fabricate cases or citations;
- “fix” a citation;
- accept, upload or store documents;
- present ECHR or EU sources as Macedonian law.
