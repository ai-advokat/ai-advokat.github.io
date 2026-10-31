# Апелационен суд Штип — Case-Law Citation Corpus v2

Governed release metadata for the citation-grade corpus built from six user-supplied official court bulletins.

- Corpus records: **388**
- State: `RELEASE_CANDIDATE_HUMAN_GATE`
- Production eligible: **NO**
- Official original-decision binding: **pending**
- Release pack name: `AS_STIP_CASE_LAW_CITATION_CORPUS_V2_RC1.zip`
- Release pack SHA-256: `e04b21459e53a9c7fac3fc3b93b81849bf3805bdcb98541875e0c4b4286ee043`

The full release pack is a controlled Human Gate handoff artifact and is intentionally not treated as production case law merely because it has been extracted. This repository directory stores the release manifest, QC summary, priority Human Gate queue, duplicate/provenance report and Supreme binding queue.

Validation:

```bash
node scripts/validate-as-stip-case-law-release-metadata.mjs data/case-law/as-stip-bulletins-v2
node --test test/as-stip-case-law-corpus.test.mjs
```

Full-pack validation, when the controlled ZIP is available locally:

```bash
unzip -q AS_STIP_CASE_LAW_CITATION_CORPUS_V2_RC1.zip -d work/as-stip-case-law-v2
node scripts/validate-as-stip-case-law-corpus.mjs work/as-stip-case-law-v2
```

Do not promote a record into `governedCaseLawContext()` until the existing official-binding + dual Human Gate requirements are satisfied.
