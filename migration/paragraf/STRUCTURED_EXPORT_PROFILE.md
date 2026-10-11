# Structured export profiling

Use this step when the recovered Paragraf/Hetzner package contains JSON, JSONL, NDJSON, CSV or XML exports.

```bash
node scripts/paragraf-structured-export-profile.mjs \
  /secure/path/export.json \
  /secure/path/export-profile.json
```

The profiler is deliberately metadata-only. It reports:

- format;
- record count where safely determinable;
- field/tag names;
- candidate class: case law, primary law, document, commentary, restricted operational or other;
- whether account/auth/payment-like fields exist.

It does **not** emit record values.

This profile is used to decide the correct extractor/mapping before the full governed normalizer is run. Any file dominated by user/auth/session/payment/subscription fields stays outside the legal corpus.
