# Publication governance (public layer)

**Status facts are not edited by the UI layer.** The current state is:

| Work | Status | DOI |
|---|---|---|
| “CHAIN” / „СИНЏИР“ | Published · Working paper · v1.0 | 10.5281/zenodo.22981744 |
| Electronic and AI-Generated Evidence | Published · Working paper · v1.0 | 10.5281/zenodo.23017531 |
| Searching a Mobile Phone and Legal Professional Privilege | Published · Working paper · v1.0 | 10.5281/zenodo.23021388 |
| AI in the Legal Profession and the Judiciary | Published · Working paper · v1.0 | 10.5281/zenodo.23023442 |
| Kočani – “Puls” | **Draft** (journal article in preparation) | reserved, **not shown** |

**Rules enforced by tests** (`test/security.test.mjs` R6/R7 and `test/public-layer.test.mjs`):

- Only published works get a DOI link, a Scholar page, a citation and structured data (`ScholarlyArticle`).
- The reserved Kočani DOI never appears on the homepage or on Scholar pages.
- Scholar pages keep `citation_*` meta tags and JSON-LD consistent: same DOI, title and date.

**To publish a draft later (human decision):**

1. Publish on Zenodo.
2. Update `ZENODO_RECORDS` in `src/index.js`.
3. Update `ingest/publications.csv`.
4. Update the homepage data and add a Scholar page and sitemap entries.
5. Add the DOI to the expected list in the tests.

The UI must never be updated first.
