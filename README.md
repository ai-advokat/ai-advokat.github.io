# AI Advokat portal — static production shell

This package is a self-contained HTML front end for the AI Advokat legal information and AI research portal.

## Run locally
Open `index.html` directly or serve the folder with any static server.

## Portrait
The HTML expects the supplied professional portrait of Adv. Zoran Stojankic at:

`assets/zoran-stojankic.png`

Save the photograph supplied in the ChatGPT conversation under that filename. If it is absent, the portal automatically shows an initials fallback instead of a broken-image icon.

## Cloudflare-ready backend hooks
The front end reserves these endpoints:

- `/api/search`
- `/api/assistant`
- `/api/documents`
- `/api/zenodo`

Recommended future stack:

- Cloudflare Pages or Workers Static Assets — front end
- Cloudflare Worker — API and authentication logic
- D1 — structured legal metadata
- R2 — PDFs and source documents
- Vectorize — semantic retrieval
- Turnstile — public forms / abuse prevention
- GitHub Actions — controlled deploy from `main`

No domain is hard-coded.

## Zenodo
`zenodoEnabled` is intentionally `false`. No DOI is fabricated. When the real Zenodo account and records exist, populate record IDs/DOIs or connect `/api/zenodo`.

## Legal integrity model
The UI deliberately separates official sources, case law, professional analysis and AI-generated research assistance. AI output should not be treated as final legal advice without human professional review.


## Contact emails
- aiadvokat16@gmail.com
- aiadvokat@outlook.com

The supplied portrait is included at `assets/zoran-stojankic.png`.
