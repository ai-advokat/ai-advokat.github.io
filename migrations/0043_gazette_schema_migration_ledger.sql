-- Gazette schema migration ledger convergence.
-- Migrations 0038-0042 predate the repository's internal schema_migrations ledger entries.
-- Do not rewrite applied migration files; record their governed descriptions here.

INSERT OR IGNORE INTO schema_migrations(version,description) VALUES
  ('38','Add comprehensive Gazette issue-act-article archive schema'),
  ('39','Add source-grounded Gazette act purpose metadata'),
  ('40','Add Gazette Hybrid Legal Intelligence relationships and effects'),
  ('41','Add governed Gazette article chunks and ingest-run audit'),
  ('42','Add governed Gazette consolidated-text layer'),
  ('43','Backfill Gazette migration ledger entries 38 through 42');
