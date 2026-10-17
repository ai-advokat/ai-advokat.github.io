## Change summary

Describe what changes and why.

## Human Gate

- [ ] A human reviewer has reviewed the diff.
- [ ] The full-test-suite check is green.
- [ ] No legal source/version is promoted without the applicable Human Gate decision.
- [ ] Cost/provider routing impact has been reviewed.
- [ ] Privacy/data-flow impact has been reviewed.
- [ ] Production database/workflow impact has been reviewed.

## Production-sensitive files

If this PR changes `.github/`, `migrations/`, `scripts/*.sql`, `wrangler*.jsonc`, `src/` or privacy policy, explain the production consequence and rollback path.

## Deployment

- [ ] No direct push to production is required.
- [ ] Production environment approval is required before a production-mutating workflow.
