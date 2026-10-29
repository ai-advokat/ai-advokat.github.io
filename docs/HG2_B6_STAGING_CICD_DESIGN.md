# AI ADVOKAT 4 — HG2-B6 Staging CI/CD Design

Status: DESIGN / REPOSITORY-ONLY
Date: 2026-10-29
Production activation: NOT AUTHORISED

## Authoritative staging resources

- Cloudflare account: `AI ADVOKAT 4 — STAGING`
- Account ID: `0fee10e2bd9a2183d16eb0d73f13dfce`
- Worker: `ai-advokat-staging`
- D1 database: `ai-advokat-staging-db`
- D1 UUID: `309f72b8-8711-47fc-bea7-fbd1d649561d`
- D1 jurisdiction: European Union
- D1 region observed in dashboard: Eastern Europe
- Read replication: disabled

Production account and production D1 are explicitly outside this package.

## Pre-HG2-C operating model

Only one staging workflow may perform executable validation before HG2-C:
`.github/workflows/paragraf-migration-staging.yml`.

It is local-only:
- no Cloudflare account ID;
- no Cloudflare API token;
- no GitHub secret consumption;
- no `--remote`;
- no Worker deployment;
- no routes or domains;
- no remote D1 writes.

All other legacy workflow files whose names contain `staging` are fail-closed and marked `[HG2-C LOCKED]`.

## Runtime staging profile

`wrangler.staging.jsonc` is intentionally fail-closed:
- `workers_dev: false`;
- `preview_urls: false`;
- exactly one D1 binding, pointing to the verified isolated staging D1;
- no `migrations_dir` in the runtime profile;
- no Workers AI binding in the first activation profile;
- `ALARM_ENABLED: false`.

Migration configuration is separated into `wrangler.preview-migrations.jsonc` and is exercised locally only.

## HG2-C prerequisites

Remote staging activation must not begin until all of the following are satisfied:

1. A credential strategy is available that does not broaden authority beyond the dedicated staging account/Worker requirement.
2. The exact account, Worker and D1 identifiers are re-verified immediately before activation.
3. The local migration chain remains green and the remote migration set is explicitly enumerated before execution.
4. The first Worker deployment keeps `workers.dev` and version/preview URLs disabled.
5. No custom domain or route is created in the first deployment package.
6. Workers AI remains outside the first activation package.
7. No production account, production D1, production Worker, production secrets or production routes are touched.
8. Rollback evidence and post-action verification steps are written before any remote write.

## Evidence gates

Required before HG2-C can be considered ready:
- `npm run test:staging-safety` — PASS
- `npm run test:staging-cicd-safety` — PASS
- local-only D1 migration dry-run — PASS
- repository full test suite — PASS
- security tests — PASS
- activation safety — PASS

## Human Gate boundary

This design prepares staging only. It does not itself authorise:
- remote D1 migration;
- Worker deployment;
- binding activation;
- route/domain activation;
- AI binding;
- production action.

Content is not command; access is not mandate.
