# Public architecture overview

```
Browser ── static pages (GitHub Pages: ai-advokat.github.io, or the Worker's static assets)
   │         index.html · membership.html · scholar/* · policy pages
   │
   └── fetch ──► Cloudflare Worker (ai-advokat-github-io.aiadvokat16.workers.dev)
                    /api/health · /api/db-status · /api/capabilities
                    /api/search · /api/instruments · /api/articles · /api/assistant
                    /api/web-sources · /api/zenodo · /api/orcid · /api/membership/*
                         │
                         └── Cloudflare D1 (legal registry, article-level corpus,
                             instrument versions, publications, membership)
```

**Static front end.** Plain HTML, CSS and inline JavaScript, with no build step. The same files are served by GitHub Pages and by the Worker's static assets (`run_worker_first`, which adds security headers). The front end calls the production Worker from GitHub Pages and the same origin on `*.workers.dev`.

**Capability-driven labels.** Card and mode labels (LIVE, DIRECTORY, PREVIEW, LOCKED) come from `/api/capabilities` and are never hard-coded as live. If the endpoint fails, the UI shows “status unknown”.

**One answer, one version.** `/api/assistant` answers only from one resolved instrument version. When the version cannot be resolved safely, the API returns a controlled refusal (HTTP 400/404/409), and the UI shows the reason and the next safe step. No answer text is shown.

**Disabled in this release:** R2 and Vectorize. Workers AI in production is a separate Human Gate, cost and security decision. Without it the assistant runs in *retrieval-only* mode, and the UI labels that mode explicitly.

**Ownership.** The legal corpus, retrieval, version resolution, security and quota logic belong to the corpus/AI-engine workstream (`src/`, `scripts/`, `migrations/`). The public layer consumes their API contracts and must not reinterpret them.
