# SQL dump discovery

After the recovered Hetzner package has been inventoried, use this step for plain-text `.sql` database dumps.

```bash
node scripts/paragraf-sql-schema-discovery.mjs \
  /secure/path/dump.sql \
  /secure/path/schema-report.json
```

The report emits **schema metadata only**:

- database vendor guess;
- table names;
- column names/types from `CREATE TABLE`;
- count of `INSERT INTO` statements per table;
- legal-schema candidates;
- restricted operational tables.

It does **not** emit inserted row values.

Default routing:

- case/judgment/decision/presuda/odluka/court-like tables -> `case_law`;
- law/statute/regulation/zakon/article-like tables -> `primary_law`;
- document/upload/template/file-like tables -> `document`;
- commentary/analysis-like tables -> `commentary`;
- user/account/auth/login/token/session/billing/payment/subscription-like tables -> `restricted_operational`, excluded from legal corpus;
- everything else -> manual schema review.

The table-name classifier is only an intake heuristic. Human review of the actual schema is required before extraction or import.
